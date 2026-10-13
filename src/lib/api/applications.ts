import { FunctionsHttpError } from '@supabase/supabase-js'
import type { Application } from '@/lib/types'
import type { SubmissionErrorResponse } from '../../../supabase/functions/_shared/application-contract.ts'
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

/** R7: the server controller coordinates submission; its database client still obeys RLS. */
export async function applyToJob({ jobId, coverNote, answers = [] }: ApplyInput): Promise<Application> {
  const { data, error } = await supabase.functions.invoke<{ application: Application }>('submit-application', {
    body: { jobId, coverNote, answers },
  })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      let body: SubmissionErrorResponse | undefined
      try { body = await error.context.json() as SubmissionErrorResponse }
      catch { /* Preserve the SDK error if the gateway returned a non-JSON response. */ }
      if (body?.error?.message) throw new Error(body.error.message)
    }
    throw new Error(error.message)
  }
  if (!data?.application) throw new Error("Couldn't submit your application. Please try again.")
  return data.application
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
