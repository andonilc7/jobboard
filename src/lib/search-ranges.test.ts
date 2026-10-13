import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS, filtersToParams, parseFilters } from '@/lib/job-filters'
import { compositeSearchFilter, filterError } from '@/lib/search-ranges'

describe('combined job filters', () => {
  it('round-trips max pay, zero years, city and state through the URL', () => {
    const filters = { ...EMPTY_FILTERS, minPay: 0, maxPay: 120_000, minYoe: 0, maxYoe: 2, city: 'Austin', state: 'TX' }
    expect(parseFilters(filtersToParams(filters))).toEqual(filters)
  })
  it('combines both pay bounds, location OR remote and both experience bounds', () => {
    const query = compositeSearchFilter({ ...EMPTY_FILTERS, minPay: 100_000, maxPay: 120_000, minYoe: 0, maxYoe: 3, city: 'Austin', state: 'TX', remote: true })
    expect(query).toContain('pay_max.gte.100000')
    expect(query).toContain('pay_min.lte.120000')
    expect(query).toContain('pay_max.gte.49')
    expect(query).toContain('pay_min.lte.57')
    expect(query).toContain('or(and(city.ilike."*Austin*",state.eq.TX),is_remote.is.true)')
    expect(query).toContain('max_yoe.gte.0')
    expect(query).toContain('min_yoe.lte.3')
  })
  it('rejects inverted bounds and invalid URL numbers', () => {
    expect(filterError({ ...EMPTY_FILTERS, minPay: 2, maxPay: 1 })).toBeTruthy()
    expect(filterError({ ...EMPTY_FILTERS, minYoe: 2, maxYoe: 1 })).toBeTruthy()
    expect(parseFilters(new URLSearchParams('maxPay=-1&minYoe=NaN&maxYoe=90&state=XX'))).toMatchObject({ maxPay: null, minYoe: null, maxYoe: null, state: '' })
  })
})
