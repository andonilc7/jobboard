import { questionsSchema, validateAnswers, type SubmissionRequest } from '../_shared/application-contract.ts'
import type { ApplicationRepository, ApplicationRow } from './repository.ts'
import { SubmissionError } from './errors.ts'

/** Coordinate one complete submission; identity comes from authentication, not the payload. */
export async function submitApplication(repository: ApplicationRepository, userId: string, request: SubmissionRequest): Promise<ApplicationRow> {
  if (await repository.getRole(userId) !== 'seeker') {
    throw new SubmissionError(403, 'SEEKER_REQUIRED', 'Only job seekers can apply to jobs.')
  }
  const job = await repository.getJob(request.jobId)
  if (!job) throw new SubmissionError(404, 'JOB_NOT_FOUND', "This job isn't available.")
  if (job.status !== 'open') throw new SubmissionError(409, 'JOB_CLOSED', 'This job is not accepting applications.')
  const parsed = questionsSchema.safeParse(job.questions)
  if (!parsed.success) throw new SubmissionError(500, 'QUESTION_CONFIGURATION', "Couldn't load application questions. Please try again.")
  const questions = parsed.data
  const answersById = new Map(request.answers.map((answer) => [answer.id, answer]))
  if (request.answers.length !== questions.length || questions.some((question) => {
    const answer = answersById.get(question.id)
    return !answer || answer.prompt !== question.prompt || answer.required !== question.required
  })) {
    throw new SubmissionError(409, 'QUESTIONS_CHANGED', 'Application questions changed. Reload the posting before applying.')
  }
  const answers = Object.fromEntries(request.answers.map((answer) => [answer.id, answer.answer]))
  const fields = validateAnswers(questions, answers)
  if (Object.keys(fields).length) throw new SubmissionError(400, 'INVALID_ANSWERS', 'Answer all required questions.', fields)
  if (!await repository.getResume(userId)) {
    throw new SubmissionError(400, 'RESUME_REQUIRED', 'Upload your resume before applying.')
  }
  return repository.insertApplication({
    job_id: job.id, seeker_id: userId, cover_note: request.coverNote?.trim() || null,
    answers: questions.map((question) => ({ ...question, answer: answers[question.id]!.trim() })),
  })
}
