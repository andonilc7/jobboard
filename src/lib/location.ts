import { z } from 'zod'

export const US_STATES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
} as const

export const citySchema = z.string().trim().min(2, 'Enter a city').max(80, 'Keep it under 80 characters')
  .regex(/^[\p{L}][\p{L} .'-]*$/u, 'Use letters, spaces, apostrophes, periods or hyphens')
export const stateSchema = z.string().refine((value) => Object.hasOwn(US_STATES, value), 'Choose a US state')
export function formatLocation(city: string, state: string) { return [city.trim(), state].filter(Boolean).join(', ') }
export function splitLocation(location: string | null | undefined) {
  const parts = (location ?? '').split(',').map((part) => part.trim())
  const state = parts.pop() ?? ''
  return Object.hasOwn(US_STATES, state) ? { city: parts.join(', '), state } : { city: '', state: '' }
}
