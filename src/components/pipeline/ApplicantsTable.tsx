import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoveMenu } from '@/components/pipeline/MoveMenu'
import { ApplicationStatusBadge } from '@/components/applications/ApplicationStatusBadge'
import type { Applicant } from '@/lib/api/pipeline'
import { APPLICATION_STATUSES } from '@/lib/constants'
import { candidateName } from '@/lib/pipeline'
import { applicantFilterError, EMPTY_APPLICANT_FILTERS, matchesApplicant, yearsOfExperience, type ApplicantFilters } from '@/lib/applicant-table'
import type { ApplicationStatus } from '@/lib/types'

export function ApplicantsTable({ applicants, onOpen, onMove, pendingId }: {
  applicants: Applicant[]; onOpen: (applicant: Applicant) => void;
  onMove: (applicant: Applicant, target: ApplicationStatus) => void; pendingId?: string
}) {
  const [filters, setFilters] = useState<ApplicantFilters>(EMPTY_APPLICANT_FILTERS)
  const error = applicantFilterError(filters)
  const rows = applicants.map((applicant) => ({ applicant, name: candidateName(applicant),
    yoe: applicant.candidate ? yearsOfExperience(applicant.candidate.experiences) : null,
    created_at: applicant.created_at, status: applicant.status }))
    .filter((row) => matchesApplicant(row, filters))
  const change = (key: keyof ApplicantFilters, value: string) => setFilters((prev) => ({ ...prev, [key]: value }))
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {([
        ['name', 'Name', 'search'], ['minYoe', 'Minimum YOE', 'number'], ['maxYoe', 'Maximum YOE', 'number'],
        ['from', 'Applied from', 'date'], ['to', 'Applied through', 'date'],
      ] as const).map(([key, label, type]) => <div key={key} className="grid gap-1.5">
        <Label htmlFor={`applicants-${key}`}>{label}</Label>
        <Input id={`applicants-${key}`} type={type} min={type === 'number' ? 0 : undefined}
          max={type === 'number' ? 100 : undefined} step={type === 'number' ? 0.5 : undefined}
          value={filters[key]} onChange={(event) => change(key, event.target.value)} />
      </div>)}
      <div className="grid gap-1.5"><Label htmlFor="applicants-status">Status</Label>
        <select id="applicants-status" value={filters.status} onChange={(event) => change('status', event.target.value)}
          className="h-9 border bg-background px-2 text-sm focus-visible:ring-1 focus-visible:ring-ring">
          <option value="">All statuses</option>
          {Object.entries(APPLICATION_STATUSES).map(([value, info]) => <option key={value} value={value}>{info.label}</option>)}
        </select>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground" aria-live="polite">{rows.length} of {applicants.length} applicants</p>
      <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_APPLICANT_FILTERS)}>Clear filters</Button>
    </div>
    <p className="text-xs text-muted-foreground">YOE is calculated from work history without double-counting overlapping months. Dates use your local time zone.</p>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : <div className="overflow-x-auto border">
      <table className="w-full min-w-[600px] text-left text-sm">
        <caption className="sr-only">Applicants for this posting</caption>
        <thead className="border-b bg-muted/40"><tr>{['Name', 'Years of experience', 'Date applied', 'Status', 'Change status'].map((label) =>
          <th key={label} scope="col" className="p-3 font-medium">{label}</th>)}</tr></thead>
        <tbody>{rows.map(({ applicant, name, yoe }) => <tr key={applicant.id} className="border-b last:border-0">
          <td className="p-3"><button className="text-left font-medium underline underline-offset-4 focus-visible:ring-1 focus-visible:ring-ring" onClick={() => onOpen(applicant)}>{name}</button></td>
          <td className="p-3 tabular-nums">{yoe === null ? 'Unavailable' : yoe.toFixed(1)}</td>
          <td className="p-3">{new Date(applicant.created_at).toLocaleDateString()}</td>
          <td className="p-3"><ApplicationStatusBadge status={applicant.status} /></td>
          <td className="p-3"><MoveMenu status={applicant.status} name={name} onMove={(target) => onMove(applicant, target)} disabled={pendingId === applicant.id} /></td>
        </tr>)}</tbody>
      </table>
      {!rows.length && <p className="p-8 text-center text-muted-foreground">No applicants match these filters.</p>}
    </div>}
  </div>
}
