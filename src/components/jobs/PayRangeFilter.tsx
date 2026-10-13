import { Slider } from 'radix-ui'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HOURS_PER_YEAR } from '@/lib/constants'
import type { JobFilters } from '@/lib/job-filters'

const MAX_PAY = 5_000_000
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function PayRangeFilter({
  minPay,
  maxPay,
  onChange,
  idPrefix,
}: Pick<JobFilters, 'minPay' | 'maxPay'> & {
  onChange: (patch: Partial<JobFilters>) => void
  idPrefix: string
}) {
  // Keep ordinary salaries easy to select, extending the track for larger typed amounts.
  const ceiling = Math.min(MAX_PAY, Math.max(300_000, Math.ceil((Math.max(minPay ?? 0, maxPay ?? 0) + 1) / 50_000) * 50_000))
  const inverted = minPay !== null && maxPay !== null && minPay > maxPay
  const values = [Math.min(minPay ?? 0, maxPay ?? ceiling), maxPay ?? ceiling]
  const hintId = `${idPrefix}-pay-hint`

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 meta text-muted-foreground">Annual pay range ($)</legend>
      <Slider.Root
        className="relative mx-2 flex h-10 touch-none select-none items-center disabled:opacity-50 data-[disabled]:opacity-50"
        min={0}
        max={ceiling}
        step={1000}
        value={values}
        disabled={inverted}
        onValueChange={([minimum, maximum]) => {
          const patch: Partial<JobFilters> = {}
          // Moving one handle leaves the other bound (including an unset bound) alone.
          if (minimum !== values[0]) patch.minPay = minimum === 0 ? null : minimum
          if (maximum !== values[1]) patch.maxPay = maximum === ceiling ? null : maximum
          onChange(patch)
        }}
      >
        <Slider.Track className="relative h-1 w-full bg-muted">
          <Slider.Range className="absolute h-full bg-primary" />
        </Slider.Track>
        <Slider.Thumb
          aria-label="Minimum annual pay"
          aria-valuetext={minPay === null ? 'No minimum' : money.format(minPay)}
          aria-describedby={hintId}
          className="block size-5 cursor-grab border border-primary bg-background outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:cursor-grabbing"
        />
        <Slider.Thumb
          aria-label="Maximum annual pay"
          aria-valuetext={maxPay === null ? 'No maximum' : money.format(maxPay)}
          aria-describedby={hintId}
          className="block size-5 cursor-grab border border-primary bg-background outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:cursor-grabbing"
        />
      </Slider.Root>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>$0</span>
        <span>No maximum</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(['minPay', 'maxPay'] as const).map((key, index) => (
          <div key={key} className="grid gap-1">
            <Label htmlFor={`${idPrefix}-${key}`} className="text-xs">{index === 0 ? 'Minimum' : 'Maximum'}</Label>
            <Input
              id={`${idPrefix}-${key}`}
              type="number"
              min={0}
              max={MAX_PAY}
              step={1000}
              value={(key === 'minPay' ? minPay : maxPay) ?? ''}
              placeholder="Any"
              onChange={(event) => {
                const value = event.target.value === '' ? null : Number(event.target.value)
                if (value === null || (Number.isFinite(value) && value >= 0 && value <= MAX_PAY)) onChange({ [key]: value })
              }}
            />
          </div>
        ))}
      </div>
      <p id={hintId} className="text-xs text-muted-foreground">
        Drag either handle or enter exact amounts. The right edge removes the maximum.
        {' '}Matches overlapping pay ranges. Hourly pay is annualized at {HOURS_PER_YEAR.toLocaleString()} hours.
      </p>
    </fieldset>
  )
}
