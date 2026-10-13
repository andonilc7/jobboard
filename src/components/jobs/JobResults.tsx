import { CircleDash, Search, WarningAlt } from '@carbon/icons-react'

import { JobCard } from '@/components/jobs/JobCard'
import { JobCardSkeleton } from '@/components/jobs/JobCardSkeleton'
import { EmptyState } from '@/components/layout/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { filterError } from '@/lib/search-ranges'
import { activeFilterCount, type JobFilters } from '@/lib/job-filters'
import { useJobSearch } from '@/lib/queries/jobs'

const SKELETONS = 5

/** The job search result list with its loading, empty and error states. */
export function JobResults({ filters, onClearAll }: { filters: JobFilters; onClearAll: () => void }) {
  const search = useJobSearch(filters)
  const jobs = search.data?.pages.flatMap((page) => page.jobs) ?? []
  const total = search.data?.pages[0]?.total ?? 0
  const filtered = Boolean(filters.q) || activeFilterCount(filters) > 0

  const invalid = filterError(filters)
  if (invalid) return <p role="alert" className="mt-6 text-sm text-destructive">{invalid}</p>

  if (search.isPending) {
    return (
      <div className="mt-6" aria-busy="true" aria-label="Loading jobs">
        <Skeleton className="mb-3 h-4 w-24" />
        <div className="divide-y border-y">
          {Array.from({ length: SKELETONS }, (_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (search.isError && jobs.length === 0) {
    return (
      <EmptyState
        tone="error"
        icon={WarningAlt}
        title="We couldn't load jobs"
        description="Check your connection and try again."
        action={<Button onClick={() => void search.refetch()}>Try again</Button>}
        className="mt-6 border-y"
      />
    )
  }

  if (total === 0) {
    return (
      <EmptyState
        icon={Search}
        title={filtered ? 'No jobs match your search' : 'No open jobs yet'}
        description={
          filtered
            ? 'Try a broader keyword or fewer filters.'
            : 'New roles are posted every week. Check back soon.'
        }
        action={
          filtered && (
            <Button variant="outline" onClick={onClearAll}>
              Clear search and filters
            </Button>
          )
        }
        className="mt-6 border-y"
      />
    )
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2 meta text-muted-foreground" aria-live="polite">
        <span>
          <span className="text-foreground">{total}</span> {total === 1 ? 'open role' : 'open roles'}
        </span>
        {search.isFetching && !search.isFetchingNextPage && (
          <CircleDash className="size-3.5 animate-spin" aria-label="Updating results" />
        )}
      </div>
      <div className="divide-y border-y">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
      {search.hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => void search.fetchNextPage()}
            disabled={search.isFetchingNextPage}
          >
            {search.isFetchingNextPage && <CircleDash className="animate-spin" />}
            Show more roles
          </Button>
        </div>
      )}
    </div>
  )
}
