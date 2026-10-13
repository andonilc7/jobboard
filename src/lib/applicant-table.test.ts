import { describe, expect, it } from 'vitest'
import { applicantFilterError, EMPTY_APPLICANT_FILTERS, matchesApplicant, yearsOfExperience } from '@/lib/applicant-table'

describe('applicant table', () => {
  it('unions concurrent experience and ignores future employment', () => {
    expect(yearsOfExperience([{ start_date: '2020-01-01', end_date: '2020-12-01' }, { start_date: '2020-06-01', end_date: '2021-05-01' }], new Date('2022-01-01'))).toBeCloseTo(17 / 12)
    expect(yearsOfExperience([{ start_date: '2030-01-01', end_date: null }], new Date('2022-01-01'))).toBe(0)
  })
  it('applies name, experience, date and status filters together', () => {
    const filters = { ...EMPTY_APPLICANT_FILTERS, name: 'alex', minYoe: '2', maxYoe: '5', from: '2026-01-01', to: '2026-12-31', status: 'reviewing' }
    const row = { name: 'Alex Taylor', yoe: 3, created_at: '2026-06-15T12:00:00Z', status: 'reviewing' as const }
    expect(matchesApplicant(row, filters)).toBe(true)
    expect(matchesApplicant({ ...row, yoe: 6 }, filters)).toBe(false)
    expect(matchesApplicant({ ...row, yoe: null }, filters)).toBe(false)
    expect(matchesApplicant({ ...row, status: 'offer' }, filters)).toBe(false)
    expect(applicantFilterError({ ...filters, to: '2025-01-01' })).toBeTruthy()
  })
})
