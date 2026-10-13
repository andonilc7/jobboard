import { supabase } from '@/lib/supabase'
import type { ApplicationStatus } from '@/lib/types'

const APPLICANT = `id, job_id, seeker_id, status, cover_note, answers, resume_path, created_at, updated_at,
  candidate:profiles (full_name, experiences (start_date, end_date), seeker:seeker_profiles (headline, location, bio, skills)),
  events:application_events (id, from_status, to_status, changed_by, created_at)` as const

/**
 * R12: everyone who applied to a posting, with their profile and status timeline. RLS returns
 * applications only for the recruiter's own company's jobs, and the candidate's profile only
 * through `can_view_seeker`.
 */
export async function fetchApplicants(jobId: string) {
  const { data, error } = await supabase
    .from('applications')
    .select(APPLICANT)
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })
  if (error) throw error
  // The generated types assume non-null embeds because of the foreign keys, but RLS can hide them.
  type Row = (typeof data)[number]
  type Candidate = NonNullable<Row['candidate']>
  return data as (Omit<Row, 'candidate'> & {
    candidate: (Omit<Candidate, 'seeker'> & { seeker: Candidate['seeker'] | null }) | null
  })[]
}

export type Applicant = Awaited<ReturnType<typeof fetchApplicants>>[number]

/**
 * R13: move a candidate through the pipeline. Recruiters may update `status` only (column grant),
 * and `check_application_update` rejects anything to or from `withdrawn`.
 */
export async function updateApplicationStatus(applicationId: string, status: ApplicationStatus) {
  const { data, error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', applicationId)
    .select('id, status, updated_at')
    .single()
  if (error) throw new Error(error.message)
  return data
}
