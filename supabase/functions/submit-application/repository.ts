import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables, TablesInsert } from '../../../src/types/database.ts'
import { SubmissionError } from './errors.ts'

export type SubmissionJob = Pick<Tables<'jobs'>, 'id' | 'status' | 'questions'>
export type ApplicationRow = Tables<'applications'>
export interface ApplicationRepository {
  getRole(userId: string): Promise<string | null>
  getJob(jobId: string): Promise<SubmissionJob | null>
  getResume(userId: string): Promise<string | null>
  insertApplication(input: Pick<TablesInsert<'applications'>, 'job_id' | 'seeker_id' | 'cover_note' | 'answers'>): Promise<ApplicationRow>
}

function databaseError(error: { code: string; message: string }): never {
  if (error.code === '23505') throw new SubmissionError(409, 'ALREADY_APPLIED', "You've already applied to this job.")
  if (error.code === '42501') throw new SubmissionError(403, 'FORBIDDEN', 'You cannot submit this application.')
  if (error.code === 'P0001') {
    // Triggers remain authoritative when a posting changes during the request.
    if (/questions changed/i.test(error.message)) throw new SubmissionError(409, 'QUESTIONS_CHANGED', error.message)
    if (/not accepting applications/i.test(error.message)) throw new SubmissionError(409, 'JOB_CLOSED', error.message)
    if (/required questions|each question|Answers must/i.test(error.message)) throw new SubmissionError(400, 'INVALID_ANSWERS', error.message)
  }
  throw new SubmissionError(500, 'DATABASE_ERROR', "Couldn't submit your application. Please try again.")
}

/** This client carries the verified user's token. Database RLS still applies. */
export function createApplicationRepository(client: SupabaseClient<Database>): ApplicationRepository {
  return {
    async getRole(userId) {
      const { data, error } = await client.from('profiles').select('role').eq('id', userId).maybeSingle()
      if (error) databaseError(error)
      return data?.role ?? null
    },
    async getJob(jobId) {
      const { data, error } = await client.from('jobs').select('id,status,questions').eq('id', jobId).maybeSingle()
      if (error) databaseError(error)
      return data
    },
    async getResume(userId) {
      const { data, error } = await client.from('seeker_profiles').select('resume_path').eq('user_id', userId).maybeSingle()
      if (error) databaseError(error)
      return data?.resume_path ?? null
    },
    async insertApplication(input) {
      const { data, error } = await client.from('applications').insert(input).select().single()
      if (error) databaseError(error)
      return data!
    },
  }
}
