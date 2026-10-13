import { z } from 'zod'
import { citySchema, stateSchema, formatLocation, splitLocation } from '@/lib/location'
import { questionsSchema, readQuestions } from '@/lib/questions'

import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS } from '@/lib/constants'
import type { ApplicationStatus, EmploymentType, ExperienceLevel, Job, JobStatus } from '@/lib/types'

// ---------------------------------------------------------------------------
// The posting form (R10)
// ---------------------------------------------------------------------------

/** Above this, an hourly rate is almost certainly an annual salary typed into the wrong period. */
export const MAX_HOURLY_PAY = 1_000
/** Below this, an annual salary is almost certainly an hourly rate. */
export const MIN_YEARLY_PAY = 1_000
export const MAX_PAY = 5_000_000
export const MAX_SKILLS = 15

// Empty inputs are null in the form, so a new posting doesn't start with a placeholder number.
const pay = z
  .number({ error: 'Enter a whole number' })
  .int('Enter a whole number')
  .min(0, "Pay can't be negative")
  .max(MAX_PAY, 'That seems high')
  .nullable()
  .transform((value, ctx) => {
    if (value === null) {
      ctx.addIssue({ code: 'custom', message: 'Required' })
      return z.NEVER
    }
    return value
  })

export const postingSchema = z
  .object({
    title: z.string().trim().min(3, 'Give the role a title').max(120, 'Keep the title under 120 characters'),
    city: z.string(),
    state: z.string(),
    minYoe: z.number().min(0).max(60).nullable(),
    maxYoe: z.number().min(0).max(60).nullable(),
    questions: questionsSchema,
    isRemote: z.boolean(),
    payMin: pay,
    payMax: pay,
    payPeriod: z.enum(['year', 'hour']),
    level: z.enum(EXPERIENCE_LEVELS.map((l) => l.value) as [ExperienceLevel, ...ExperienceLevel[]]),
    type: z.enum(EMPLOYMENT_TYPES.map((t) => t.value) as [EmploymentType, ...EmploymentType[]]),
    description: z
      .string()
      .trim()
      .min(80, 'Describe the role in at least a few sentences')
      .max(10_000, 'Keep the description under 10,000 characters'),
    skills: z.array(z.string()).max(MAX_SKILLS, `Up to ${MAX_SKILLS} skills`),
  })
  .superRefine((values, ctx) => {
    const remoteWithoutCity = values.isRemote && !values.city.trim() && !values.state
    if (!remoteWithoutCity) {
      for (const [key, schema] of [['city', citySchema], ['state', stateSchema]] as const) {
        const result = schema.safeParse(values[key])
        if (!result.success) ctx.addIssue({ code: 'custom', path: [key], message: result.error.issues[0]!.message })
      }
    }
    if (values.minYoe !== null && values.maxYoe !== null && values.maxYoe < values.minYoe) {
      ctx.addIssue({ code: 'custom', path: ['maxYoe'], message: 'Must be at least the minimum' })
    }
    if (values.payMax < values.payMin) {
      ctx.addIssue({ code: 'custom', path: ['payMax'], message: 'Must be at least the minimum' })
    }
    if (values.payPeriod === 'hour' && values.payMax > MAX_HOURLY_PAY) {
      ctx.addIssue({
        code: 'custom',
        path: ['payMax'],
        message: 'That looks like an annual salary. Switch the period to per year.',
      })
    }
    if (values.payPeriod === 'year' && values.payMin > 0 && values.payMin < MIN_YEARLY_PAY) {
      ctx.addIssue({
        code: 'custom',
        path: ['payMin'],
        message: 'That looks like an hourly rate. Switch the period to per hour.',
      })
    }
  })

/** What the form holds while editing. Pay is null until it's typed. */
export type PostingInput = z.input<typeof postingSchema>
/** What the form submits once it's valid. */
export type PostingValues = z.output<typeof postingSchema>

export const EMPTY_POSTING = {
  title: '',
  city: '',
  state: '',
  minYoe: null,
  maxYoe: null,
  questions: [],
  isRemote: false,
  payMin: null,
  payMax: null,
  payPeriod: 'year',
  level: 'mid',
  type: 'full_time',
  description: '',
  skills: [],
} satisfies PostingInput

export type PostingFields = Pick<
  Job,
  | 'title'
  | 'description'
  | 'location'
  | 'city'
  | 'state'
  | 'min_yoe'
  | 'max_yoe'
  | 'questions'
  | 'is_remote'
  | 'pay_min'
  | 'pay_max'
  | 'pay_period'
  | 'experience_level'
  | 'employment_type'
  | 'skills'
