import { useState } from 'react'
import { ArrowRight, CheckmarkOutline, Locked } from '@carbon/icons-react'
import { Link, useLocation } from 'react-router'

import { ApplicationStatusBadge } from '@/components/applications/ApplicationStatusBadge'
import { ApplyDialog } from '@/components/jobs/ApplyDialog'
import { PostedAt } from '@/components/jobs/PostedAt'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import type { JobWithCompany } from '@/lib/api/jobs'
import { APPLICATION_STATUSES } from '@/lib/constants'
import { useMyApplication } from '@/lib/queries/applications'

/** Sign in, apply, or see where your application stands, depending on who is looking. */
export function ApplyAction({ job }: { job: JobWithCompany }) {
  const { status, profile } = useAuth()
  const location = useLocation()
  const seekerId = profile?.role === 'seeker' ? profile.id : undefined
  const application = useMyApplication(job.id, seekerId)
  const [open, setOpen] = useState(false)

  if (status === 'loading' || (seekerId && application.isPending)) {
    return <Skeleton className="h-11 w-full" />
  }

  if (!profile) {
    return (
      <div className="grid gap-2">
        <Button asChild size="lg" className="w-full">
          <Link to="/sign-in" state={{ from: location.pathname }}>
            Sign in to apply
          </Link>
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New here?{' '}
          <Link to="/sign-up?role=seeker" className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
            Create a free account
          </Link>
        </p>
      </div>
    )
  }

  if (profile.role === 'recruiter') {
    return (
      <p className="flex gap-2 border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
        <Locked className="mt-0.5 size-4 shrink-0" />
        You're signed in as a recruiter. Applying needs a job seeker account.
      </p>
    )
  }

  if (application.data) {
    const { status: appStatus, created_at } = application.data
    return (
      <div className="grid gap-3">
        <div className="border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium">
              <CheckmarkOutline className="size-4 text-success" /> Applied
            </span>
            <ApplicationStatusBadge status={appStatus} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {APPLICATION_STATUSES[appStatus].description} ·{' '}
            <PostedAt date={created_at} prefix="sent" />
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link to="/applications">
            Track your applications <ArrowRight />
          </Link>
        </Button>
      </div>
    )
  }

  if (application.isError) {
    return (
      <div className="grid gap-2">
        <p className="text-sm text-muted-foreground">We couldn't check whether you've applied.</p>
        <Button variant="outline" className="w-full" onClick={() => void application.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (job.status !== 'open') {
    return (
      <p className="border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
        This role is no longer accepting applications.
      </p>
    )
  }

  return (
    <>
      <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
        Apply now
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Answer application questions and add an optional cover note on the next step.
      </p>
      <ApplyDialog job={job} seekerId={profile.id} open={open} onOpenChange={setOpen} />
    </>
  )
}
