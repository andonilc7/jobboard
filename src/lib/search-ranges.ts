import type { JobFilters } from '@/lib/job-filters'
import { HOURS_PER_YEAR } from '@/lib/constants'
import { hourlyThreshold, sanitizeLocation } from '@/lib/job-filters'

export function filterError(filters: JobFilters) {
  if (filters.minPay !== null && filters.maxPay !== null && filters.minPay > filters.maxPay) return 'Maximum pay must be at least minimum pay.'
  if (filters.minYoe !== null && filters.maxYoe !== null && filters.minYoe > filters.maxYoe) return 'Maximum experience must be at least minimum experience.'
  return null
}
/** One composite filter prevents repeated .or() calls from replacing one another. */
export function compositeSearchFilter(filters: JobFilters) {
  const conditions: string[] = []
  if (filters.minPay !== null) conditions.push(`or(and(pay_period.eq.year,pay_max.gte.${filters.minPay}),and(pay_period.eq.hour,pay_max.gte.${hourlyThreshold(filters.minPay)}))`)
  if (filters.maxPay !== null) conditions.push(`or(and(pay_period.eq.year,pay_min.lte.${filters.maxPay}),and(pay_period.eq.hour,pay_min.lte.${Math.floor(filters.maxPay / HOURS_PER_YEAR)}))`)
  const city = sanitizeLocation(filters.city)
  const location = sanitizeLocation(filters.location)
  const place: string[] = []
  if (city) place.push(`city.ilike."*${city}*"`)
  if (filters.state) place.push(`state.eq.${filters.state}`)
  // Backwards compatibility for previously shared free-text search URLs.
  if (location) place.push(`location.ilike."*${location}*"`)
  if (place.length) conditions.push(filters.remote ? `or(and(${place.join(',')}),is_remote.is.true)` : `and(${place.join(',')})`)
  else if (filters.remote) conditions.push('is_remote.is.true')
  if (filters.minYoe !== null || filters.maxYoe !== null) {
    // Unknown ranges must not be represented as zero years.
    conditions.push('or(min_yoe.not.is.null,max_yoe.not.is.null)')
    if (filters.minYoe !== null) conditions.push(`or(max_yoe.is.null,max_yoe.gte.${filters.minYoe})`)
    if (filters.maxYoe !== null) conditions.push(`or(min_yoe.is.null,min_yoe.lte.${filters.maxYoe})`)
  }
  return conditions.length ? `and(${conditions.join(',')})` : null
}
