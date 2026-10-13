import { US_STATES } from '@/lib/location'
import { EXPERIENCE_LEVELS, HOURS_PER_YEAR } from '@/lib/constants'
import type { ExperienceLevel } from '@/lib/types'

/** R4/R5: everything the job search can filter on. Mirrored in the URL so searches are shareable. */
export type JobFilters = {
  /** Keyword search over title and description. */
  q: string
  /** Minimum annual pay. Hourly roles are compared at {@link HOURS_PER_YEAR} hours a year. */
  minPay: number | null
  maxPay: number | null
  minYoe: number | null
  maxYoe: number | null
  city: string
  state: string
  /** Free-text location, matched against the job's location. */
  location: string
  /** Include remote roles. On its own it means "remote only"; with a location it means "there or remote". */
  remote: boolean
  levels: ExperienceLevel[]
}

export const EMPTY_FILTERS: JobFilters = { q: '', minPay: null, maxPay: null, minYoe: null, maxYoe: null, city: '', state: '', location: '', remote: false, levels: [] }

export const PAY_OPTIONS = [50_000, 80_000, 100_000, 150_000, 200_000] as const

const LEVEL_VALUES = new Set<string>(EXPERIENCE_LEVELS.map((l) => l.value))

export function parseFilters(params: URLSearchParams): JobFilters {
  const number = (key: string, max: number) => {
    const raw = params.get(key)
    const value = Number(raw)
    return raw !== null && raw.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= max ? value : null
  }
  return {
    q: params.get('q')?.trim() ?? '',
    minPay: number('pay', 5_000_000),
    maxPay: number('maxPay', 5_000_000),
    minYoe: number('minYoe', 60),
    maxYoe: number('maxYoe', 60),
    city: params.get('city')?.trim() ?? '',
    state: Object.hasOwn(US_STATES, params.get('state') ?? '') ? params.get('state')! : '',
    location: params.get('location')?.trim() ?? '',
    remote: params.get('remote') === '1',
    levels: (params.get('level') ?? '')
      .split(',')
      .filter((level): level is ExperienceLevel => LEVEL_VALUES.has(level)),
  }
}

/** The inverse of {@link parseFilters}. Empty filters are left out to keep URLs short. */
export function filtersToParams(filters: JobFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q.trim()) params.set('q', filters.q.trim())
  if (filters.minPay !== null) params.set('pay', String(filters.minPay))
  if (filters.maxPay !== null) params.set('maxPay', String(filters.maxPay))
  if (filters.minYoe !== null) params.set('minYoe', String(filters.minYoe))
  if (filters.maxYoe !== null) params.set('maxYoe', String(filters.maxYoe))
  if (filters.city.trim()) params.set('city', filters.city.trim())
  if (filters.state) params.set('state', filters.state)
  if (filters.location.trim()) params.set('location', filters.location.trim())
  if (filters.remote) params.set('remote', '1')
  // Keep levels in pipeline order so the same filters always produce the same URL.
  const levels = EXPERIENCE_LEVELS.map((l) => l.value).filter((v) => filters.levels.includes(v))
  if (levels.length) params.set('level', levels.join(','))
  return params
}

/** How many filters (not counting the keyword) are active, for the mobile "Filters (n)" button. */
export function activeFilterCount(filters: JobFilters): number {
  return (
    (filters.minPay !== null || filters.maxPay !== null ? 1 : 0) +
    (filters.minYoe !== null || filters.maxYoe !== null ? 1 : 0) +
    (filters.city.trim() || filters.state ? 1 : 0) +
    (filters.location.trim() ? 1 : 0) +
    (filters.remote ? 1 : 0) +
    (filters.levels.length ? 1 : 0)
  )
}

/**
 * Turns what the user typed into a Postgres `to_tsquery` string. Every word must match; the last word
 * also matches as a prefix so results update while typing ("fronten" finds "Frontend").
 * Returns null when nothing searchable is left.
 */
export function toTsQuery(input: string): string | null {
  const words = input
    .toLowerCase()
    // Strip tsquery operators and quoting; keep word-internal punctuation like "node.js" or "full-stack".
    .replace(/[&|!():*<>'"\\]/g, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}+#]+$/gu, ''))
    .filter(Boolean)
  if (words.length === 0) return null
  // Single-letter prefixes ("c:*") would match almost everything.
  const last = words.length - 1
  return words.map((word, i) => (i === last && word.length > 1 ? `${word}:*` : word)).join(' & ')
}

/** The smallest hourly `pay_max` that meets an annual minimum. `pay_max` is an integer column. */
export function hourlyThreshold(minAnnualPay: number): number {
  return Math.ceil(minAnnualPay / HOURS_PER_YEAR)
}

/**
 * Makes a value safe inside a PostgREST `or=(...)` filter: drops characters that are reserved there
 * or act as LIKE wildcards. Locations only need letters, digits, spaces and light punctuation.
 */
export function sanitizeLocation(value: string): string {
  return value.replace(/[^\p{L}\p{N}\s,.'-]/gu, '').replace(/\s+/g, ' ').trim()
}
