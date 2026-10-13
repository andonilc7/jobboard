import { ApplicantsTable } from '@/components/pipeline/ApplicantsTable'
import { useState } from 'react'
import {
  ArrowLeft,
  DocumentSketch,
  Edit,
  Launch,
  Location,
  Search,
  Task,
  UserMultiple,
  WarningAlt,
} from '@carbon/icons-react'
import { Link, useParams, useSearchParams } from 'react-router'

import { PostedAt } from '@/components/jobs/PostedAt'
import { EmptyState } from '@/components/layout/EmptyState'
import { SetupNotice } from '@/components/layout/SetupNotice'
import { CandidateCard } from '@/components/pipeline/CandidateCard'
import { CandidateSheet } from '@/components/pipeline/CandidateSheet'
import { ConfirmMoveDialog } from '@/components/pipeline/ConfirmMoveDialog'
import { PostingStatusBadge } from '@/components/postings/PostingStatusBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useMoveCandidate } from '@/hooks/useMoveCandidate'
import type { Applicant } from '@/lib/api/pipeline'
import { formatPay } from '@/lib/format'
import { candidateName, groupByStage, needsConfirmation, parseStage, STAGE_LABELS, STAGES, type Stage } from '@/lib/pipeline'
import { useApplicants } from '@/lib/queries/pipeline'
import { useMyCompany, usePosting } from '@/lib/queries/postings'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { ApplicationStatus } from '@/lib/types'

const EMPTY_STAGE: Record<Stage, string> = {
  applied: 'New applicants land here.',
  reviewing: 'No one in review.',
  interviewing: 'No one interviewing.',
  offer: 'No offers yet.',
  closed: 'Rejected and withdrawn candidates land here.',
}

function BackLink() {
  return (
    <Link
      to="/dashboard"
      className="mb-6 inline-flex items-center gap-1.5 meta text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <ArrowLeft className="size-3.5" /> All postings
    </Link>
  )
}

function BoardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading applicants" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-9 w-full lg:hidden" />
      <div className="grid gap-3 lg:grid-cols-5">
        {STAGES.map((stage, i) => (
          <div key={stage} className={i > 0 ? 'hidden space-y-2 lg:block' : 'space-y-2'}>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** R12/R13: everyone who applied to one posting, as a pipeline board. */
export function PostingApplicantsPage() {
  const { jobId } = useParams()
  const { profile } = useAuth()
  const company = useMyCompany(profile?.id)
  const posting = usePosting(company.data?.id, jobId)
  const applicants = useApplicants(jobId, Boolean(posting.data))
  const { perform, isPending, pendingId } = useMoveCandidate(jobId ?? '')
  const [params, setParams] = useSearchParams()

  // Kept after closing so the sheet and dialog don't go blank while they animate out.
  const [selectedId, setSelectedId] = useState<string>()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [confirming, setConfirming] = useState<{ applicant: Applicant; target: 'offer' | 'rejected' }>()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!isSupabaseConfigured) return <SetupNotice />

  const loading =
    company.isPending ||
    (company.data && posting.isPending) ||
    (posting.data && posting.data.status !== 'draft' && applicants.isPending)
  if (loading) {
    return (
      <>
        <BackLink />
        <BoardSkeleton />
      </>
    )
  }

  const failed = company.isError || posting.isError || applicants.isError
  if (failed || !company.data) {
    return (
      <>
        <BackLink />
        <EmptyState
          tone="error"
          icon={WarningAlt}
          title={failed ? "We couldn't load the applicants" : "Your account isn't linked to a company"}
          description={failed ? 'Check your connection and try again.' : 'Recruiter accounts belong to a company.'}
          action={
            failed ? (
              <Button
                onClick={() =>
                  void (company.isError ? company.refetch() : posting.isError ? posting.refetch() : applicants.refetch())
                }
              >
                Try again
              </Button>
            ) : undefined
          }
        />
      </>
    )
  }

  if (!posting.data) {
    return (
      <>
        <BackLink />
        <EmptyState
          icon={Search}
          title="Posting not found"
          description="It may have been deleted, or it belongs to another company."
          action={
            <Button asChild variant="outline">
              <Link to="/dashboard">Back to postings</Link>
            </Button>
          }
        />
      </>
    )
  }

  const job = posting.data
  const all = applicants.data ?? []
  const groups = groupByStage(all)
  const active = groups.applied.length + groups.reviewing.length + groups.interviewing.length
  const view = params.get('view') === 'table' ? 'table' : 'board'
  const stageParam = parseStage(params.get('stage'))
  // On mobile, open on the first stage with someone in it.
  const mobileStage = stageParam ?? STAGES.find((stage) => groups[stage].length > 0) ?? 'applied'
  const selected = all.find((applicant) => applicant.id === selectedId)

  function requestMove(applicant: Applicant, target: ApplicationStatus) {
    if (needsConfirmation(target)) {
      setConfirming({ applicant, target })
      setConfirmOpen(true)
    } else if (!isPending) {
      void perform(applicant, target)
    }
  }

  function openCandidate(applicant: Applicant) {
    setSelectedId(applicant.id)
    setSheetOpen(true)
  }

  const changeStage = (value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('stage', value)
        return next
      },
      { replace: true },
    )

  const renderStage = (stage: Stage) =>
    groups[stage].length === 0 ? (
      <p className="border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
        {EMPTY_STAGE[stage]}
      </p>
    ) : (
      <ul className="grid gap-2">
        {groups[stage].map((applicant) => (
          <li key={applicant.id}>
            <CandidateCard
              applicant={applicant}
              onOpen={() => openCandidate(applicant)}
              onMove={(target) => requestMove(applicant, target)}
              pending={pendingId === applicant.id}
            />
          </li>
        ))}
      </ul>
    )

  return (
    <>
      <BackLink />
      <header className="mb-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-title sm:text-4xl">{job.title}</h1>
            <PostingStatusBadge status={job.status} />
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Location className="size-3.5" /> {job.location}
            </span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">{formatPay(job)}</span>
            <span aria-hidden>·</span>
            <PostedAt date={job.created_at} prefix={job.status === 'draft' ? 'Created' : 'Posted'} />
          </p>
          {job.status !== 'draft' && (
            <p className="text-sm">
              <span className="font-medium tabular-nums">
                {all.length} {all.length === 1 ? 'applicant' : 'applicants'}
              </span>
              <span className="text-muted-foreground">
                {' · '}
                {active} active
                {groups.applied.length > 0 && (
                  <>
                    {' · '}
                    <span className="highlight font-medium">{groups.applied.length} new</span>
                  </>
                )}
                {job.status === 'closed' && ' · Closed to new applicants'}
              </span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {job.status === 'open' && (
            <Button asChild variant="ghost">
              <Link to={`/jobs/${job.id}`}>
                <Launch /> View live
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to={`/postings/${job.id}/edit`}>
              <Edit /> Edit posting
            </Link>
          </Button>
        </div>
      </header>

      {job.status !== 'draft' && <Tabs value={view} onValueChange={(value) => setParams((prev) => {
        const next = new URLSearchParams(prev); next.set('view', value); return next
      }, { replace: true })} className="mb-6">
        <TabsList aria-label="Applicant view"><TabsTrigger value="board">Pipeline board</TabsTrigger><TabsTrigger value="table">Applicant table</TabsTrigger></TabsList>
      </Tabs>}
      {job.status === 'draft' ? (
        <EmptyState
          icon={DocumentSketch}
          title="This posting is a draft"
          description="Seekers can't see or apply to drafts. Publish it to start collecting applicants."
          action={
            <Button asChild>
              <Link to={`/postings/${job.id}/edit`}>Finish and publish</Link>
            </Button>
          }
        />
      ) : view === 'table' ? (
        <ApplicantsTable applicants={all} onOpen={openCandidate} onMove={requestMove} pendingId={pendingId} />
      ) : all.length === 0 ? (
        <EmptyState
          icon={UserMultiple}
          title="No applicants yet"
          description={
            job.status === 'open'
              ? 'When seekers apply, they show up here, ready to review.'
              : "This posting closed before anyone applied. Reopen it to start collecting applicants."
          }
          action={
            <Button asChild variant="outline">
              <Link to={job.status === 'open' ? `/jobs/${job.id}` : `/postings/${job.id}/edit`}>
                {job.status === 'open' ? 'View live posting' : 'Edit posting'}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Mobile and tablet: one stage at a time. */}
          <div className="space-y-4 lg:hidden">
            <Tabs value={mobileStage} onValueChange={changeStage}>
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <TabsList aria-label="Pipeline stage" className="w-max min-w-full gap-6 sm:min-w-0">
                  {STAGES.map((stage) => (
                    <TabsTrigger key={stage} value={stage}>
                      {STAGE_LABELS[stage]}
                      <span className="meta text-muted-foreground">{groups[stage].length}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </Tabs>
            {renderStage(mobileStage)}
          </div>

          {/* Desktop: the whole board. */}
          <div className="hidden border-t lg:grid lg:grid-cols-5 lg:divide-x">
            {STAGES.map((stage) => (
              <section
                key={stage}
                aria-labelledby={`stage-${stage}`}
                className="min-w-0 space-y-3 py-4 pr-3 pl-3 first:pl-0 last:pr-0"
              >
                <h2 id={`stage-${stage}`} className="flex items-center justify-between meta">
                  <span className="flex items-center gap-1.5">
                    {stage === 'applied' && <Task className="size-3.5 text-muted-foreground" />}
                    {STAGE_LABELS[stage]}
                  </span>
                  <span className="text-muted-foreground">{groups[stage].length}</span>
                </h2>
                {renderStage(stage)}
              </section>
            ))}
          </div>
        </>
      )}

      <CandidateSheet
        applicant={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onMove={(target) => selected && requestMove(selected, target)}
        pending={Boolean(selected) && pendingId === selected?.id}
      />
      <ConfirmMoveDialog
        name={confirming ? candidateName(confirming.applicant) : ''}
        target={confirming?.target}
        open={confirmOpen}
        pending={isPending}
        onOpenChange={setConfirmOpen}
        onConfirm={() => {
          if (!confirming || isPending) return
          void perform(confirming.applicant, confirming.target).then((ok) => ok && setConfirmOpen(false))
        }}
      />
    </>
  )
}
