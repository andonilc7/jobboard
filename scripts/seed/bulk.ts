import type { SeedCompany } from './companies.ts'
import { COMPANIES as ORIGINAL_COMPANIES } from './companies.ts'
import { JOBS as ORIGINAL_JOBS, type SeedJob } from './jobs.ts'
import { APPLICANTS, APPLICATIONS as ORIGINAL_APPLICATIONS, DEMO_RECRUITER, DEMO_SEEKER,
  type SeedApplication, type SeedRecruiter, type SeedSeeker } from './people.ts'

/** Synthetic demo data only. Keep the original demo accounts and add realistic variety. */
const LOCATIONS = ['Indianapolis, IN', 'Denver, CO', 'Atlanta, GA', 'Nashville, TN', 'Miami, FL',
  'Phoenix, AZ', 'Portland, OR', 'Minneapolis, MN', 'Raleigh, NC', 'Columbus, OH',
  'Seattle, WA', 'Austin, TX', 'Chicago, IL', 'Boston, MA', 'New York, NY',
  'San Francisco, CA', 'Los Angeles, CA', 'Pittsburgh, PA', 'Salt Lake City, UT', 'Madison, WI']
const FIRST = ['Alex', 'Taylor', 'Casey', 'Riley', 'Jamie', 'Avery', 'Quinn', 'Cameron', 'Drew', 'Morgan',
  'Sofia', 'Noah', 'Maya', 'Ethan', 'Leah', 'Oliver', 'Zoe', 'Arjun', 'Nina', 'Mateo']
const LAST = ['Bennett', 'Brooks', 'Carter', 'Davis', 'Evans', 'Foster', 'Garcia', 'Hayes', 'Jackson', 'Kim',
  'Lewis', 'Mitchell', 'Nguyen', 'Parker', 'Reed', 'Singh', 'Turner', 'Walker', 'Young', 'Zhang']
const BUSINESSES = [
  ['Maple Transit Labs', 'Transit tools that connect communities', 'transportation'],
  ['Cedar Learning Systems', 'Learning software for growing classrooms', 'education'],
  ['Beacon Commerce Studio', 'Better tools for independent retailers', 'commerce'],
  ['Harbor Analytics Group', 'Clearer decisions from complex data', 'analytics'],
  ['Summit Energy Tools', 'Software for a cleaner energy grid', 'energy'],
  ['Mosaic Care Technologies', 'Tools that help care teams collaborate', 'healthcare'],
  ['Willow Civic Software', 'Accessible services for local government', 'civic services'],
  ['Atlas Logistics Works', 'Visibility across the delivery network', 'logistics'],
  ['Juniper Media Labs', 'Publishing tools for independent creators', 'media'],
  ['Northstar Research Tools', 'Organize research from idea to discovery', 'research'],
  ['Prairie Finance Systems', 'Practical financial planning tools', 'finance'],
  ['Copper Cloud Studio', 'Developer platforms that simplify delivery', 'developer tools'],
  ['Orchard Food Systems', 'Connect local growers with local markets', 'food systems'],
  ['Meadow Travel Tools', 'Simpler planning for small-group travel', 'travel'],
  ['Riverbend Accessibility Labs', 'Build inclusive digital experiences', 'accessibility'],
  ['Solstice Security Tools', 'Practical security for growing teams', 'security'],
] as const
const ROLES = [
  { title: 'Frontend Engineer', skills: ['React', 'TypeScript', 'CSS', 'Accessibility'], salary: 120000 },
  { title: 'Backend Engineer', skills: ['Python', 'Postgres', 'REST APIs', 'Docker'], salary: 130000 },
  { title: 'Full-stack Engineer', skills: ['React', 'Node.js', 'TypeScript', 'Postgres'], salary: 125000 },
  { title: 'Data Analyst', skills: ['SQL', 'Python', 'Tableau', 'Statistics'], salary: 85000 },
  { title: 'Data Engineer', skills: ['Python', 'SQL', 'Airflow', 'AWS'], salary: 135000 },
  { title: 'Product Designer', skills: ['Figma', 'Research', 'Prototyping', 'Design Systems'], salary: 110000 },
  { title: 'QA Engineer', skills: ['Playwright', 'TypeScript', 'Testing', 'CI/CD'], salary: 95000 },
  { title: 'Security Engineer', skills: ['Python', 'Cloud Security', 'Linux', 'Networking'], salary: 140000 },
  { title: 'DevOps Engineer', skills: ['Kubernetes', 'Docker', 'Terraform', 'AWS'], salary: 135000 },
  { title: 'Technical Writer', skills: ['Documentation', 'Git', 'Markdown', 'REST APIs'], salary: 85000 },
  { title: 'Customer Success Specialist', skills: ['Communication', 'CRM', 'Onboarding', 'Analytics'], salary: 65000 },
  { title: 'Product Manager', skills: ['Strategy', 'Research', 'Analytics', 'Roadmapping'], salary: 120000 },
  { title: 'Mobile Engineer', skills: ['React Native', 'TypeScript', 'iOS', 'Android'], salary: 125000 },
  { title: 'Machine Learning Engineer', skills: ['Python', 'PyTorch', 'Search', 'LLMs'], salary: 150000 },
  { title: 'UX Researcher', skills: ['Research', 'Interviews', 'Usability Testing', 'Analysis'], salary: 100000 },
  { title: 'IT Support Specialist', skills: ['Troubleshooting', 'Networking', 'Windows', 'Linux'], salary: 60000 },
  { title: 'Business Analyst', skills: ['SQL', 'Excel', 'Requirements', 'Process Mapping'], salary: 85000 },
  { title: 'Marketing Coordinator', skills: ['Copywriting', 'Analytics', 'SEO', 'Campaigns'], salary: 65000 },
  { title: 'Operations Associate', skills: ['Planning', 'Excel', 'Communication', 'Process Improvement'], salary: 55000 },
  { title: 'Design Engineer', skills: ['React', 'Figma', 'CSS', 'Design Systems'], salary: 115000 },
]
const LEVELS = ['intern', 'entry', 'mid', 'senior', 'lead'] as const
const PATHS: SeedApplication['path'][] = [[], ['reviewing'], ['reviewing', 'interviewing'],
  ['reviewing', 'interviewing', 'offer'], ['reviewing', 'rejected'], ['reviewing', 'withdrawn']]
