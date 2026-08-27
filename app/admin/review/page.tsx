'use client'
import { useEffect, useState } from 'react'
import { Menu, Bell, Check, X, Loader2, ExternalLink } from 'lucide-react'
import { AdminSidebar } from '@/components/praivox'

type Story = {
  id: string
  title: string
  category: string
  sourceCount: number
  sources: { name: string; url: string }[]
  status: string
  aiSummary: string | null
  consistencyScore: string | null
}
type PendingBatch = { id: string; createdAt: string; stories: Story[] } | null

// Phase 4 — Admin yahan pending batch dekhta hai aur individual stories
// YA poora batch approve/reject kar sakta hai. Approve = story turant
// "published" ban jati hai (koi alag publish step nahi). Jab batch ki
// saari stories action ho jayein, batch khud finalize ho jata hai
// (lib/batches.ts mein logic hai) - us ke baad concurrency gate khul
// jata hai aur agla scheduled run process ho sakta hai.

export default function ReviewPage() {
  const [drawer, setDrawer] = useState(false)
  const [batch, setBatch] = useState<PendingBatch>(null)
  const [loading, setLoading] = useState(true)
  // Jis story/batch pe abhi action chal raha hai, uski id (ya "batch")
  // - taake baaki buttons us dauran disable rahein aur double-click se
  // do dafa request na chali jaye.
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/batches/pending')
      const data = await res.json()
      setBatch(data.batch)
    } catch {
      setError('Could not load the pending batch.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function actOnStory(storyId: string, action: 'approve' | 'reject') {
    setBusyId(storyId)
    setError(null)
    const res = await fetch(`/api/admin/stories/${storyId}/${action}`, { method: 'POST' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong.')
    }
    await load()
    setBusyId(null)
  }

  async function actOnBatch(action: 'approve' | 'reject') {
    if (!batch) return
    setBusyId('batch')
    setError(null)
    const res = await fetch(`/api/admin/batches/${batch.id}/${action}`, { method: 'POST' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong.')
    }
    await load()
    setBusyId(null)
  }

  const pendingCount = batch?.stories.filter((s) => s.status === 'shortlisted').length ?? 0

  return <div className="min-h-screen bg-background">
    <AdminSidebar drawer={drawer} onClose={() => setDrawer(false)} />
    {drawer && <button className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setDrawer(false)} aria-label="Close menu overlay" />}
    <div className="lg:pl-64">
      <header className="flex h-[72px] items-center justify-between border-b border-white/[.08] px-5 lg:px-8">
        <button className="lg:hidden" onClick={() => setDrawer(true)} aria-label="Open navigation"><Menu className="size-5" /></button>
        <div className="hidden lg:block"><p className="text-xs text-muted-foreground">Workspace / Pending Review</p></div>
        <div className="ml-auto flex items-center gap-4"><button className="text-muted-foreground hover:text-foreground" aria-label="Notifications"><Bell className="size-4" /></button></div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-[.18em] text-cyan-200">REVIEW</p>
            <h1 className="font-serif text-4xl text-foreground">Pending Review</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {loading ? 'Loading…' : batch ? `${pendingCount} of ${batch.stories.length} stories still need a decision.` : 'No batch is waiting for review right now.'}
            </p>
          </div>
          {batch && pendingCount > 0 && (
            <div className="flex gap-2">
              <button onClick={() => actOnBatch('reject')} disabled={busyId !== null} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.04] px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-red-400/40 hover:bg-red-400/10 disabled:opacity-50">
                {busyId === 'batch' ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />} Reject all
              </button>
              <button onClick={() => actOnBatch('approve')} disabled={busyId !== null} className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-400 disabled:opacity-50">
                {busyId === 'batch' ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Approve all
              </button>
            </div>
          )}
        </div>

        {error && <div className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

        <div className="mt-8 space-y-4">
          {!loading && !batch && (
            <div className="relative overflow-hidden rounded-2xl border border-white/[.09] bg-white/[.025] px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">Nothing pending — new batches show up here automatically once a scheduled run finds verified stories.</p>
            </div>
          )}

          {batch?.stories.map((story) => (
            <div key={story.id} className="rounded-2xl border border-white/[.09] bg-white/[.025] p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide ${story.category === 'crypto' ? 'bg-cyan-300/10 text-cyan-200' : 'bg-violet-400/10 text-violet-200'}`}>
                    {story.category === 'crypto' ? 'CRYPTO' : 'GEOPOLITICAL'}
                  </span>
                  <h3 className="font-serif text-xl text-foreground">{story.title}</h3>
                  {story.aiSummary && (
                    <p className="mt-2 text-sm italic text-muted-foreground">{story.aiSummary}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {story.sources.map((s) => (
                      <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                        {s.name} <ExternalLink className="size-3" />
                      </a>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <p className="text-[11px] text-muted-foreground">{story.sourceCount} independent source{story.sourceCount === 1 ? '' : 's'}</p>
                    {story.consistencyScore && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          story.consistencyScore === 'high'
                            ? 'bg-emerald-400/10 text-emerald-300'
                            : story.consistencyScore === 'medium'
                              ? 'bg-amber-400/10 text-amber-300'
                              : 'bg-red-400/10 text-red-300'
                        }`}
                        title="AI-assessed headline-level corroboration confidence"
                      >
                        {story.consistencyScore.toUpperCase()} CONSISTENCY
                      </span>
                    )}
                  </div>
                </div>

                {story.status === 'shortlisted' ? (
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => actOnStory(story.id, 'reject')} disabled={busyId !== null} aria-label="Reject story" className="grid size-9 place-items-center rounded-lg border border-white/10 text-muted-foreground transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50">
                      {busyId === story.id ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                    </button>
                    <button onClick={() => actOnStory(story.id, 'approve')} disabled={busyId !== null} aria-label="Approve story" className="grid size-9 place-items-center rounded-lg border border-white/10 text-muted-foreground transition hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-emerald-300 disabled:opacity-50">
                      {busyId === story.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    </button>
                  </div>
                ) : (
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${story.status === 'published' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-300'}`}>
                    {story.status === 'published' ? 'Approved' : 'Rejected'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  </div>
}
