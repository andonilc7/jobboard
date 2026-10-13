import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSubmissionController } from './controller.ts'
import { SubmissionError } from './errors.ts'
import { submitApplication } from './service.ts'
import type { ApplicationRepository, ApplicationRow, SubmissionJob } from './repository.ts'
import type { SubmissionRequest } from '../_shared/application-contract.ts'

const userId = '10000000-0000-4000-8000-000000000001'
const jobId = '20000000-0000-4000-8000-000000000001'
const question = { id: '30000000-0000-4000-8000-000000000001', prompt: 'Why this role?', required: true }
const application: ApplicationRow = { id: '40000000-0000-4000-8000-000000000001', job_id: jobId, seeker_id: userId,
  status: 'applied', cover_note: null, answers: [], resume_path: `${userId}/resume.pdf`,
  created_at: '2026-10-12T12:00:00Z', updated_at: '2026-10-12T12:00:00Z' }
const input: SubmissionRequest = { jobId, coverNote: '  Cover note  ', answers: [{ ...question, answer: '  I enjoy this work.  ' }] }
function fixture() {
  const repository = {
    getRole: vi.fn(async (_id: string): Promise<string | null> => 'seeker'),
    getJob: vi.fn(async (_id: string): Promise<SubmissionJob | null> => ({ id: jobId, status: 'open', questions: [question] })),
    getResume: vi.fn(async (_id: string): Promise<string | null> => application.resume_path),
    insertApplication: vi.fn(async (_input: Parameters<ApplicationRepository['insertApplication']>[0]) => application),
  } satisfies ApplicationRepository
  const authenticate = vi.fn(async (_request: Request) => ({ userId, repository }))
  return { repository, authenticate, controller: createSubmissionController(authenticate) }
}
const post = (body: unknown) => new Request('http://localhost/functions/v1/submit-application', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

describe('submission service', () => {
  it('checks the workflow and inserts only caller-derived identity and canonical answers', async () => {
    const { repository } = fixture()
    expect(await submitApplication(repository, userId, input)).toEqual(application)
    expect(repository.insertApplication).toHaveBeenCalledWith({ job_id: jobId, seeker_id: userId,
      cover_note: 'Cover note', answers: [{ ...question, answer: 'I enjoy this work.' }] })
    expect(repository.getRole.mock.invocationCallOrder[0]).toBeLessThan(repository.getJob.mock.invocationCallOrder[0]!)
    expect(repository.getResume.mock.invocationCallOrder[0]).toBeLessThan(repository.insertApplication.mock.invocationCallOrder[0]!)
  })
  it('rejects recruiters before querying the posting', async () => {
    const { repository } = fixture(); repository.getRole.mockResolvedValue('recruiter')
    await expect(submitApplication(repository, userId, input)).rejects.toMatchObject({ status: 403, code: 'SEEKER_REQUIRED' })
    expect(repository.getJob).not.toHaveBeenCalled()
  })
  it('rejects missing and closed jobs without inserting', async () => {
    const { repository } = fixture(); repository.getJob.mockResolvedValue(null)
    await expect(submitApplication(repository, userId, input)).rejects.toMatchObject({ status: 404 })
    repository.getJob.mockResolvedValue({ id: jobId, status: 'closed', questions: [question] })
    await expect(submitApplication(repository, userId, input)).rejects.toMatchObject({ code: 'JOB_CLOSED' })
    expect(repository.insertApplication).not.toHaveBeenCalled()
  })
  it('rejects stale question text, required flags and missing answers', async () => {
    const { repository } = fixture()
    for (const answers of [[], [{ ...question, answer: 'Test', prompt: 'Old text' }], [{ ...question, answer: 'Test', required: false }]]) {
      await expect(submitApplication(repository, userId, { ...input, answers })).rejects.toMatchObject({ code: 'QUESTIONS_CHANGED' })
    }
    expect(repository.insertApplication).not.toHaveBeenCalled()
  })
  it('reports required-answer errors while allowing optional blanks', async () => {
    const { repository } = fixture()
    await expect(submitApplication(repository, userId, { ...input, answers: [{ ...question, answer: '\t\n ' }] }))
      .rejects.toMatchObject({ status: 400, fields: { [question.id]: 'Answer this required question' } })
    repository.getJob.mockResolvedValue({ id: jobId, status: 'open', questions: [{ ...question, required: false }] })
    await expect(submitApplication(repository, userId, { ...input, answers: [{ ...question, required: false, answer: '' }] })).resolves.toEqual(application)
  })
  it('requires the profile resume and leaves snapshotting to the database', async () => {
    const { repository } = fixture(); repository.getResume.mockResolvedValue(null)
    await expect(submitApplication(repository, userId, input)).rejects.toMatchObject({ code: 'RESUME_REQUIRED' })
    expect(repository.insertApplication).not.toHaveBeenCalled()
  })
  it('preserves duplicate and race-condition errors from the repository', async () => {
    const { repository } = fixture()
    for (const code of ['ALREADY_APPLIED', 'QUESTIONS_CHANGED', 'JOB_CLOSED']) {
      repository.insertApplication.mockRejectedValueOnce(new SubmissionError(409, code, 'Conflict'))
      await expect(submitApplication(repository, userId, input)).rejects.toMatchObject({ status: 409, code })
    }
  })
  it('supports jobs with no questions and an empty optional cover note', async () => {
    const { repository } = fixture(); repository.getJob.mockResolvedValue({ id: jobId, status: 'open', questions: [] })
    await submitApplication(repository, userId, { jobId, answers: [] })
    expect(repository.insertApplication).toHaveBeenCalledWith({ job_id: jobId, seeker_id: userId, cover_note: null, answers: [] })
  })
})

describe('submission controller', () => {
  beforeEach(() => vi.clearAllMocks())
  it('answers CORS preflight without authentication or database calls', async () => {
    const { controller, authenticate } = fixture()
    const response = await controller(new Request('http://localhost', { method: 'OPTIONS' }))
    expect(response.status).toBe(204);expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(authenticate).not.toHaveBeenCalled()
  })
  it('rejects unsupported methods', async () => {
    const { controller, authenticate } = fixture()
    expect((await controller(new Request('http://localhost'))).status).toBe(405)
    expect(authenticate).not.toHaveBeenCalled()
  })
  it('returns 401 for unverified callers', async () => {
    const { authenticate, repository } = fixture();authenticate.mockRejectedValue(new SubmissionError(401, 'AUTH_REQUIRED', 'Sign in'))
    const response = await createSubmissionController(authenticate)(post(input))
    expect(response.status).toBe(401);expect(repository.insertApplication).not.toHaveBeenCalled()
  })
  it('rejects invalid JSON, oversized notes, duplicate answers and a forged seekerId', async () => {
    const { controller, repository } = fixture()
    const invalidJson = new Request('http://localhost', { method: 'POST', body: '{' })
    expect((await controller(invalidJson)).status).toBe(400)
    for (const body of [{ ...input, jobId: 'bad-id' }, { ...input, coverNote: 'x'.repeat(2001) },
      { ...input, answers: [input.answers[0], input.answers[0]] }, { ...input, seekerId: 'another-user' }]) {
      expect((await controller(post(body))).status).toBe(400)
    }
    expect(repository.insertApplication).not.toHaveBeenCalled()
  })
  it('returns the unchanged application row and status 201', async () => {
    const { controller } = fixture();const response = await controller(post(input))
    expect(response.status).toBe(201);expect(await response.json()).toEqual({ application })
  })
  it('hides unexpected internal errors while retaining CORS headers', async () => {
    const { controller, repository } = fixture();repository.getJob.mockRejectedValue(new Error('private backend detail'))
    const response = await controller(post(input));const text = await response.text()
    expect(response.status).toBe(500);expect(text).not.toContain('private backend detail')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})
