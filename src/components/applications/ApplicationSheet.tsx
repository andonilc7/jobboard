import { useState } from 'react'
import { QuestionResponses } from '@/components/applications/QuestionResponses'
import { ArrowUpRight } from '@carbon/icons-react'
import { Link } from 'react-router'

import { ApplicationProgress } from '@/components/applications/ApplicationProgress'
import { ApplicationStatusBadge } from '@/components/applications/ApplicationStatusBadge'
import { ApplicationTimeline } from '@/components/applications/ApplicationTimeline'
import { JobMark } from '@/components/applications/JobMark'
import { SentResume } from '@/components/applications/SentResume'
import { WithdrawDialog } from '@/components/applications/WithdrawDialog'
import { PostedAt } from '@/components/jobs/PostedAt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { MyApplication } from '@/lib/api/applications'
import { canWithdraw } from '@/lib/applications'
import { APPLICATION_STATUSES, JOB_STATUSES, PIPELINE } from '@/lib/constants'

/** R8: one application in full: where it stands, its timeline, and what was sent. */
export function ApplicationSheet({
  application,
  seekerId,
  open,
  onOpenChange,
}: {
  application: MyApplication | undefined
  seekerId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  if (!application) return null
  const { job } = application

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="gap-3 border-b p-5 pr-12">
          <JobMark job={job} className="size-11 text-lg" />
          <div className="space-y-1">
            <SheetTitle className="text-2xl leading-tight">{job?.title ?? 'Role no longer listed'}</SheetTitle>
            <SheetDescription>
              {job ? `${job.company.name} · ${job.location}` : 'This posting is no longer available.'}
            </SheetDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ApplicationStatusBadge status={application.status} />
            {job && job.status !== 'open' && (
              <Badge variant="outline">Job {JOB_STATUSES[job.status].label.toLowerCase()}</Badge>
            )}
            <span className="meta text-muted-foreground">
              <PostedAt date={application.created_at} prefix="Applied" />
            </span>
          </div>
        </SheetHeader>

        <div className="space-y-7 p-5">
          <section aria-labelledby="progress-heading" className="space-y-2">
            <h3 id="progress-heading" className="meta text-muted-foreground">
              Progress
            </h3>
            <ApplicationProgress status={application.status} events={application.events} />
            <ol className="grid grid-cols-4 gap-1 text-xs text-muted-foreground">
              {PIPELINE.map((step) => (
                <li key={step} className="truncate">
                  {APPLICATION_STATUSES[step].label}
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="timeline-heading" className="space-y-3">
            <h3 id="timeline-heading" className="meta text-muted-foreground">
              Timeline
            </h3>
            <ApplicationTimeline events={application.events} seekerId={seekerId} />
          </section>

          <section aria-labelledby="resume-heading" className="space-y-3">
            <h3 id="resume-heading" className="meta text-muted-foreground">
              Resume sent
            </h3>
            <SentResume path={application.resume_path} seekerId={seekerId} />
          </section>

          <QuestionResponses value={application.answers} />

          {application.cover_note && (
            <section aria-labelledby="note-heading" className="space-y-2">
              <h3 id="note-heading" className="meta text-muted-foreground">
                Cover note
              </h3>
              <p className="border bg-muted/40 p-3 font-serif text-[15px] leading-relaxed whitespace-pre-line">
                {application.cover_note}
              </p>
            </section>
          )}
        </div>

        <div className="mt-auto flex flex-col-reverse gap-2 border-t p-5 sm:flex-row sm:justify-between">
          {canWithdraw(application.status) ? (
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setWithdrawOpen(true)}
            >
              Withdraw application
            </Button>
          ) : (
            <span />
          )}
          {job && (
            <Button asChild variant="outline">
              <Link to={`/jobs/${job.id}`}>
                View job <ArrowUpRight />
              </Link>
            </Button>
          )}
        </div>

        <WithdrawDialog
          application={application}
          seekerId={seekerId}
          open={withdrawOpen}
          onOpenChange={setWithdrawOpen}
        />
      </SheetContent>
    </Sheet>
  )
}
