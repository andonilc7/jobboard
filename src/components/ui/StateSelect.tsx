import { US_STATES } from '@/lib/location'

export function StateSelect({ id, value, onChange, optional = false, invalid = false }: {
  id: string; value: string; onChange: (value: string) => void; optional?: boolean; invalid?: boolean
}) {
  return <select id={id} value={value} onChange={(event) => onChange(event.target.value)}
    aria-invalid={invalid} className="h-9 w-full border border-input bg-background px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring">
    <option value="">{optional ? 'Any state' : 'Choose state'}</option>
    {Object.entries(US_STATES).map(([code, name]) => <option key={code} value={code}>{name} ({code})</option>)}
  </select>
}
