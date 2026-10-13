import { ArrowLeft, Launch, Location, Search, WarningAlt } from '@carbon/icons-react'
import { Link, useLocation, useParams } from 'react-router'

import { ApplyCard } from '@/components/jobs/ApplyCard'
import { CompanyMark } from '@/components/jobs/CompanyMark'
import { JobBadges } from '@/components/jobs/JobBadges'
import { JobDescription } from '@/components/jobs/JobDescription'
import { JobDetailSkeleton } from '@/components/jobs/JobDetailSkeleton'
import { PostedAt } from '@/components/jobs/PostedAt'
import { EmptyState } from '@/components/layout/EmptyState'
import { SetupNotice } from '@/components/layout/SetupNotice'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { JOB_STATUSES } from '@/lib/constants'
import { displayUrl } from '@/lib/format'
import { useJob } from '@/lib/queries/jobs'
import { isSupabaseConfigured } from '@/lib/supabase'

/** R7: the full posting, and applying to it. */
export function JobDetailPage() {
  const { jobId } = useParams()
  const location = useLocation()
  const job = useJob(jobId)
  // Set by JobCard, so "back" returns to the same search and filters.
  const backSearch = (location.state as { search?: string } | null)?.search ?? ''

  if (!isSupabaseConfigured) return <SetupNotice />
  if (job.isPending) return <JobDetailSkeleton />

  if (job.isError) {
    return (
      <EmptyState
        tone="error"
        icon={WarningAlt}
        title="We couldn't load this job"
        description="Check your connection and try again."
        action={<Button onClick={() => void job.refetch()}>Try again</Button>}
      />
    )
  }

  if (!job.data) {
    return (
      <EmptyState
        icon={Search}
        title="This job isn't available"
        description="It may have been filled or taken down. There are plenty more where it came from."
        action={
          <Button asChild variant="outline">
            <Link to="/jobs">Browse open roles</Link>
          </Button>
        }
      />
    )
  }

  const { company, ...posting } = job.data

  return (
    <article>
      <Link
        to={`/jobs${backSearch}`}
        className="inline-flex items-center gap-1.5 meta text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ArrowLeft className="size-3.5" /> {backSearch ? 'Back to results' : 'All open roles'}
      </Link>

      <header className="mt-6 grid gap-5 border-b pb-8 sm:grid-cols-[auto_1fr] sm:gap-6">
        <CompanyMark name={company.name} className="size-14 text-xl sm:size-16" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-headline">{posting.title}</h1>
            {posting.status !== 'open' && (
              <Badge variant={JOB_STATUSES[posting.status].tone}>{JOB_STATUSES[posting.status].label}</Badge>
            )}
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-muted-foreground">
            <span className="font-medium text-foreground">{company.name}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Location className="size-4" /> {posting.location}
            </span>
            <span aria-hidden>·</span>
            <PostedAt date={posting.created_at} />
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <JobBadges job={posting} />
            {(posting.min_yoe !== null || posting.max_yoe !== null) && <Badge variant="outline">
              {posting.min_yoe ?? 0}–{posting.max_yoe ?? 'any'} years of experience
            </Badge>}
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <aside className="lg:col-start-2 lg:row-start-1">
          <div className="space-y-8 lg:sticky lg:top-22">
            <ApplyCard job={job.data} />
            <section className="border-t pt-5">
              <h2 className="meta text-muted-foreground">About {company.name}</h2>
              {company.description && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{company.description}</p>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline decoration-border underline-offset-4 hover:decoration-foreground"
                >
                  {displayUrl(company.website)} <Launch className="size-3.5" />
                </a>
              )}
            </section>
          </div>
        </aside>

        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <JobDescription text={posting.description} />
          {posting.skills.length > 0 && (
            <section className="mt-10 border-t pt-5">
              <h2 className="meta text-muted-foreground">Skills</h2>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {posting.skills.map((skill) => (
                  <li key={skill} className="border px-2 py-0.5 text-sm">
                    {skill}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </article>
  )
}
