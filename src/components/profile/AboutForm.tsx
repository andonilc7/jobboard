import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { citySchema, stateSchema, splitLocation, formatLocation } from '@/lib/location'
import { StateSelect } from '@/components/ui/StateSelect'

import { FormFooter } from '@/components/profile/FormFooter'
import { ProfileSection } from '@/components/profile/ProfileSection'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { TagInput } from '@/components/ui/tag-input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateSeekerProfile } from '@/lib/queries/seekers'
import type { Profile, SeekerProfile } from '@/lib/types'

const BIO_MAX = 2000

const schema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name').max(80, 'Keep it under 80 characters'),
  headline: z.string().trim().max(120, 'Keep it under 120 characters'),
  city: citySchema.or(z.literal('')),
  state: stateSchema.or(z.literal('')),
  bio: z.string().trim().max(BIO_MAX, `Keep it under ${BIO_MAX.toLocaleString('en-US')} characters`),
  skills: z.array(z.string()).max(30, 'Up to 30 skills'),
}).refine((values) => Boolean(values.city.trim()) === Boolean(values.state), { path: ['state'], message: 'Enter both city and state, or leave both blank' })

type Values = z.infer<typeof schema>

const toValues = (profile: Profile, seeker: SeekerProfile): Values => ({
  fullName: profile.full_name,
  headline: seeker.headline ?? '',
  city: seeker.city ?? splitLocation(seeker.location).city,
  state: seeker.state ?? splitLocation(seeker.location).state,
  bio: seeker.bio ?? '',
  skills: seeker.skills,
})

/** R2: who you are. Name lives on `profiles`, the rest on `seeker_profiles`. */
export function AboutForm({ profile, seeker }: { profile: Profile; seeker: SeekerProfile }) {
  const { refreshProfile } = useAuth()
  const save = useUpdateSeekerProfile(seeker.user_id)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting, dirtyFields },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(profile, seeker) })

  async function onSubmit(values: Values) {
    try {
      const updated = await save.mutateAsync({
        fullName: dirtyFields.fullName ? values.fullName : undefined,
        patch: {
          headline: values.headline || null,
          location: formatLocation(values.city, values.state) || null,
          city: values.city.trim() || null,
          state: values.state || null,
          bio: values.bio || null,
          skills: values.skills,
        },
      })
      if (dirtyFields.fullName) await refreshProfile()
      reset({ ...toValues(profile, updated), fullName: values.fullName })
      toast.success('Profile saved')
    } catch (error) {
      toast.error("Couldn't save your profile", {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  return (
    <ProfileSection
      id="about"
      title="About you"
      description="What recruiters see first when you apply."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5" noValidate>
        <div className="grid items-start gap-5 sm:grid-cols-2">
          <FormField id="fullName" label="Full name" error={errors.fullName?.message}>
            <Input
              id="fullName"
              autoComplete="name"
              aria-invalid={!!errors.fullName}
              {...register('fullName')}
            />
          </FormField>
          <FormField id="profile-city" label="City" error={errors.city?.message}>
            <Input id="profile-city" autoComplete="address-level2" placeholder="Brooklyn" aria-invalid={!!errors.city} {...register('city')} />
          </FormField>
          <FormField id="profile-state" label="State" error={errors.state?.message}>
            <Controller control={control} name="state" render={({ field }) =>
              <StateSelect id="profile-state" value={field.value} onChange={field.onChange} invalid={!!errors.state} />} />
          </FormField>
        </div>
        <FormField id="headline" label="Headline" error={errors.headline?.message}>
          <Input
            id="headline"
            placeholder="Frontend engineer who loves design systems"
            aria-invalid={!!errors.headline}
            {...register('headline')}
          />
        </FormField>
        <FormField id="bio" label="Bio" error={errors.bio?.message}>
          <Textarea
            id="bio"
            rows={5}
            placeholder="A few sentences about what you've built and what you want to work on next."
            aria-invalid={!!errors.bio}
            className="max-h-80 min-h-28"
            {...register('bio')}
          />
        </FormField>
        <FormField
          id="skills"
          label="Skills"
          error={errors.skills?.message}
          hint={<span className="text-xs text-muted-foreground">Press Enter or comma to add</span>}
        >
          <Controller
            control={control}
            name="skills"
            render={({ field }) => (
              <TagInput
                id="skills"
                value={field.value}
                onChange={field.onChange}
                placeholder="React, TypeScript, Figma…"
                aria-invalid={!!errors.skills}
              />
            )}
          />
        </FormField>
        <FormFooter isDirty={isDirty} isSubmitting={isSubmitting} onDiscard={() => reset()} />
      </form>
    </ProfileSection>
  )
}
