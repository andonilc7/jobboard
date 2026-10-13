import { z } from 'zod'

export const questionSchema = z.object({
  id: z.string().uuid(),
  prompt: z.string().trim().min(1, 'Enter a question').max(500, 'Keep it under 500 characters'),
  required: z.boolean(),
})
export const questionsSchema = z.array(questionSchema).max(10, 'Up to 10 questions')
  .refine((items) => new Set(items.map((item) => item.id)).size === items.length, 'Question IDs must be unique')
export type Question = z.infer<typeof questionSchema>
export type QuestionAnswer = Question & { answer: string }
export function readQuestions(value: unknown): Question[] {
  const result = questionsSchema.safeParse(value)
  return result.success ? result.data : []
}
export function readAnswers(value: unknown): QuestionAnswer[] {
  const result = z.array(questionSchema.extend({ answer: z.string().max(2000) })).safeParse(value)
  return result.success ? result.data : []
}
export function validateAnswers(questions: Question[], answers: Record<string, string>) {
  const errors: Record<string, string> = {}
  for (const question of questions) {
    const answer = (answers[question.id] ?? '').trim()
    if (question.required && !answer) errors[question.id] = 'Answer this required question'
    else if (answer.length > 2000) errors[question.id] = 'Keep it under 2,000 characters'
  }
  return errors
}
