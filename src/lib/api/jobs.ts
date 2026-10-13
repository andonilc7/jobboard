import { compositeSearchFilter, filterError } from '@/lib/search-ranges'
import { toTsQuery, type JobFilters } from '@/lib/job-filters'
import { supabase } from '@/lib/supabase'

const JOB_WITH_COMPANY = '*, company:companies (id, name, website, description)' as const

export const JOBS_PAGE_SIZE = 20

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** R4/R5: open jobs matching the filters, newest first. RLS hides drafts and closed jobs from everyone else. */
export async function searchJobs(filters: JobFilters, page: number) {
  let query = supabase
    .from('jobs')
    .select(JOB_WITH_COMPANY, { count: 'exact' })
    .eq('status', 'open')

  const tsQuery = toTsQuery(filters.q)
  if (tsQuery) query = query.textSearch('search', tsQuery, { config: 'english' })

  const invalid = filterError(filters)
  if (invalid) throw new Error(invalid)
  const composite = compositeSearchFilter(filters)
  if (composite) query = query.or(composite)

  if (filters.levels.length) query = query.in('experience_level', filters.levels)

  const from = page * JOBS_PAGE_SIZE
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .order('id')
    .range(from, from + JOBS_PAGE_SIZE - 1)
  if (error) throw error
  return { jobs: data, total: count ?? data.length }
}

export type JobWithCompany = Awaited<ReturnType<typeof searchJobs>>['jobs'][number]

/** Enough for seed scale. Past this, ranking should move into a Postgres function (see CLAUDE.md). */
export const FEED_JOB_LIMIT = 500

/** R6: every open job, for the For-you feed to rank client-side. Newest first breaks score ties. */
export async function fetchOpenJobs() {
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_WITH_COMPANY)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(FEED_JOB_LIMIT)
  if (error) throw error
  return data
}

/** R7: one job with its company. Null when it doesn't exist or RLS hides it. */
export async function fetchJob(jobId: string) {
  // A malformed id in the URL is just a job that doesn't exist; don't send it to Postgres.
  if (!UUID.test(jobId)) return null
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_WITH_COMPANY)
    .eq('id', jobId)
    .maybeSingle()
  if (error) throw error
  return data
}
