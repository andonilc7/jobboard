import { FilterCheckbox } from '@/components/jobs/FilterCheckbox'
import { PayRangeFilter } from '@/components/jobs/PayRangeFilter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StateSelect } from '@/components/ui/StateSelect'
import { EXPERIENCE_LEVELS } from '@/lib/constants'
import { activeFilterCount, type JobFilters } from '@/lib/job-filters'

/**
 * R5: pay, location / remote and experience level. `filters.location` is the live input value;
 * the page debounces it into the URL.
 */
export function JobFiltersPanel({
  filters,
  onChange,
  onClear,
  idPrefix = 'filters',
}: {
  filters: JobFilters
  onChange: (patch: Partial<JobFilters>) => void
  onClear: () => void
  /** Keeps input ids unique when the panel renders twice (sidebar and mobile sheet). */
  idPrefix?: string
}) {
  const hasFilters = activeFilterCount(filters) > 0

  return (
    <div className="grid gap-8">
      <PayRangeFilter minPay={filters.minPay} maxPay={filters.maxPay} onChange={onChange} idPrefix={idPrefix} />
      <fieldset className="grid gap-2">
        <legend className="mb-2 meta text-muted-foreground">Years of experience</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['minYoe', 'maxYoe'] as const).map((key, index) => <div key={key} className="grid gap-1">
            <Label htmlFor={`${idPrefix}-${key}`} className="text-xs">{index === 0 ? 'Minimum' : 'Maximum'}</Label>
            <Input id={`${idPrefix}-${key}`} type="number" min={0} max={60} step={0.5}
              value={filters[key] ?? ''} placeholder="Any" onChange={(event) => {
                const value = event.target.value === '' ? null : Number(event.target.value)
                if (value === null || (Number.isFinite(value) && value >= 0 && value <= 60)) onChange({ [key]: value })
              }} />
          </div>)}
        </div>
        <p className="text-xs text-muted-foreground">Matches overlapping experience ranges; postings without numeric requirements are excluded.</p>
      </fieldset>
      <section className="grid gap-2">
        <Label htmlFor={`${idPrefix}-city`} className="meta text-muted-foreground">City</Label>
        <Input id={`${idPrefix}-city`} value={filters.city} placeholder="San Francisco"
          onChange={(event) => onChange({ city: event.target.value })} autoComplete="address-level2" />
        <Label htmlFor={`${idPrefix}-state`} className="meta text-muted-foreground">State</Label>
        <StateSelect id={`${idPrefix}-state`} value={filters.state} onChange={(state) => onChange({ state })} optional />
        <FilterCheckbox checked={filters.remote} onCheckedChange={(remote) => onChange({ remote })}>
          {filters.city.trim() || filters.state || filters.location ? 'Include remote roles' : 'Remote only'}
        </FilterCheckbox>
      </section>

      <section className="grid gap-2">
        <h3 id={`${idPrefix}-level`} className="meta text-muted-foreground">
          Experience level
        </h3>
        <div role="group" aria-labelledby={`${idPrefix}-level`} className="-mx-2 grid gap-0.5">
          {EXPERIENCE_LEVELS.map((level) => (
            <FilterCheckbox
              key={level.value}
              checked={filters.levels.includes(level.value)}
              onCheckedChange={(checked) =>
                onChange({
                  levels: checked
                    ? [...filters.levels, level.value]
                    : filters.levels.filter((l) => l !== level.value),
                })
              }
            >
              {level.label}
            </FilterCheckbox>
          ))}
        </div>
      </section>

      {hasFilters && (
        <Button variant="outline" size="sm" onClick={onClear} className="justify-self-start">
          Clear filters
        </Button>
      )}
    </div>
  )
}
