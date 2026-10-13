import { describe, expect, it } from 'vitest'
import { citySchema, stateSchema, splitLocation } from '@/lib/location'
import { EMPTY_POSTING, postingSchema } from '@/lib/postings'

const posting = { ...EMPTY_POSTING, title: 'Engineer', city: 'Austin', state: 'TX', payMin: 90_000, payMax: 120_000,
  description: 'Build reliable software and collaborate with a team of engineers on customer-facing applications.' }

describe('structured locations and posting ranges', () => {
  it('validates state and city format', () => {
    expect(stateSchema.safeParse('XX').success).toBe(false)
    expect(citySchema.safeParse('1234').success).toBe(false)
    expect(citySchema.safeParse("St. John's").success).toBe(true)
    expect(splitLocation('San Francisco, CA')).toEqual({ city: 'San Francisco', state: 'CA' })
  })
  it('requires both location fields for on-site jobs; allows fully remote jobs', () => {
    expect(postingSchema.safeParse({ ...posting, state: '' }).success).toBe(false)
    expect(postingSchema.safeParse({ ...posting, city: '', state: '', isRemote: true }).success).toBe(true)
    expect(postingSchema.safeParse({ ...posting, city: '', state: '', isRemote: false }).success).toBe(false)
  })
  it('rejects inverted numeric experience ranges', () => {
    expect(postingSchema.safeParse({ ...posting, minYoe: 5, maxYoe: 2 }).success).toBe(false)
    expect(postingSchema.safeParse({ ...posting, minYoe: 0, maxYoe: 0 }).success).toBe(true)
  })
})
