'use client'
import { useEffect, useState } from 'react'
import { Menu, Bell, Clock3, FileCheck2, History, CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import { AdminSidebar, EmptyState, StatCard } from '@/components/praivox'

type Stats = { pending: number; published: number; rejected: number; todaysRuns: number }

type Run = {
  id: string
  startedAt: string
  finishedAt: string | null
  status: 'completed' | 'skipped' | 'failed' | string
  skipReason: string | null
  errorDetail: string | null
  itemsFetched: number
  storiesCount: number
}

// Run ke status ko chhota label + icon + color mein map karta hai,
// taake activity list mein har run ki state ek nazar mein samajh aaye.
function runStatusMeta(status: string) {
  if (status === 'completed') return { label: 'Completed', Icon: CheckCircle2, className: 'text-emerald-300' }
  if (status === 'failed') return { label: 'Failed', Icon: XCircle, className: 'text-red-300' }
  if (status === 'skipped') return { label: 'Skipped', Icon: MinusCircle, className: 'text-amber-300' }
  return { label: status, Icon: History, className: 'text-muted-foreground' }
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

function RecentActivity({ runs }: { runs: Run[] }) {
  if (runs.length === 0) return <EmptyState admin />
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[.09] bg-white/[.025]">
      <ul className="divide-y divide-white/[.06]">
        {runs.slice(0, 8).map((run) => {
          const { label, Icon, className } = runStatusMeta(run.status)
          const detail = run.status === 'failed' ? run.errorDetail : run.status === 'skipped' ? run.skipReason : null
          return (
            <li key={run.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex items-center gap-3">
                <Icon className={`size-4 shrink-0 ${className}`} />
                <div>
                  <p className="text-sm text-foreground">
                    {label}
                    {run.status === 'completed' && <span className="text-muted-foreground"> — {run.storiesCount} {run.storiesCount === 1 ? 'story' : 'stories'} from {run.itemsFetched} items</span>}
                  </p>
                  {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(run.startedAt)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function AdminPage() {
  const [drawer, setDrawer] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [runs, setRuns] = useState<Run[]>([])
  const [today, setToday] = useState('')
  // Note: this page is already protected by proxy.ts (server-side).
  // No client-side login check needed here.

  function loadStats() {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then(setStats)
      .catch(() => setStats({ pending: 0, published: 0, rejected: 0, todaysRuns: 0 }))
  }

  function loadRuns() {
    fetch('/api/admin/runs')
      .then((res) => res.json())
      .then((data) => setRuns(data.runs ?? []))
      .catch(() => setRuns([]))
  }

  useEffect(() => {
    loadStats()
    loadRuns()
    // Aaj ki date - client ke system se, taake hardcoded na ho aur
    // hamesha sahi rahe. useEffect mein compute karte hain taake
    // server aur client ka render mismatch (hydration error) na aaye.
    setToday(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
  }, [])

  // News-fetching ab poori tarah n8n se automatic hoti hai (Schedule
  // Trigger -> RSS Feed Read -> /api/cron/ingest), isliye yahan koi
  // manual "Fetch News Now" button nahi hai. Naya batch aane par stat
  // cards khud refresh ho jayenge jab admin page reload/revisit hoga.

  return <div className="min-h-screen bg-background"><AdminSidebar drawer={drawer} onClose={() => setDrawer(false)} />{drawer && <button className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setDrawer(false)} aria-label="Close menu overlay" /> }<div className="lg:pl-64"><header className="flex h-[72px] items-center justify-between border-b border-white/[.08] px-5 lg:px-8"><button className="lg:hidden" onClick={() => setDrawer(true)} aria-label="Open navigation"><Menu className="size-5" /></button><div className="hidden lg:block"><p className="text-xs text-muted-foreground">Workspace / Dashboard</p></div><div className="ml-auto flex items-center gap-4"><button className="text-muted-foreground hover:text-foreground" aria-label="Notifications"><Bell className="size-4" /></button><div className="hidden h-5 w-px bg-white/10 sm:block" /><span className="text-xs text-muted-foreground">{today}</span></div></header><main className="mx-auto max-w-7xl px-5 py-10 lg:px-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-[11px] font-semibold tracking-[.18em] text-cyan-200">OVERVIEW</p><h1 className="font-serif text-4xl text-foreground">Good evening, Admin</h1><p className="mt-2 text-sm text-muted-foreground">Manage your news publishing workflow.</p></div></div><div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Pending Review" icon={Clock3} value={stats?.pending} /><StatCard label="Published" icon={FileCheck2} value={stats?.published} /><StatCard label="Today's Runs" icon={History} value={stats?.todaysRuns} /><StatCard label="Rejected" icon={FileCheck2} value={stats?.rejected} /></div><section className="mt-8"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-medium text-foreground">Recent activity</h2><span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-muted-foreground">ALL TIME</span></div><RecentActivity runs={runs} /></section></main></div></div>
}
