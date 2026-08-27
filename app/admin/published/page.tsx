'use client'
import { useEffect, useState } from 'react'
import { Menu, Bell, Loader2, ExternalLink } from 'lucide-react'
import { AdminSidebar } from '@/components/praivox'

type PublishedStory = {
  id: string
  title: string
  category: string
  sourceCount: number
  sources: { name: string; url: string }[]
  publishedAt: string
}

// Admin panel ka "Published" page — jo bhi stories admin ne approve
// ki hain aur ab public site pe live hain, unki poori list yahan
// (newest first). Read-only hai — editing/unpublish scope mein nahi
// (scope Section 5: "Editing story text within the admin panel —
// approve/reject only").

export default function PublishedPage() {
  const [drawer, setDrawer] = useState(false)
  const [stories, setStories] = useState<PublishedStory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stories/published')
      .then((res) => res.json())
      .then((data) => setStories(data.stories ?? []))
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
            <p className="text-xs text-muted-foreground">Workspace / Published</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <button className="text-muted-foreground hover:text-foreground" aria-label="Notifications">
              <Bell className="size-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
          <p className="mb-2 text-[11px] font-semibold tracking-[.18em] text-cyan-200">LIVE ON PUBLIC SITE</p>
          <h1 className="font-serif text-4xl text-foreground">Published</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every story that has been approved and is currently visible on the public news page.
          </p>

          {loading ? (
            <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading published stories…
            </div>
          ) : stories.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center text-sm text-muted-foreground">
              Nothing published yet — approve a story from Pending Review to see it here.
            </div>
          ) : (
            <div className="mt-8 space-y-3">
              {stories.map((story) => {
                const isCrypto = story.category === 'crypto'
                return (
                  <article key={story.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
                    <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      <span className={`rounded-full px-2.5 py-0.5 font-medium tracking-wide ${isCrypto ? 'bg-cyan-300/10 text-cyan-200' : 'bg-violet-400/10 text-violet-200'}`}>
                        {isCrypto ? 'CRYPTO' : 'GEOPOLITICAL'}
                      </span>
                      <span>
                        {new Date(story.publishedAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                      <span>· {story.sourceCount} source{story.sourceCount === 1 ? '' : 's'}</span>
                    </div>
                    <h3 className="font-serif text-lg leading-snug text-foreground">{story.title}</h3>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      {story.sources.map((s) => (
                        <a
                          key={s.url}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-cyan-200"
                        >
                          {s.name} <ExternalLink className="size-3" />
                        </a>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
