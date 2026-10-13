import { describe, expect, it } from 'vitest'

import { parseDescription } from '@/lib/description'
import {
  countApplicants,
  countPostingTabs,
  DESCRIPTION_TEMPLATE,
  EMPTY_POSTING,
  parsePostingTab,
  postingActions,
  postingHref,
  postingSchema,
  sortPostings,
  toPostingFields,
  toPostingValues,
  type PostingInput,
} from '@/lib/postings'

const valid: PostingInput = {
  ...EMPTY_POSTING,
  title: '  Senior Frontend Engineer ',
  city: 'San Francisco',
  state: 'CA',
  payMin: 160_000,
  payMax: 200_000,
  description: 'You will build the product our customers use every day. '.repeat(3),
  skills: ['React'],
}

const errorsFor = (input: PostingInput) => {
  const result = postingSchema.safeParse(input)
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]))
}

describe('postingSchema', () => {
  it('accepts a complete posting and trims text', () => {
    const result = postingSchema.parse(valid)
    expect(result.title).toBe('Senior Frontend Engineer')
    expect(result.payMin).toBe(160_000)
  })

  it('requires a title, location, pay and a real description', () => {
    const errors = errorsFor(EMPTY_POSTING)
    expect(Object.keys(errors).sort()).toEqual(['description', 'payMax', 'payMin', 'title'])
    expect(errors.payMin).toBe('Required')
  })

  it('treats whitespace-only text as missing', () => {
    expect(errorsFor({ ...valid, title: '   ' }).title).toBeDefined()
  })

  it('rejects a max below the min', () => {
    expect(errorsFor({ ...valid, payMin: 200_000, payMax: 150_000 }).payMax).toBe('Must be at least the minimum')
  })

  it('allows a single figure (min = max)', () => {
    expect(errorsFor({ ...valid, payMin: 150_000, payMax: 150_000 })).toEqual({})
  })

  it('rejects negative and fractional pay', () => {
    expect(errorsFor({ ...valid, payMin: -1 }).payMin).toBe("Pay can't be negative")
    expect(errorsFor({ ...valid, payMin: 100_000.5 }).payMin).toBe('Enter a whole number')
  })

  it('catches pay typed into the wrong period', () => {
    expect(errorsFor({ ...valid, payPeriod: 'hour' }).payMax).toMatch(/annual salary/)
    expect(errorsFor({ ...valid, payMin: 40, payMax: 55 }).payMin).toMatch(/hourly rate/)
    expect(errorsFor({ ...valid, payPeriod: 'hour', payMin: 40, payMax: 55 })).toEqual({})
  })

  it('caps skills', () => {
    const skills = Array.from({ length: 16 }, (_, i) => `Skill ${i}`)
    expect(errorsFor({ ...valid, skills }).skills).toBeDefined()
  })
})

describe('toPostingFields / toPostingValues', () => {
  it('round-trips a job through the form', () => {
    const fields = toPostingFields(postingSchema.parse(valid))
    expect(fields).toMatchObject({
      title: 'Senior Frontend Engineer',
      pay_min: 160_000,
      pay_max: 200_000,
      pay_period: 'year',
      experience_level: 'mid',
      employment_type: 'full_time',
      is_remote: false,
    })
    expect(toPostingFields(postingSchema.parse(toPostingValues(fields)))).toEqual(fields)
  })

  it('only produces columns recruiters may write', () => {
    expect(Object.keys(toPostingFields(postingSchema.parse(valid))).sort()).toEqual([
      'city',
      'description',
      'employment_type',
      'experience_level',
      'is_remote',
      'location',
      'max_yoe',
      'min_yoe',
      'pay_max',
      'pay_min',
      'pay_period',
      'questions',
      'skills',
      'state',
      'title',
    ])
  })
})

describe('DESCRIPTION_TEMPLATE', () => {
  it('renders as a paragraph, headings and lists on the job page', () => {
    expect(parseDescription(DESCRIPTION_TEMPLATE).map((b) => b.type)).toEqual([
      'paragraph',
      'heading',
      'list',
      'heading',
      'list',
    ])
  })
})

describe('postingActions', () => {
  it('mirrors the database rules', () => {
    expect(postingActions('draft', 0)).toEqual(['publish', 'delete'])
    expect(postingActions('open', 0)).toEqual(['close', 'unpublish'])
    expect(postingActions('open', 3)).toEqual(['close'])
    expect(postingActions('closed', 3)).toEqual(['reopen'])
  })
})

describe('dashboard helpers', () => {
  it('parses tabs from the URL', () => {
    expect(parsePostingTab('draft')).toBe('draft')
    expect(parsePostingTab('nope')).toBe('all')
    expect(parsePostingTab(null)).toBe('all')
  })

  it('counts postings per tab', () => {
    expect(countPostingTabs([{ status: 'open' }, { status: 'open' }, { status: 'closed' }])).toEqual({
      all: 3,
      open: 2,
      draft: 0,
      closed: 1,
    })
  })

  it('sorts open, then drafts, then closed, most recently updated first', () => {
    const sorted = sortPostings([
      { id: 'closed', status: 'closed' as const, updated_at: '2026-10-03T00:00:00Z' },
      { id: 'old-open', status: 'open' as const, updated_at: '2026-09-01T00:00:00Z' },
      { id: 'draft', status: 'draft' as const, updated_at: '2026-10-04T00:00:00Z' },
      { id: 'new-open', status: 'open' as const, updated_at: '2026-10-01T00:00:00Z' },
    ])
    expect(sorted.map((p) => p.id)).toEqual(['new-open', 'old-open', 'draft', 'closed'])
  })

  it('counts applicants by status', () => {
    const counts = countApplicants([
      { status: 'applied' },
      { status: 'applied' },
      { status: 'interviewing' },
      { status: 'rejected' },
      { status: 'offer' },
    ])
    expect(counts).toMatchObject({ total: 5, active: 3, applied: 2, interviewing: 1, offer: 1, rejected: 1 })
  })
})

describe('postingHref', () => {
  it('links drafts to the editor and everything else to the pipeline', () => {
    expect(postingHref({ id: 'a', status: 'draft' })).toBe('/postings/a/edit')
    expect(postingHref({ id: 'a', status: 'closed' })).toBe('/postings/a')
  })
})
