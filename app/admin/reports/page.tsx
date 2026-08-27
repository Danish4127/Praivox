'use client'
import { useEffect, useState } from 'react'
import { Menu, Bell, Loader2, ExternalLink, CheckCircle2, XCircle, CalendarDays } from 'lucide-react'
import { AdminSidebar } from '@/components/praivox'

type ReportStory = {
  id: string
  title: string
  category: string
  sourceCount: number
  sources: { name: string; url: string }[]
  date: string
  dateUnknown: boolean
}

type Report = {
  rangeStart: string
  rangeEnd: string
  published: ReportStory[]
  rejected: ReportStory[]
}

// Client requirement: published vs. rejected stories, tracked separately,
// filterable by a from/to date range (upgraded from a fixed "last 7 days"
// after the client asked for a calendar picker instead).

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10) // YYYY-MM-DD, what <input type="date"> expects
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
]

function StoryRow({ story }: { story: ReportStory }) {
  const isCrypto = story.category === 'crypto'
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className={`rounded-full px-2.5 py-0.5 font-medium tracking-wide ${isCrypto ? 'bg-cyan-300/10 text-cyan-200' : 'bg-violet-400/10 text-violet-200'}`}>
          {isCrypto ? 'CRYPTO' : 'GEOPOLITICAL'}
        </span>
        <span>{formatDate(story.date)}{story.dateUnknown && ' (creation date — exact date not recorded)'}</span>
        <span>· {story.sourceCount} source{story.sourceCount === 1 ? '' : 's'}</span>
      </div>
      <h3 className="font-serif text-lg leading-snug text-foreground">{story.title}</h3>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {story.sources.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-cyan-200">
            {s.name} <ExternalLink className="size-3" />
          </a>
        ))}
      </div>
    </article>
  )
}

function ReportSection({
  title, icon: Icon, iconClass, stories, emptyHint,
}: {
  title: string
  icon: typeof CheckCircle2
  iconClass: string
  stories: ReportStory[]
  emptyHint: string
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Icon className={`size-4 ${iconClass}`} />
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-muted-foreground">{stories.length}</span>
      </div>
      {stories.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center text-sm text-muted-foreground">
          {emptyHint}
        </div>
      ) : (
        <div className="space-y-3">
          {stories.map((story) => <StoryRow key={story.id} story={story} />)}
        </div>
      )}
    </section>
  )
}

export default function ReportsPage() {
  const [drawer, setDrawer] = useState(false)
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const [fromInput, setFromInput] = useState(toDateInputValue(sevenDaysAgo))
  const [toInput, setToInput] = useState(toDateInputValue(today))

  function loadReport(from: string, to: string) {
    setLoading(true)
    fetch(`/api/admin/reports?from=${from}&to=${to}`)
      .then((res) => res.json())
      .then(setReport)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadReport(fromInput, toInput)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyRange(e?: React.FormEvent) {
    e?.preventDefault()
    loadReport(fromInput, toInput)
  }

  function applyPreset(days: number) {
    const to = new Date()
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
    const fromStr = toDateInputValue(from)
    const toStr = toDateInputValue(to)
    setFromInput(fromStr)
    setToInput(toStr)
    loadReport(fromStr, toStr)
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar drawer={drawer} onClose={() => setDrawer(false)} />
      {drawer && (
        <button className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setDrawer(false)} aria-label="Close menu overlay" />
      )}
      <div className="lg:pl-64">
        <header className="flex h-[72px] items-center justify-between border-b border-white/[.08] px-5 lg:px-8">
          <button className="lg:hidden" onClick={() => setDrawer(true)} aria-label="Open navigation">
            <Menu className="size-5" />
          </button>
          <div className="hidden lg:block">
            <p className="text-xs text-muted-foreground">Workspace / Reports</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <button className="text-muted-foreground hover:text-foreground" aria-label="Notifications">
              <Bell className="size-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
          <p className="mb-2 text-[11px] font-semibold tracking-[.18em] text-cyan-200">AUDIT TRAIL</p>
          <h1 className="font-serif text-4xl text-foreground">Reports</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Published and rejected stories between any two dates.
          </p>

          <form onSubmit={applyRange} className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex items-center gap-2 text-cyan-200">
              <CalendarDays className="size-4" />
            </div>
            <div>
              <label htmlFor="from" className="block text-[11px] text-muted-foreground">From</label>
              <input
                id="from"
                type="date"
                value={fromInput}
                max={toInput}
                onChange={(e) => setFromInput(e.target.value)}
                className="mt-1 rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-sm text-foreground [color-scheme:dark]"
              />
            </div>
            <div>
              <label htmlFor="to" className="block text-[11px] text-muted-foreground">To</label>
              <input
                id="to"
                type="date"
                value={toInput}
                min={fromInput}
                max={toDateInputValue(today)}
                onChange={(e) => setToInput(e.target.value)}
                className="mt-1 rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-sm text-foreground [color-scheme:dark]"
              />
            </div>
            <button type="submit" className="rounded-lg border border-violet-400/40 bg-violet-400/10 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-violet-400/20">
              Apply
            </button>
            <div className="ml-auto flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.days)}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-cyan-300/40 hover:text-cyan-200"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </form>

          {loading ? (
            <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading report…
            </div>
          ) : (
            <div className="mt-8 space-y-10">
              <ReportSection
                title="Published"
                icon={CheckCircle2}
                iconClass="text-emerald-300"
                stories={report?.published ?? []}
                emptyHint="No stories were published in this date range."
              />
              <ReportSection
                title="Rejected"
                icon={XCircle}
                iconClass="text-red-300"
                stories={report?.rejected ?? []}
                emptyHint="No stories were rejected in this date range."
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
