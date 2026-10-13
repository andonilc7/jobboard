import { describe, expect, it } from 'vitest'
import { questionsSchema, readAnswers, validateAnswers } from '@/lib/questions'

const question = { id: '11111111-1111-4111-8111-111111111111', prompt: 'Why this role?', required: true }

describe('custom application questions', () => {
  it('rejects missing required answers while allowing optional blanks', () => {
    expect(validateAnswers([question], {})).toEqual({ [question.id]: 'Answer this required question' })
    expect(validateAnswers([{ ...question, required: false }], {})).toEqual({})
    expect(validateAnswers([question], { [question.id]: '   ' })).toHaveProperty(question.id)
  })
  it('limits answer length and rejects duplicate question IDs', () => {
    expect(validateAnswers([question], { [question.id]: 'x'.repeat(2001) })).toHaveProperty(question.id)
    expect(questionsSchema.safeParse([question, question]).success).toBe(false)
  })
  it('reads saved question text independently of a subsequently edited posting', () => {
    const saved = [{ ...question, answer: 'I enjoy this work.' }]
    expect(readAnswers(saved)[0]?.prompt).toBe('Why this role?')
    expect(readAnswers(null)).toEqual([])
  })
})
