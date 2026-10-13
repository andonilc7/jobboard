import type { ReactNode } from 'react'
import { QuestionResponses } from '@/components/applications/QuestionResponses'
import { ArrowLeft, ArrowRight, CircleDash, CloseOutline, Location } from '@carbon/icons-react'

import { ApplicationProgress } from '@/components/applications/ApplicationProgress'
import { ApplicationStatusBadge } from '@/components/applications/ApplicationStatusBadge'
import { ApplicationTimeline } from '@/components/applications/ApplicationTimeline'
import { SentResume } from '@/components/applications/SentResume'
import { PostedAt } from '@/components/jobs/PostedAt'
import { CandidateAvatar } from '@/components/pipeline/CandidateAvatar'
import { MoveMenu } from '@/components/pipeline/MoveMenu'
import { ExperienceItem } from '@/components/profile/ExperienceItem'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import type { Applicant } from '@/lib/api/pipeline'
import { APPLICATION_STATUSES, PIPELINE } from '@/lib/constants'
import { candidateName, moveLabel, nextStatus, previousStatus, recruiterTargets } from '@/lib/pipeline'
import { sortExperiences } from '@/lib/profile'
import { useExperiences } from '@/lib/queries/seekers'
import type { ApplicationStatus } from '@/lib/types'

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3">
      <h3 id={`${id}-heading`} className="meta text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

function Experience({ seekerId }: { seekerId: string }) {
  const experiences = useExperiences(seekerId)
  if (experiences.isPending) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading experience">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    )
  }
  if (experiences.isError) {
    return <p className="text-sm text-muted-foreground">We couldn't load their experience.</p>
  }
  if (experiences.data.length === 0) {
    return <p className="text-sm text-muted-foreground">No work history added.</p>
  }
  return (
    <ul className="divide-y">
      {sortExperiences(experiences.data).map((experience) => (
        <ExperienceItem key={experience.id} experience={experience} />
      ))}
    </ul>
  )
}

/** R12: everything about one candidate for this posting, and R13: moving them on. */
export function CandidateSheet({
  applicant,
  open,
  onOpenChange,
  onMove,
  pending,
}: {
  applicant: Applicant | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onMove: (target: ApplicationStatus) => void
  pending: boolean
}) {
  if (!applicant) return null
  const name = candidateName(applicant)
  const seeker = applicant.candidate?.seeker
  const next = nextStatus(applicant.status)
  const back = previousStatus(applicant.status, applicant.events)
  const canMove = recruiterTargets(applicant.status).length > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="gap-3 border-b p-5 pr-12">
          <div className="flex items-center gap-3">
            <CandidateAvatar name={name} className="size-11" />
            <div className="min-w-0 space-y-0.5">
              <SheetTitle className="text-2xl leading-tight">{name}</SheetTitle>
              <SheetDescription className="line-clamp-2">{seeker?.headline || 'No headline'}</SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 meta text-muted-foreground">
            <ApplicationStatusBadge status={applicant.status} />
            {seeker?.location && (
              <span className="inline-flex items-center gap-1">
                <Location className="size-3.5" /> {seeker.location}
              </span>
            )}
            <PostedAt date={applicant.created_at} prefix="Applied" />
          </div>
        </SheetHeader>

        <div className="space-y-2 border-b p-5">
          <ApplicationProgress status={applicant.status} events={applicant.events} />
          <ol className="grid grid-cols-4 gap-1 text-xs text-muted-foreground">
            {PIPELINE.map((step) => (
              <li key={step} className="truncate">
                {APPLICATION_STATUSES[step].label}
              </li>
            ))}
          </ol>
          {canMove ? (
            <div className="flex flex-wrap gap-2 pt-3">
              {next && (
                <Button disabled={pending} onClick={() => onMove(next)}>
                  {pending ? <CircleDash className="animate-spin" /> : <ArrowRight />}
                  {moveLabel(next)}
                </Button>
              )}
              {applicant.status === 'rejected' && back && (
                <Button variant="outline" disabled={pending} onClick={() => onMove(back)}>
                  {pending ? <CircleDash className="animate-spin" /> : <ArrowLeft />}
                  Reconsider ({APPLICATION_STATUSES[back].label})
                </Button>
              )}
              <MoveMenu status={applicant.status} name={name} onMove={onMove} disabled={pending} />
              {applicant.status !== 'rejected' && (
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive sm:ml-auto"
                  disabled={pending}
                  onClick={() => onMove('rejected')}
                >
                  <CloseOutline /> Reject
                </Button>
              )}
            </div>
          ) : (
            <p className="pt-3 text-sm text-muted-foreground">
              {name} withdrew this application, so its status can no longer be changed.
            </p>
          )}
        </div>

        <div className="space-y-7 p-5">
          <Section id="candidate-resume" title="Resume sent">
            <SentResume path={applicant.resume_path} seekerId={applicant.seeker_id} audience="recruiter" />
          </Section>

          <QuestionResponses value={applicant.answers} />

          <Section id="candidate-note" title="Cover note">
            {applicant.cover_note ? (
              <p className="border bg-muted/40 p-3 font-serif text-[15px] leading-relaxed whitespace-pre-line">
                {applicant.cover_note}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No cover note.</p>
            )}
          </Section>

          {(seeker?.bio || (seeker?.skills.length ?? 0) > 0) && (
            <Section id="candidate-about" title="About">
              {seeker?.bio && (
                <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{seeker.bio}</p>
              )}
              {seeker && seeker.skills.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
                  {seeker.skills.map((skill) => (
                    <li key={skill} className="border px-2 py-0.5 text-xs">
                      {skill}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          <Section id="candidate-experience" title="Experience">
            <Experience seekerId={applicant.seeker_id} />
          </Section>

          <Section id="candidate-timeline" title="Timeline">
            <ApplicationTimeline events={applicant.events} seekerId={applicant.seeker_id} audience="recruiter" />
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
