import { splitLocation } from '../src/lib/location.ts'
/**
 * Seeds demo data into the Supabase project: companies, jobs, demo users (with profiles,
 * experiences and PDF resumes) and applications with realistic status timelines.
 *
 * Repeatable for this demo dataset. Seeded profiles/jobs are refreshed; existing
 * applications are left alone.
 *
 * Usage: pnpm db:seed   (needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)
 */
import { createHash } from 'node:crypto'

import { createClient, type User } from '@supabase/supabase-js'

import type { Database } from '../src/types/database.ts'
import { buildBulkData } from './seed/bulk.ts'
import { describeJob } from './seed/jobs.ts'
import {
  DEMO_PASSWORD,
  DEMO_RECRUITER,
  DEMO_SEEKER,
  type SeedSeeker,
} from './seed/people.ts'
import { resumePdf } from './seed/resume-pdf.ts'

const { companies: COMPANIES, recruiters: RECRUITERS, seekers: SEEKERS, jobs: JOBS, applications: APPLICATIONS } = buildBulkData()
if (process.argv.includes('--dry-run')) {
  console.log(JSON.stringify({ companies: COMPANIES.length, jobs: JOBS.length, seekers: SEEKERS.length,
    recruiters: RECRUITERS.length, applications: APPLICATIONS.length,
    experiences: SEEKERS.reduce((count, seeker) => count + seeker.experiences.length, 0),
    timelineEvents: APPLICATIONS.reduce((count, app) => count + 1 + app.path.length, 0),
    note: 'Dry run only: no connection, uploads, or database writes.' }, null, 2))
  process.exit(0)
}

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY). See .env.example.')
  process.exit(1)
}

const db = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DAY = 24 * 60 * 60 * 1000
const daysAgo = (days: number) => new Date(Date.now() - days * DAY)