>

export function toPostingValues(job: PostingFields): PostingValues {
  return {
    title: job.title,
    city: job.city ?? splitLocation(job.location).city,
    state: job.state ?? splitLocation(job.location).state,
    minYoe: job.min_yoe,
    maxYoe: job.max_yoe,
    questions: readQuestions(job.questions),
    isRemote: job.is_remote,
    payMin: job.pay_min,
    payMax: job.pay_max,
    payPeriod: job.pay_period,
    level: job.experience_level,
    type: job.employment_type,
    description: job.description,
    skills: job.skills,
  }
}

/** The columns recruiters may write (see migration `20261004210000_restrict_job_writes.sql`). */
export function toPostingFields(values: PostingValues): PostingFields {
  return {
    title: values.title.trim(),
    location: formatLocation(values.city, values.state) || 'Remote',
    city: values.city.trim() || null,
    state: values.state || null,
    min_yoe: values.minYoe,
    max_yoe: values.maxYoe,
    questions: values.questions,
    is_remote: values.isRemote,
    pay_min: values.payMin,
    pay_max: values.payMax,
    pay_period: values.payPeriod,
    experience_level: values.level,
    employment_type: values.type,
    description: values.description.trim(),
    skills: values.skills,
  }
}

/** A starting structure that `parseDescription` renders as paragraphs, headings and lists. */
export const DESCRIPTION_TEMPLATE = `A sentence or two on the team and why this role matters.

What you'll do
- Own something meaningful end to end
- Work closely with design, product and customers

What we're looking for
- Experience that matters for the role
- How you like to work
`

// ---------------------------------------------------------------------------
// Statuses and actions (R11)
// ---------------------------------------------------------------------------

export type PostingAction = 'publish' | 'close' | 'reopen' | 'unpublish' | 'delete'

/**
 * What a recruiter can do with a posting, mirroring `check_job_status` and the delete policy:
 * drafts publish or get deleted, open postings close, closed ones reopen. An open posting goes back
 * to draft only while nobody has applied, since applicants can't see drafts.
 */
export function postingActions(status: JobStatus, applicantCount: number): PostingAction[] {
  switch (status) {
    case 'draft':
      return ['publish', 'delete']
    case 'open':
      return applicantCount === 0 ? ['close', 'unpublish'] : ['close']
    case 'closed':
      return ['reopen']
  }
}

export const ACTION_TARGET: Record<Exclude<PostingAction, 'delete'>, JobStatus> = {
  publish: 'open',
  close: 'closed',
  reopen: 'open',
  unpublish: 'draft',
}

// ---------------------------------------------------------------------------
// The dashboard (R11)
// ---------------------------------------------------------------------------

/** Where a posting links from a list: its pipeline, or the editor for a draft (no applicants yet). */
export function postingHref(posting: { id: string; status: JobStatus }): string {
  return posting.status === 'draft' ? `/postings/${posting.id}/edit` : `/postings/${posting.id}`
}

export const POSTING_TABS = ['all', 'open', 'draft', 'closed'] as const
export type PostingTab = (typeof POSTING_TABS)[number]

/** A tab from the URL, falling back to `all` for anything unknown. */
export function parsePostingTab(value: string | null): PostingTab {
  return POSTING_TABS.find((tab) => tab === value) ?? 'all'
}

export function countPostingTabs(postings: { status: JobStatus }[]): Record<PostingTab, number> {
  const counts: Record<PostingTab, number> = { all: postings.length, open: 0, draft: 0, closed: 0 }
  for (const { status } of postings) counts[status] += 1
  return counts
}

const STATUS_ORDER: Record<JobStatus, number> = { open: 0, draft: 1, closed: 2 }

/** Open first (they're live), then drafts, then closed. Most recently updated first within each. */
export function sortPostings<T extends { status: JobStatus; updated_at: string }>(postings: T[]): T[] {
  return [...postings].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
}

export type ApplicantCounts = Record<ApplicationStatus, number> & {
  total: number
  /** Still in play: applied, in review or interviewing. */
  active: number
}

export function countApplicants(applications: { status: ApplicationStatus }[]): ApplicantCounts {
  const counts: ApplicantCounts = {
    total: applications.length,
    active: 0,
    applied: 0,
    reviewing: 0,
    interviewing: 0,
    offer: 0,
    rejected: 0,
    withdrawn: 0,
  }
  for (const { status } of applications) {
    counts[status] += 1
    if (status === 'applied' || status === 'reviewing' || status === 'interviewing') counts.active += 1
  }
  return counts
}
