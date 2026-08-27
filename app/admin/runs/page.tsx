'use client'
import { useEffect, useState } from 'react'
import { Menu, Bell, Loader2, CheckCircle2, XCircle, SkipForward, AlertTriangle } from 'lucide-react'
import { AdminSidebar } from '@/components/praivox'

// Phase 5 — Run History page (scope Table 5 #4: "Every run — executed,
// skipped, or failed — is logged with timestamp, outcome, and reason,
// so run history is auditable from the admin panel or logs.")
//
// Isse pehle ye sirf Prisma Studio se dekha ja sakta tha - ab admin
// seedha panel mein har run (completed/skipped/failed) dekh sakta hai,
// saath mein kitne items aaye the aur koi source fail hui thi to wo bhi.

type RunRow = {
  id: string
  startedAt: string
  finishedAt: string | null
  status: 'completed' | 'skipped' | 'failed'
  skipReason: string | null
  errorDetail: string | null
  itemsFetched: number
  candidateCount: number
  verifiedCount: number
  sourceErrors: { source: string; message: string }[]
  storiesCount: number
  batchId: string | null
  batchStatus: string | null
}

const statusMeta: Record<RunRow['status'], { icon: typeof CheckCircle2; className: string; label: string }> = {
  completed: { icon: CheckCircle2, className: 'bg-emerald-400/10 text-emerald-300', label: 'Completed' },
  skipped: { icon: SkipForward, className: 'bg-amber-400/10 text-amber-300', label: 'Skipped' },
  failed: { icon: XCircle, className: 'bg-red-400/10 text-red-300', label: 'Failed' },
}

export default function RunHistoryPage() {
  const [drawer, setDrawer] = useState(false)
  const [runs, setRuns] = useState<RunRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/runs')
      .then((res) => res.json())
      .then((data) => setRuns(data.runs ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar drawer={drawer} onClose={() => setDrawer(false)} />
      {drawer && (
        <button
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setDrawer(false)}
          aria-label="Close menu overlay"
        />
      )}
      <div className="lg:pl-64">
        <header className="flex h-[72px] items-center justify-between border-b border-white/[.08] px-5 lg:px-8">
          <button className="lg:hidden" onClick={() => setDrawer(true)} aria-label="Open navigation">
            <Menu className="size-5" />
          </button>
          <div className="hidden lg:block">
            <p className="text-xs text-muted-foreground">Workspace / Run History</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <button className="text-muted-foreground hover:text-foreground" aria-label="Notifications">
              <Bell className="size-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
          <p className="mb-2 text-[11px] font-semibold tracking-[.18em] text-cyan-200">AUDIT TRAIL</p>
          <h1 className="font-serif text-4xl text-foreground">Run History</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last 50 aggregation runs — completed, skipped (concurrency gate), or failed.
          </p>

          {loading ? (
            <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading run history…
            </div>
          ) : runs.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center text-sm text-muted-foreground">
              No runs yet. Once n8n posts to /api/cron/ingest, runs will show up here.
            </div>
          ) : (
            <div className="mt-8 space-y-3">
              {runs.map((run) => {
                const meta = statusMeta[run.status]
                const Icon = meta.icon
                return (
                  <div key={run.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.className}`}>
                          <Icon className="size-3.5" /> {meta.label}
                        </span>
                        <span className="text-sm text-foreground">
                          {new Date(run.startedAt).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {run.itemsFetched} item(s) fetched · {run.storiesCount} stor{run.storiesCount === 1 ? 'y' : 'ies'} shortlisted
                        {run.batchStatus ? ` · batch: ${run.batchStatus}` : ''}
                      </span>
                    </div>

                    {run.status === 'completed' && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {run.itemsFetched} items fetched → {run.candidateCount} unique stor{run.candidateCount === 1 ? 'y' : 'ies'} after dedup → {run.verifiedCount} verified (2+ sources) → {run.storiesCount} shortlisted
                        {run.storiesCount === 0 && (
                          <span className="text-amber-300">
                            {' '}— no story was independently covered by 2+ of your sources this run. This is expected sometimes, not necessarily a bug.
                          </span>
                        )}
                      </p>
                    )}

                    {run.skipReason && (
                      <p className="mt-3 text-xs text-amber-300">{run.skipReason}</p>
                    )}
                    {run.errorDetail && (
                      <p className="mt-3 text-xs text-red-300">{run.errorDetail}</p>
                    )}
                    {run.sourceErrors.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {run.sourceErrors.map((e, i) => (
                          <p key={i} className="flex items-center gap-1.5 text-xs text-orange-300">
                            <AlertTriangle className="size-3.5 shrink-0" />
                            <span className="font-medium">{e.source}:</span> {e.message}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
