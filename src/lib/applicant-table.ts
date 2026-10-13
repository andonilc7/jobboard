import type { ApplicationStatus } from '@/lib/types'

export type WorkDates = { start_date: string; end_date: string | null }
/** Union work-history months so concurrent jobs do not inflate experience. */
export function yearsOfExperience(items: WorkDates[], now = new Date()): number {
  const index = (value: string) => {
    const [year, month] = value.slice(0, 7).split('-').map(Number)
    return year! * 12 + month! - 1
  }
  const current = now.getUTCFullYear() * 12 + now.getUTCMonth()
  const spans = items.map((item) => [index(item.start_date), Math.min(item.end_date ? index(item.end_date) : current, current) + 1])
    .filter(([start, end]) => Number.isFinite(start) && Number.isFinite(end) && end! > start!)
    .sort((a, b) => a[0]! - b[0]!)
  let months = 0, end = -Infinity
  for (const [start, stop] of spans) {
    months += Math.max(0, stop! - Math.max(start!, end))
    end = Math.max(end, stop!)
  }
  return months / 12
}
export type ApplicantFilters = { name: string; minYoe: string; maxYoe: string; from: string; to: string; status: string }
export const EMPTY_APPLICANT_FILTERS: ApplicantFilters = { name: '', minYoe: '', maxYoe: '', from: '', to: '', status: '' }
export function applicantFilterError(filters: ApplicantFilters) {
  for (const value of [filters.minYoe, filters.maxYoe]) {
    if (value && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100)) return 'Experience must be between 0 and 100 years.'
  }
  if (filters.minYoe && filters.maxYoe && Number(filters.minYoe) > Number(filters.maxYoe)) return 'Maximum experience must be at least minimum experience.'
  if (filters.from && filters.to && filters.from > filters.to) return 'End date must be on or after start date.'
  return null
}
export function matchesApplicant(row: { name: string; yoe: number | null; created_at: string; status: ApplicationStatus }, filters: ApplicantFilters) {
  if (!row.name.toLowerCase().includes(filters.name.trim().toLowerCase())) return false
  if (filters.status && row.status !== filters.status) return false
  if (filters.minYoe && (row.yoe === null || row.yoe < Number(filters.minYoe))) return false
  if (filters.maxYoe && (row.yoe === null || row.yoe > Number(filters.maxYoe))) return false
  const date = new Date(row.created_at).toLocaleDateString('en-CA')
  return (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to)
}