function monthBefore(now: Date, months: number) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1)).toISOString().slice(0, 10)
}

export function buildBulkData(now = new Date()) {
  const extraCompanies: SeedCompany[] = BUSINESSES.map(([name, tagline, industry], i) => ({
    slug: `demo-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name, tagline,
    description: `Fictional testing company. ${name} builds practical ${industry} tools for organizations and communities. Our small cross-functional teams value clear communication, reliable products, and thoughtful design.`,
    headquarters: LOCATIONS[i % LOCATIONS.length]!, size: ['11–50', '51–200', '201–500'][i % 3]!,
    website: `https://company-${i + 1}.example.com`,
  }))
  const companies = [...ORIGINAL_COMPANIES, ...extraCompanies]
  const recruiters: SeedRecruiter[] = companies.map((company, i) => i === 0 ? DEMO_RECRUITER : ({
    email: `recruiter.${company.slug}@jobboard.dev`, fullName: `${FIRST[(i + 5) % FIRST.length]} ${LAST[(i + 8) % LAST.length]}`,
    title: i % 2 ? 'Talent Acquisition Manager' : 'Hiring Manager', company: company.slug,
  }))
  const originalSeekers = [DEMO_SEEKER, ...APPLICANTS]
  const extraSeekers: SeedSeeker[] = Array.from({ length: 80 - originalSeekers.length }, (_, i) => {
    const role = ROLES[i % ROLES.length]!, level = LEVELS[i % LEVELS.length]!, location = LOCATIONS[(i * 3) % LOCATIONS.length]!
    const months = [3, 12, 36, 84, 144][i % 5]! + (i % 6)
    const name = `${FIRST[i % FIRST.length]} ${LAST[(Math.floor(i / FIRST.length) * 5 + i % 5) % LAST.length]}`
    const experiences: SeedSeeker['experiences'] = [{ title: level === 'intern' ? `${role.title} Intern` : role.title,
      company: companies[(i + 3) % companies.length]!.name, location,
      start: monthBefore(now, Math.min(months, 30)),
      description: `Built and improved ${role.skills[0]} workflows, collaborated with cross-functional partners, and documented repeatable processes. Fictional testing experience.` }]
    if (months > 30) experiences.push({ title: `Associate ${role.title}`, company: companies[(i + 7) % companies.length]!.name,
      location, start: monthBefore(now, months), end: monthBefore(now, 31),
      description: `Supported customer-facing projects using ${role.skills.slice(0, 2).join(' and ')} and helped improve team delivery. Fictional testing experience.` })
    // Every 12th profile has overlapping work history to test YOE aggregation.
    if (i % 12 === 0) experiences.push({ title: 'Part-time Project Contributor', company: 'Example Community Lab', location,
      start: monthBefore(now, 3), end: monthBefore(now, 1), description: 'Concurrent community project; its months should not count twice. Fictional testing experience.' })
    return { email: `candidate.${String(i + 1).padStart(3, '0')}@jobboard.dev`, fullName: name,
      headline: `${level === 'entry' ? 'Early-career' : level === 'senior' ? 'Senior' : level === 'lead' ? 'Staff' : level === 'intern' ? 'Student' : 'Experienced'} ${role.title.toLowerCase()}`,
      location, bio: `Fictional testing profile. I enjoy ${role.title.toLowerCase()} work, solving practical problems, and collaborating with a supportive team. I have experience with ${role.skills.slice(0, 3).join(', ')} and am looking for opportunities to contribute and grow.`,
      skills: role.skills,
      prefs: { locations: [location], remote: i % 3 !== 0, minPay: Math.round(role.salary * [0.45, 0.65, 0.9, 1.2, 1.5][i % 5]! / 5000) * 5000,
        level, types: i % 6 === 0 ? ['contract', 'full_time'] : level === 'intern' ? ['internship'] : ['full_time'] }, experiences,
    }
  })
  const seekers = [...originalSeekers, ...extraSeekers]
  const extraJobs: SeedJob[] = Array.from({ length: 160 - ORIGINAL_JOBS.length }, (_, i) => {
    const role = ROLES[(i * 7) % ROLES.length]!, company = companies[i % companies.length]!, level = LEVELS[i % LEVELS.length]!
    const hourly = i % 9 === 0, remote = i % 4 === 0, salary = Math.round(role.salary * [0.45, 0.65, 1, 1.3, 1.6][i % 5]! / 5000) * 5000
    const base = hourly ? Math.max(20, Math.round(salary / 2080)) : salary
    return { key: `bulk-role-${String(i + 1).padStart(3, '0')}`, company: company.slug,
      title: `${level === 'senior' ? 'Senior ' : level === 'lead' ? 'Lead ' : level === 'entry' ? 'Junior ' : ''}${role.title}${level === 'intern' ? ' Intern' : ''}`,
      location: remote && i % 8 === 0 ? 'Remote (US)' : LOCATIONS[(i * 3) % LOCATIONS.length]!, remote,
      pay: [base, hourly ? base + 12 : base + 25000], period: hourly ? 'hour' : 'year', level,
      type: level === 'intern' ? 'internship' : hourly ? 'contract' : i % 13 === 0 ? 'part_time' : 'full_time',
      skills: role.skills, daysAgo: 1 + i % 45, status: i % 17 === 0 ? 'draft' : i % 11 === 0 ? 'closed' : 'open',
      summary: `Fictional testing role at ${company.name}. Help our team build useful products, solve customer problems, and improve how we work together. This ${role.title.toLowerCase()} role provides clear ownership, mentorship, and opportunities to develop your craft.`,
      duties: [`Apply ${role.skills.slice(0, 2).join(' and ')} to meaningful projects`, 'Partner with colleagues to plan, deliver and review work',
        'Document decisions and improve team processes', 'Share progress clearly and learn from feedback'],
    }
  })
  const jobs = [...ORIGINAL_JOBS, ...extraJobs]
  const applications: SeedApplication[] = [...ORIGINAL_APPLICATIONS]
  const pairs = new Set(applications.map((app) => `${app.seeker}|${app.job}`))
  function add(seeker: SeedSeeker, job: SeedJob, index: number) {
    const key = `${seeker.email}|${job.key}`
    if (pairs.has(key) || job.status === 'draft') return
    pairs.add(key)
    applications.push({ seeker: seeker.email, job: job.key, path: PATHS[index % PATHS.length]!,
      daysAgo: Math.min(1 + index % 30, job.daysAgo),
      coverNote: index % 4 === 0 ? undefined : `Fictional testing application. I would enjoy contributing as ${job.title} and bringing my experience with ${seeker.skills.slice(0, 2).join(' and ')} to your team.`,
    })
  }
  // A substantial candidate pool for the default recruiter, spanning every status and YOE band.
  const mainJob = jobs.find((job) => job.key === 'lumen-frontend')!
  seekers.slice(0, 60).forEach((seeker, i) => add(seeker, mainJob, i))
  // Give every published posting some activity, then distribute the remaining applications.
  let index = 0
  for (const job of jobs.filter((job) => job.status !== 'draft')) add(seekers[index++ % seekers.length]!, job, index)
  for (let round = 0; applications.length < 480 && round < seekers.length; round++) {
    for (let i = 0; i < jobs.length && applications.length < 480; i++) add(seekers[(i + round * 7) % seekers.length]!, jobs[i]!, i + round)
  }
  return { companies, recruiters, seekers, jobs, applications }
}
