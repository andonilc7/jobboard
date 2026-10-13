import { useEffect, useRef, useState } from 'react'
import { Close, Search, SettingsAdjust } from '@carbon/icons-react'
import { useSearchParams } from 'react-router'

import { JobFiltersPanel } from '@/components/jobs/JobFiltersPanel'
import { JobResults } from '@/components/jobs/JobResults'
import { PageHeader } from '@/components/layout/PageHeader'
import { SetupNotice } from '@/components/layout/SetupNotice'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  activeFilterCount,
  EMPTY_FILTERS,
  filtersToParams,
  parseFilters,
  type JobFilters,
} from '@/lib/job-filters'
import { isSupabaseConfigured } from '@/lib/supabase'

/** How long typing has to pause before the keyword or location reaches the URL (and the query). */
const TYPING_DELAY = 250

type Text = Pick<JobFilters, 'q' | 'location' | 'city'>

/** R4 keyword search + R5 filters. The URL is the source of truth, so searches are shareable. */
export function JobSearchPage() {
  const [params, setParams] = useSearchParams()
  const filters = parseFilters(params)
  const latestParams = useRef(params)
  useEffect(() => { latestParams.current = params }, [params])

  // The text inputs update instantly and reach the URL once typing pauses.
  const [text, setText] = useState<Text>({ q: filters.q, location: filters.location, city: filters.city })
  const [isTyping, setIsTyping] = useState(false)
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(typingTimer.current), [])

  /** Merges into the latest URL, so a delayed text update never undoes a newer filter change. */
  const commit = (patch: Partial<JobFilters>) =>
    setParams(filtersToParams({ ...parseFilters(latestParams.current), ...patch }), { replace: true })

  const changeText = (patch: Partial<Text>) => {
    const next = { ...text, ...patch }
    setText(next)
    setIsTyping(true)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(
      () => {
        typingTimer.current = undefined
        setIsTyping(false)
        commit({ q: next.q.trim(), location: next.location.trim(), city: next.city.trim() })
      },
      TYPING_DELAY,
    )
  }

  // Back/forward navigation changes the URL under us: bring the inputs along. Our own commits
  // already match the inputs, so they're left alone.
  const paramsKey = params.toString()
  const [syncedKey, setSyncedKey] = useState(paramsKey)
  if (syncedKey !== paramsKey) {
    setSyncedKey(paramsKey)
    if (!isTyping && (filters.q !== text.q.trim() || filters.location !== text.location.trim() || filters.city !== text.city.trim())) {
      setText({ q: filters.q, location: filters.location, city: filters.city })
    }
  }

  const onChange = (patch: Partial<JobFilters>) => {
    const { location, city, ...rest } = patch
    if (location !== undefined || city !== undefined) changeText({ ...(location !== undefined ? { location } : {}), ...(city !== undefined ? { city } : {}) })
    if (Object.keys(rest).length) commit(rest)
  }

  const clearFilters = () => {
    clearTimeout(typingTimer.current)
    typingTimer.current = undefined
    setIsTyping(false)
    setText((t) => ({ ...t, location: '', city: '' }))
    commit({ ...EMPTY_FILTERS, q: text.q.trim() })
  }

  const clearAll = () => {
    clearTimeout(typingTimer.current)
    typingTimer.current = undefined
    setIsTyping(false)
    setText({ q: '', location: '', city: '' })
    commit(EMPTY_FILTERS)
  }

  const panelFilters = { ...filters, location: text.location, city: text.city }
  const filterCount = activeFilterCount(panelFilters)

  return (
    <>
      <PageHeader
        title="Open roles"
        description="Search by keyword and filter by pay, location and experience level."
      />

      {!isSupabaseConfigured ? (
        <SetupNotice />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[14rem_1fr]">
          <aside className="hidden lg:block" aria-label="Filters">
            <div className="sticky top-22">
              <JobFiltersPanel filters={panelFilters} onChange={onChange} onClear={clearFilters} />
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  aria-label="Search jobs"
                  value={text.q}
                  onChange={(event) => changeText({ q: event.target.value })}
                  placeholder="Search by title, skill or keyword"
                  className="h-11 pr-10 pl-10 text-base md:text-[15px] [&::-webkit-search-cancel-button]:hidden"
                />
                {text.q && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Clear search"
                    onClick={() => changeText({ q: '' })}
                    className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
                  >
                    <Close />
                  </Button>
                )}
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-11 lg:hidden">
                    <SettingsAdjust />
                    <span className="sr-only sm:not-sr-only">Filters</span>
                    {filterCount > 0 && (
                      <Badge variant="highlight">
                        {filterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full overflow-y-auto sm:max-w-sm">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>Results update as you go.</SheetDescription>
                  </SheetHeader>
                  <div className="px-5 pb-6">
                    <JobFiltersPanel
                      idPrefix="sheet-filters"
                      filters={panelFilters}
                      onChange={onChange}
                      onClear={clearFilters}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <JobResults filters={filters} onClearAll={clearAll} />
          </div>
        </div>
      )}
    </>
  )
}
