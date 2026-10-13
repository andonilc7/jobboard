import type { QuestionAnswer } from '@/lib/questions'
import { supabase } from '@/lib/supabase'

/** The seeker's application to a job, if they have one. RLS only returns their own. */
export async function fetchMyApplication(jobId: string, seekerId: string) {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('job_id', jobId)
    .eq('seeker_id', seekerId)
    .maybeSingle()
  if (error) throw error
  return data
}

export type ApplyInput = { jobId: string; seekerId: string; coverNote?: string; answers?: QuestionAnswer[] }

/**
 * R7: apply to an open job. The database snapshots the resume on file and rejects duplicates,
 * non-seekers and jobs that aren't open.
 */
export async function applyToJob({ jobId, seekerId, coverNote, answers = [] }: ApplyInput) {
  const { data, error } = await supabase
    .from('applications')
    .insert({ job_id: jobId, seeker_id: seekerId, cover_note: coverNote?.trim() || null, answers })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error("You've already applied to this job.")
    throw new Error(error.message)
  }
  return data
}

const MY_APPLICATION = `*,
  job:jobs (id, title, status, location, is_remote, pay_min, pay_max, pay_period, company:companies (id, name)),
  events:application_events (id, from_status, to_status, changed_by, created_at)` as const

/**
 * R8: every application the seeker has sent, with its job and status timeline. A job the seeker
 * can no longer read (deleted, or hidden by RLS) comes back as `job: null`.
 */
export async function fetchMyApplications(seekerId: string) {
  const { data, error } = await supabase
    .from('applications')
    .select(MY_APPLICATION)
    .eq('seeker_id', seekerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  // The generated types assume a non-null job because of the foreign key, but RLS can hide it.
  return data as (Omit<(typeof data)[number], 'job'> & { job: (typeof data)[number]['job'] | null })[]
}

export type MyApplication = Awaited<ReturnType<typeof fetchMyApplications>>[number]

/** R8: seekers can withdraw an active application. The database rejects any other change. */
export async function withdrawApplication(applicationId: string) {
  const { data, error } = await supabase
    .from('applications')
    .update({ status: 'withdrawn' })
    .eq('id', applicationId)
    .select(MY_APPLICATION)
    .single()
  if (error) throw new Error(error.message)
  return data as MyApplication
}
