import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../src/types/database.ts'
import type { Caller } from './controller.ts'
import { createApplicationRepository } from './repository.ts'
import { SubmissionError } from './errors.ts'

export type FunctionEnvironment = { get(name: string): string | undefined }
function publishableKey(environment: FunctionEnvironment) {
  const named = environment.get('SUPABASE_PUBLISHABLE_KEYS')
  if (named) {
    try {
      const keys: unknown = JSON.parse(named)
      if (keys && typeof keys === 'object' && 'default' in keys && typeof keys.default === 'string') return keys.default
    } catch { /* Try the single-key environment used by local/older deployments. */ }
  }
  return environment.get('SUPABASE_PUBLISHABLE_KEY') ?? environment.get('SUPABASE_ANON_KEY')
}

/** Verify with Supabase Auth, then carry the same user's token into the database client. */
export async function authenticateCaller(request: Request, environment: FunctionEnvironment): Promise<Caller> {
  const authorization = request.headers.get('Authorization')
  const match = authorization?.match(/^Bearer\s+(\S+)$/i)
  if (!match) throw new SubmissionError(401, 'AUTH_REQUIRED', 'Sign in to submit an application.')
  const url = environment.get('SUPABASE_URL'), key = publishableKey(environment)
  if (!url || !key) throw new SubmissionError(500, 'SERVER_CONFIGURATION', 'Application submission is not configured.')
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization! } },
  })
  const { data, error } = await client.auth.getUser(match[1]!)
  if (error || !data.user) throw new SubmissionError(401, 'INVALID_SESSION', 'Your session expired. Sign in again.')
  return { userId: data.user.id, repository: createApplicationRepository(client) }
}
