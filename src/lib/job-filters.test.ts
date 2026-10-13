import { describe, expect, it } from 'vitest'

import {
  activeFilterCount,
  EMPTY_FILTERS,
  filtersToParams,
  hourlyThreshold,
  parseFilters,
  sanitizeLocation,
  toTsQuery,
} from '@/lib/job-filters'

describe('parseFilters / filtersToParams', () => {
  it('parses an empty query string to empty filters', () => {
    expect(parseFilters(new URLSearchParams())).toEqual(EMPTY_FILTERS)
  })

  it('round-trips every filter', () => {
    const filters = {
      ...EMPTY_FILTERS,
      q: 'react',
      minPay: 150_000,
      location: 'New York',
      remote: true,
      levels: ['mid' as const, 'senior' as const],
    }
    expect(parseFilters(filtersToParams(filters))).toEqual(filters)
  })

  it('drops unknown levels and invalid pay', () => {
    const params = new URLSearchParams('level=senior,wizard&pay=lots')
    expect(parseFilters(params)).toMatchObject({ levels: ['senior'], minPay: null })
  })

  it('writes levels in pipeline order and leaves empty filters out', () => {
    const params = filtersToParams({ ...EMPTY_FILTERS, q: '  ', levels: ['lead', 'entry'] })
    expect(params.toString()).toBe('level=entry%2Clead')
  })
})

describe('activeFilterCount', () => {
  it('counts filters but not the keyword', () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, q: 'react' })).toBe(0)
    expect(
      activeFilterCount({ ...EMPTY_FILTERS, q: '', minPay: 80_000, location: 'Austin', remote: true, levels: ['mid', 'senior'] }),
    ).toBe(4)
  })
})

describe('toTsQuery', () => {
  it('returns null when nothing is searchable', () => {
    expect(toTsQuery('')).toBeNull()
    expect(toTsQuery('  & | ! ')).toBeNull()
  })

  it('requires every word and prefix-matches the last one', () => {
    expect(toTsQuery('Senior  Frontend')).toBe('senior & frontend:*')
  })

  it('does not prefix-match a single letter', () => {
    expect(toTsQuery('go c')).toBe('go & c')
  })

  it('strips tsquery operators but keeps word-internal punctuation', () => {
    expect(toTsQuery("node.js (full-stack) 'c++'")).toBe('node.js & full-stack & c++:*')
    expect(toTsQuery('react!')).toBe('react:*')
  })
})

describe('hourlyThreshold', () => {
  it('rounds up to a whole hourly rate', () => {
    expect(hourlyThreshold(100_000)).toBe(49) // 48.08/hr
    expect(hourlyThreshold(104_000)).toBe(50)
  })
})

describe('sanitizeLocation', () => {
  it('keeps place names and drops PostgREST and LIKE syntax', () => {
    expect(sanitizeLocation('  New York,  NY ')).toBe('New York, NY')
    expect(sanitizeLocation('São Paulo')).toBe('São Paulo')
    expect(sanitizeLocation('a%b_c*(d)"e"')).toBe('abcde')
  })
})
