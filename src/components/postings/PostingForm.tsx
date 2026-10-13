import { useCallback, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CircleDash,
  CloseOutline,
  Launch,
  Reset,
  Rocket,
  Save,
  TrashCan,
  Undo,
  UserMultiple,
} from '@carbon/icons-react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { ConfirmPostingAction, type ConfirmableAction } from '@/components/postings/ConfirmPostingAction'
import { DescriptionField } from '@/components/postings/DescriptionField'
import { PostingStatusBadge } from '@/components/postings/PostingStatusBadge'
import { UnsavedChangesGuard } from '@/components/postings/UnsavedChangesGuard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { StateSelect } from '@/components/ui/StateSelect'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { TagInput } from '@/components/ui/tag-input'
import { usePostingAction } from '@/hooks/usePostingAction'
import type { Posting } from '@/lib/api/postings'
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS } from '@/lib/constants'
import { formatPay } from '@/lib/format'
import {
  countApplicants,
  EMPTY_POSTING,
  MAX_SKILLS,
  postingActions,
  postingSchema,
  toPostingFields,
  toPostingValues,
  type PostingInput,
  type PostingValues,
} from '@/lib/postings'
import { useCreatePosting, useUpdatePosting } from '@/lib/queries/postings'
import type { JobStatus } from '@/lib/types'

const STATUS_HELP: Record<JobStatus | 'new', string> = {
  new: 'Publish to put it in search right away, or save a draft and come back to it.',
  draft: 'Only your team can see drafts. Publish to put it in search.',
  open: 'Live in search and taking applications. Edits show up right away.',
  closed: "Out of search and not taking applications. Applicants still see it in their tracker.",
}

const toNumber = (value: string) => (value === '' || value == null ? null : Number(value))

