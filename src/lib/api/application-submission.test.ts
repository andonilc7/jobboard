import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { applyToJob } from './applications'
const client = vi.hoisted(() => ({ functions: { invoke: vi.fn() }, from: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: client }))

describe('application submission adapter', () => {
  beforeEach(() => vi.resetAllMocks())
  it('calls the controller without trusting the frontend seekerId', async () => {
    const application = { id: 'saved-application', seeker_id: 'verified-user', job_id: 'job' }
    client.functions.invoke.mockResolvedValue({ data: { application }, error: null })
    expect(await applyToJob({ jobId: 'job', seekerId: 'frontend-user', coverNote: 'Hello' })).toEqual(application)
    expect(client.functions.invoke).toHaveBeenCalledWith('submit-application', { body: { jobId: 'job', coverNote: 'Hello', answers: [] } })
    expect(client.from).not.toHaveBeenCalled()
  })
  it('preserves controller error messages for the existing form', async () => {
    client.functions.invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(Response.json({
      error: { code: 'ALREADY_APPLIED', message: "You've already applied to this job." },
    }, { status: 409 })) })
    await expect(applyToJob({ jobId: 'job', seekerId: 'user' })).rejects.toThrow("You've already applied to this job.")
  })
  it('does not fall back to direct inserts when the function is unavailable', async () => {
    client.functions.invoke.mockResolvedValue({ data: null, error: new Error('Network unavailable') })
    await expect(applyToJob({ jobId: 'job', seekerId: 'user' })).rejects.toThrow('Network unavailable')
    expect(client.from).not.toHaveBeenCalled()
  })
})