/** Deterministic UUID from a string key, so re-runs upsert the same rows. */
function stableId(key: string): string {
  const h = createHash('sha1').update(`jobboard:${key}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

function check<T>(result: { data: T; error: unknown }, what: string): T {
  if (result.error) {
    console.error(`✗ ${what}`, result.error)
    process.exit(1)
  }
  return result.data
}

/** Like `check`, but also fails when no data came back. */
function required<T>(result: { data: T; error: unknown }, what: string): NonNullable<T> {
  const data = check(result, what)
  if (data == null) {
    console.error(`✗ ${what}: no data returned`)
    process.exit(1)
  }
  return data
}

async function existingUsers(): Promise<Map<string, User>> {
  const users = new Map<string, User>()
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    data.users.forEach((u) => u.email && users.set(u.email, u))
    if (data.users.length < 1000) return users
  }
}

async function ensureUser(
  users: Map<string, User>,
  email: string,
  metadata: Record<string, string>,
): Promise<string> {
  const existing = users.get(email)
  if (existing) return existing.id
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: metadata, // read by the handle_new_user trigger
  })
  if (error) throw error
  users.set(email, data.user)
  return data.user.id
}

async function seedSeeker(userId: string, seeker: SeedSeeker) {
  const path = `${userId}/resume-testing.pdf`
  const upload = await db.storage.from('resumes').upload(path, resumePdf(seeker), {
    contentType: 'application/pdf',
    upsert: true,
  })
  check(upload, `upload resume for ${seeker.email}`)

  check(
    await db
      .from('seeker_profiles')
      .update({
        headline: seeker.headline,
        location: seeker.location,
        city: splitLocation(seeker.location).city || null,
        state: splitLocation(seeker.location).state || null,
        bio: seeker.bio,
        skills: seeker.skills,
        resume_path: path,
        resume_filename: `${seeker.fullName.replace(/\s+/g, '_')}_Testing_Resume.pdf`,
        pref_locations: seeker.prefs.locations,
        pref_remote: seeker.prefs.remote,
        pref_min_pay: seeker.prefs.minPay,
        pref_experience_level: seeker.prefs.level,
        pref_employment_types: seeker.prefs.types,
      })
      .eq('user_id', userId),
    `seeker profile for ${seeker.email}`,
  )

  check(
    await db.from('experiences').upsert(
      seeker.experiences.map((e) => ({
        id: stableId(`experience:${seeker.email}:${e.company}:${e.title}:${e.start}`),
        user_id: userId,
        title: e.title,
        company: e.company,
        location: e.location ?? null,
        start_date: e.start,
        end_date: e.end ?? null,
        description: e.description,
      })),
    ),
    `experiences for ${seeker.email}`,
  )
}

async function inBatches<T>(items: T[], size: number, run: (item: T) => Promise<void>) {
  for (let offset = 0; offset < items.length; offset += size) {
    await Promise.all(items.slice(offset, offset + size).map(run))
  }
}

async function main() {
  console.log(`Seeding ${url} with synthetic testing data`)
  // Fail before inserting anything when a Round 4 migration or secret key is missing.
  check(await db.from('jobs').select('id,city,state,min_yoe,max_yoe,questions').limit(1), 'Round 4 schema check')
  check(await db.from('applications').select('id,answers').limit(1), 'application schema check')

  // Companies
  const companies = required(
    await db
      .from('companies')
      .upsert(
        COMPANIES.map((c) => ({ id: stableId(`company:${c.slug}`), ...c })),
        { onConflict: 'slug' },
      )
      .select('id, slug, name'),
    'companies',
  )
  const companyBySlug = new Map(companies.map((c) => [c.slug, c]))
  console.log(`✓ ${companies.length} companies`)

  // Users
  const users = await existingUsers()
  const recruiterByCompany = new Map<string, string>()
  for (const recruiter of RECRUITERS) {
    const company = companyBySlug.get(recruiter.company)!
    const id = await ensureUser(users, recruiter.email, {
      role: 'recruiter', full_name: recruiter.fullName, company_name: company.name,
    })
    check(await db.from('recruiters').update({ title: recruiter.title }).eq('user_id', id), 'recruiter title')
    recruiterByCompany.set(recruiter.company, id)
  }
  const seekerIds = new Map<string, string>()
  await inBatches(SEEKERS, 4, async (seeker) => {
    const id = await ensureUser(users, seeker.email, { role: 'seeker', full_name: seeker.fullName })
    seekerIds.set(seeker.email, id)
    await seedSeeker(id, seeker)
  })
  console.log(`✓ ${recruiterByCompany.size} recruiters, ${seekerIds.size} seekers (with resumes and experience)`)

  // Jobs. Insert as open first so seeded applications to now-closed roles are accepted.
  const jobRows = JOBS.map((job) => {
    const company = companyBySlug.get(job.company)!
    const created = daysAgo(job.daysAgo).toISOString()
    return {
      id: stableId(`job:${job.key}`),
      company_id: company.id,
      recruiter_id: recruiterByCompany.get(job.company)!,
      title: job.title,
      description: describeJob(job, company.name),
      location: job.location,
      city: splitLocation(job.location).city || null,
      state: splitLocation(job.location).state || null,
      min_yoe: ({ intern: 0, entry: 0, mid: 2, senior: 5, lead: 8 })[job.level],
      max_yoe: ({ intern: 1, entry: 2, mid: 5, senior: 10, lead: 20 })[job.level],
      is_remote: job.remote ?? false,
      pay_min: job.pay[0],
      pay_max: job.pay[1],
      pay_period: job.period ?? 'year',
      experience_level: job.level,
      employment_type: job.type ?? 'full_time',
      skills: job.skills,
      questions: job.company === DEMO_RECRUITER.company || JOBS.indexOf(job) % 5 !== 0 ? [
        { id: stableId(`question:${job.key}:why`), prompt: 'Why are you interested in this role?', required: true },
        { id: stableId(`question:${job.key}:project`), prompt: 'Describe a project or experience relevant to this role.', required: true },
        { id: stableId(`question:${job.key}:extra`), prompt: 'Anything else you would like us to know?', required: false },
      ] : [],
      status: 'open' as const,
      created_at: created,
      updated_at: created,
    }
  })
  check(await db.from('jobs').upsert(jobRows, { onConflict: 'id' }), 'jobs')
  console.log(`✓ ${jobRows.length} jobs`)

  // Query existing pairs in pages, then insert only missing applications.
  const existingPairs = new Set<string>()
  for (let offset = 0; ; offset += 1000) {
    const rows = required(await db.from('applications').select('job_id,seeker_id').in('job_id', jobRows.map((job) => job.id))
      .order('id').range(offset, offset + 999), 'existing applications')
    rows.forEach((row) => existingPairs.add(`${row.job_id}|${row.seeker_id}`))
    if (rows.length < 1000) break
  }
  const jobsById = new Map(jobRows.map((job) => [job.id, job]))
  const peopleByEmail = new Map(SEEKERS.map((seeker) => [seeker.email, seeker]))
  const pending = APPLICATIONS.filter((app) => !existingPairs.has(`${stableId(`job:${app.job}`)}|${seekerIds.get(app.seeker)}`))
  let created = 0
  for (let offset = 0; offset < pending.length; offset += 100) {
    const fixtures = pending.slice(offset, offset + 100).map((app) => {
      const jobId = stableId(`job:${app.job}`), seekerId = seekerIds.get(app.seeker)!, person = peopleByEmail.get(app.seeker)!, job = jobsById.get(jobId)!
      const start = daysAgo(app.daysAgo)
      const statuses = ['applied' as const, ...app.path]
      const step = (Date.now() - start.getTime()) / (statuses.length + 0.5)
      const times = statuses.map((_, i) => new Date(start.getTime() + i * step).toISOString())
      const id = stableId(`application:${app.seeker}:${app.job}`)
      const answers = job.questions.map((question, index) => ({ ...question,
        answer: index === 0 ? `Fictional testing response. I am interested in ${job.title} because it fits my experience with ${person.skills.slice(0, 2).join(' and ')} and my interest in collaborative teams.`
          : index === 1 ? `Fictional testing response. In my work as ${person.experiences[0]?.title ?? 'a student'}, I helped deliver projects using ${person.skills[0]} and documented what the team learned.`
          : APPLICATIONS.indexOf(app) % 2 === 0 ? 'Fictional testing response. I would be happy to discuss the role and share more about my background.' : '',
      }))
      return { row: { id, job_id: jobId, seeker_id: seekerId, status: statuses.at(-1)!,
        cover_note: app.coverNote ?? null, answers, created_at: times[0]!, updated_at: times.at(-1)! },
        events: statuses.map((status, i) => ({ application_id: id, from_status: i === 0 ? null : statuses[i - 1]!,
          to_status: status, changed_by: i === 0 || status === 'withdrawn' ? seekerId : job.recruiter_id,
          created_at: times[i]! })),
      }
    })
    const inserted = required(await db.from('applications').upsert(fixtures.map((fixture) => fixture.row),
      { onConflict: 'job_id,seeker_id', ignoreDuplicates: true }).select('id'), 'insert applications')
    const newIds = new Set(inserted.map((row) => row.id))
    if (newIds.size) {
      // Replace only newly-created fixtures' auto-events with their historical timelines.
      check(await db.from('application_events').delete().in('application_id', [...newIds]), 'replace new demo events')
      check(await db.from('application_events').insert(fixtures.filter((fixture) => newIds.has(fixture.row.id)).flatMap((fixture) => fixture.events)), 'application histories')
    }
    created += newIds.size
    console.log(`✓ ${created}/${pending.length} new applications`)
  }
  console.log(`✓ ${created} new applications; ${APPLICATIONS.length - pending.length} existing applications preserved`)

  // Final job statuses (drafts and closed roles)
  for (const job of JOBS.filter((j) => j.status && j.status !== 'open')) {
    check(
      await db.from('jobs').update({ status: job.status }).eq('id', stableId(`job:${job.key}`)),
      `status for ${job.key}`,
    )
  }

  console.log('\nDone. Demo accounts (password: %s):', DEMO_PASSWORD)
  console.log(`  Job seeker: ${DEMO_SEEKER.email}`)
  console.log(`  Recruiter:  ${DEMO_RECRUITER.email}`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