/** R10/R11: create a posting, or edit one and move it between draft, open and closed. */
export function PostingForm({ companyId, posting }: { companyId: string; posting?: Posting }) {
  const navigate = useNavigate()
  const create = useCreatePosting(companyId)
  const update = useUpdatePosting(companyId)
  const { perform, isPending: isChangingStatus } = usePostingAction(companyId)
  const [confirming, setConfirming] = useState<ConfirmableAction>()
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Which button submitted, so only that one shows a spinner.
  const [intent, setIntent] = useState<JobStatus | 'save'>()
  // Set right before navigating away on purpose, so the unsaved-changes guard lets it through.
  const leaving = useRef(false)

  const status = posting?.status
  const applicantCount = posting ? countApplicants(posting.applications).total : 0
  const actions = posting ? postingActions(posting.status, applicantCount) : []

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PostingInput, unknown, PostingValues>({
    resolver: zodResolver(postingSchema),
    defaultValues: posting ? toPostingValues(posting) : EMPTY_POSTING,
  })
  const questionFields = useFieldArray({ control, name: 'questions', keyName: 'fieldKey' })
  const [payMin, payMax, payPeriod] = useWatch({ control, name: ['payMin', 'payMax', 'payPeriod'] })
  const payPreview =
    payMin != null && payMax != null && Number.isFinite(payMin) && Number.isFinite(payMax) && payMax >= payMin
      ? formatPay({ pay_min: payMin, pay_max: payMax, pay_period: payPeriod })
      : null

  const busy = isSubmitting || isChangingStatus
  const shouldBlock = useCallback(() => isDirty && !leaving.current, [isDirty])

  /** Saves the form. `nextStatus` also publishes, reopens or saves as a draft in the same write. */
  const save = (nextStatus?: JobStatus) => {
    setIntent(nextStatus ?? 'save')
    return handleSubmit(async (values) => {
      const fields = toPostingFields(values)
      try {
        if (!posting) {
          const target = nextStatus === 'open' ? 'open' : 'draft'
          const created = await create.mutateAsync({ fields, status: target })
          toast.success(target === 'open' ? 'Posting published' : 'Draft saved', {
            description:
              target === 'open'
                ? `${created.title} is live in search and taking applications.`
                : 'Publish it whenever you’re ready.',
          })
          leaving.current = true
          navigate('/dashboard')
          return
        }

        const statusChange = nextStatus && nextStatus !== posting.status ? nextStatus : undefined
        const saved = await update.mutateAsync({
          jobId: posting.id,
          patch: statusChange ? { ...fields, status: statusChange } : fields,
        })
        reset(toPostingValues(saved))
        toast.success(
          statusChange === 'open'
            ? posting.status === 'draft'
              ? 'Posting published'
              : 'Posting reopened'
            : 'Changes saved',
          { description: saved.title },
        )
      } catch (error) {
        toast.error(posting ? "Couldn't save the posting" : "Couldn't create the posting", {
          description: error instanceof Error ? error.message : 'Please try again.',
        })
      }
    })
  }
  const spinning = (which: JobStatus | 'save') => isSubmitting && intent === which

  function confirm(action: ConfirmableAction) {
    setConfirming(action)
    setConfirmOpen(true)
  }

  const isDraft = !posting || status === 'draft'

  return (
    <>
      <form
        noValidate
        onSubmit={(event) => {
          // Enter in a field saves a published posting. For a draft it does nothing: publishing or
          // leaving the editor should be a deliberate click.
          if (isDraft) event.preventDefault()
          else void save()(event)
        }}
        className="grid items-start gap-6 lg:grid-cols-[1fr_18rem]"
      >
        <div className="grid min-w-0 gap-6">
          <Card className="gap-5">
            <CardHeader>
              <CardTitle role="heading" aria-level={2}>
                The role
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <FormField id="posting-title" label="Job title" error={errors.title?.message}>
                <Input
                  id="posting-title"
                  placeholder="Senior Frontend Engineer"
                  autoComplete="off"
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? 'posting-title-error' : undefined}
                  {...register('title')}
                />
              </FormField>
              <div className="grid items-start gap-5 sm:grid-cols-2">
                <FormField id="posting-level" label="Experience level">
                  <Controller
                    control={control}
                    name="level"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="posting-level" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPERIENCE_LEVELS.map((l) => (
                            <SelectItem key={l.value} value={l.value}>
                              {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
                <FormField id="posting-type" label="Employment type">
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="posting-type" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EMPLOYMENT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
              </div>
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium">Years of experience</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(['minYoe', 'maxYoe'] as const).map((name) => <FormField key={name} id={`posting-${name}`}
                    label={name === 'minYoe' ? 'Minimum years' : 'Maximum years'} error={errors[name]?.message}>
                    <Input id={`posting-${name}`} type="number" min={0} max={60} step={0.5} placeholder="Not specified"
                      aria-invalid={!!errors[name]} {...register(name, { setValueAs: toNumber })} />
                  </FormField>)}
                </div>
                <p className="text-xs text-muted-foreground">Optional numeric range, separate from the experience category.</p>
              </fieldset>
            </CardContent>
          </Card>

          <Card className="gap-5">
            <CardHeader>
              <CardTitle role="heading" aria-level={2}>
                Location and pay
              </CardTitle>
              <CardDescription>Seekers filter on both, so be specific.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="posting-city" label="City" error={errors.city?.message}>
                  <Input id="posting-city" placeholder="San Francisco" autoComplete="address-level2" aria-invalid={!!errors.city} {...register('city')} />
                </FormField>
                <FormField id="posting-state" label="State" error={errors.state?.message}>
                  <Controller control={control} name="state" render={({ field }) =>
                    <StateSelect id="posting-state" value={field.value} onChange={field.onChange} invalid={!!errors.state} />} />
                </FormField>
              </div>
              <p className="text-xs text-muted-foreground">US locations. For fully remote roles, leave both blank and enable Remote-friendly.</p>

              <Controller
                control={control}
                name="isRemote"
                render={({ field }) => (
                  <div className="flex items-center justify-between gap-4 border px-3 py-2.5">
                    <div className="grid gap-0.5">
                      <Label htmlFor="posting-remote">Remote-friendly</Label>
                      <p id="posting-remote-hint" className="text-xs text-muted-foreground">
                        Shows up in remote searches and for seekers open to remote work.
                      </p>
                    </div>
                    <Switch
                      id="posting-remote"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-describedby="posting-remote-hint"
                    />
                  </div>
                )}
              />

              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium">Pay range</legend>
                <div className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_9rem]">
                  {(['payMin', 'payMax'] as const).map((name) => {
                    const id = `posting-${name === 'payMin' ? 'pay-min' : 'pay-max'}`
                    const error = errors[name]?.message
                    return (
                      <div key={name} className="grid gap-1.5">
                        <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
                          {name === 'payMin' ? 'Minimum' : 'Maximum'}
                        </Label>
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                            $
                          </span>
                          <Input
                            id={id}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={payPeriod === 'hour' ? 1 : 5000}
                            placeholder={payPeriod === 'hour' ? (name === 'payMin' ? '45' : '60') : name === 'payMin' ? '150000' : '190000'}
                            className="pl-7 tabular-nums"
                            aria-invalid={!!error}
                            aria-describedby={error ? `${id}-error` : undefined}
                            {...register(name, { setValueAs: toNumber })}
                          />
                        </div>
                        {error && (
                          <p id={`${id}-error`} className="text-xs text-destructive">
                            {error}
                          </p>
                        )}
                      </div>
                    )
                  })}
                  <div className="grid gap-1.5">
                    <Label htmlFor="posting-pay-period" className="text-xs font-normal text-muted-foreground">
                      Period
                    </Label>
                    <Controller
                      control={control}
                      name="payPeriod"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="posting-pay-period" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="year">Per year</SelectItem>
                            <SelectItem value="hour">Per hour</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {payPreview ? (
                    <>
                      Shows as <span className="font-medium text-foreground tabular-nums">{payPreview}</span>.
                      Use the same number twice for a single figure.
                    </>
                  ) : (
                    'Use the same number twice for a single figure.'
                  )}
                </p>
              </fieldset>
            </CardContent>
          </Card>

          <Card className="gap-5">
            <CardHeader>
              <CardTitle role="heading" aria-level={2}>
                <label htmlFor="posting-description">Description</label>
              </CardTitle>
              <CardDescription>Covered by keyword search, so mention the tools and work involved.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Controller
                control={control}
                name="description"
                render={({ field }) => (
                  <DescriptionField
                    id="posting-description"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    invalid={!!errors.description}
                  />
                )}
              />
              {errors.description && (
                <p id="posting-description-error" className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="gap-5">
            <CardHeader>
              <CardTitle role="heading" aria-level={2}>
                <label htmlFor="posting-skills">Skills</label>
              </CardTitle>
              <CardDescription>
                Matched against seekers’ skills for their For-you feed. Up to {MAX_SKILLS}.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Controller
                control={control}
                name="skills"
                render={({ field }) => (
                  <TagInput
                    id="posting-skills"
                    value={field.value}
                    onChange={field.onChange}
                    maxTags={MAX_SKILLS}
                    placeholder="React, TypeScript, Postgres"
                    aria-invalid={!!errors.skills}
                  />
                )}
              />
              {errors.skills && <p className="text-xs text-destructive">{errors.skills.message}</p>}
            </CardContent>
          </Card>
          <Card className="gap-5">
            <CardHeader><CardTitle>Application questions</CardTitle>
              <CardDescription>Add up to 10 questions. Submitted answers keep a copy of the original question.</CardDescription></CardHeader>
            <CardContent className="grid gap-4">
              {questionFields.fields.map((question, index) => <div key={question.fieldKey} className="grid gap-3 border p-3">
                <FormField id={`question-${question.id}`} label={`Question ${index + 1}`} error={errors.questions?.[index]?.prompt?.message}>
                  <Input id={`question-${question.id}`} maxLength={500} {...register(`questions.${index}.prompt`)} />
                </FormField>
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register(`questions.${index}.required`)} /> Required</label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => questionFields.remove(index)}>Remove question {index + 1}</Button>
                </div>
              </div>)}
              {errors.questions?.message && <p role="alert" className="text-sm text-destructive">{errors.questions.message}</p>}
              <Button type="button" variant="outline" disabled={questionFields.fields.length >= 10}
                onClick={() => questionFields.append({ id: crypto.randomUUID(), prompt: '', required: true })}>Add question</Button>
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-24">
          <Card className="gap-4 py-5">
            <CardHeader className="px-5">
              <div className="flex items-center justify-between gap-2">
                <CardTitle role="heading" aria-level={2}>
                  {posting ? 'Status' : 'Ready to post?'}
                </CardTitle>
                {status && <PostingStatusBadge status={status} />}
              </div>
              <CardDescription>{STATUS_HELP[status ?? 'new']}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 px-5">
              {isDraft ? (
                <>
                  <Button type="button" disabled={busy} onClick={() => void save('open')()}>
                    {spinning('open') ? <CircleDash className="animate-spin" /> : <Rocket />}
                    Publish
                  </Button>
                  <Button type="button" variant="outline" disabled={busy} onClick={() => void save('draft')()}>
                    {spinning('draft') ? <CircleDash className="animate-spin" /> : <Save />} Save draft
                  </Button>
                </>
              ) : (
                <>
                  <Button type="submit" disabled={!isDirty || busy}>
                    {spinning('save') ? <CircleDash className="animate-spin" /> : <Save />}
                    Save changes
                  </Button>
                  {actions.includes('reopen') && (
                    <Button type="button" variant="outline" disabled={busy} onClick={() => void save('open')()}>
                      {spinning('open') ? <CircleDash className="animate-spin" /> : <Reset />}
                      {isDirty ? 'Save and reopen' : 'Reopen'}
                    </Button>
                  )}
                </>
              )}
              {isDirty && !isSubmitting && posting && (
                <Button type="button" variant="ghost" disabled={busy} onClick={() => reset()}>
                  Discard changes
                </Button>
              )}

              {posting && (posting.status !== 'draft' || actions.includes('delete')) && (
                <div className="mt-2 grid gap-1 border-t pt-3">
                  {posting.status !== 'draft' && (
                    <Button asChild variant="ghost" size="sm" className="justify-start">
                      <Link to={`/postings/${posting.id}`}>
                        <UserMultiple /> View applicants
                        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{applicantCount}</span>
                      </Link>
                    </Button>
                  )}
                  {posting.status === 'open' && (
                    <Button asChild variant="ghost" size="sm" className="justify-start">
                      <Link to={`/jobs/${posting.id}`}>
                        <Launch /> View live posting
                      </Link>
                    </Button>
                  )}
                  {actions.includes('unpublish') && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      disabled={busy}
                      onClick={() => void perform(posting, 'unpublish')}
                    >
                      <Undo /> Move back to drafts
                    </Button>
                  )}
                  {actions.includes('close') && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="justify-start text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() => confirm('close')}
                    >
                      <CloseOutline /> Close posting…
                    </Button>
                  )}
                  {actions.includes('delete') && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="justify-start text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() => confirm('delete')}
                    >
                      <TrashCan /> Delete draft…
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </form>

      {posting && (
        <ConfirmPostingAction
          companyId={companyId}
          posting={posting}
          action={confirming}
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onDone={(action) => {
            if (action === 'delete') {
              leaving.current = true
              navigate('/dashboard')
            }
          }}
        />
      )}
      <UnsavedChangesGuard when={shouldBlock} />
    </>
  )
}
