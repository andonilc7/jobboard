import { submissionRequestSchema, type SubmissionErrorResponse } from '../_shared/application-contract.ts'
import type { ApplicationRepository } from './repository.ts'
import { submitApplication } from './service.ts'
import { SubmissionError } from './errors.ts'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
export type Caller = { userId: string; repository: ApplicationRepository }
export type Authenticate = (request: Request) => Promise<Caller>

function response(body: unknown, status: number, extra: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...corsHeaders, ...extra } })
}
/** HTTP handling stays separate from the application workflow and database adapter. */
export function createSubmissionController(authenticate: Authenticate) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
    if (request.method !== 'POST') return response({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST to submit an application.' } }, 405, { Allow: 'POST, OPTIONS' })
    try {
      const caller = await authenticate(request)
      let body: unknown
      try { body = await request.json() }
      catch { throw new SubmissionError(400, 'INVALID_JSON', 'Send a valid JSON application.') }
      const parsed = submissionRequestSchema.safeParse(body)
      if (!parsed.success) {
        throw new SubmissionError(400, 'INVALID_REQUEST', parsed.error.issues[0]?.message ?? 'Check your application fields.')
      }
      const application = await submitApplication(caller.repository, caller.userId, parsed.data)
      return response({ application }, 201)
    } catch (error) {
      const failure = error instanceof SubmissionError ? error
        : new SubmissionError(500, 'INTERNAL_ERROR', "Couldn't submit your application. Please try again.")
      const body: SubmissionErrorResponse = { error: { code: failure.code, message: failure.message, ...(failure.fields ? { fields: failure.fields } : {}) } }
      return response(body, failure.status)
    }
  }
}
