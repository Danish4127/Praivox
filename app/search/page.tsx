import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EmptyState, NewsList, SiteHeader } from '@/components/praivox'
import { getPublishedStories } from '@/lib/publicStories'

// Same reason as app/page.tsx - avoid build-time DB calls.
export const dynamic = 'force-dynamic'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = (q ?? '').trim()
  const stories = query ? await getPublishedStories({ search: query, limit: 30 }) : []

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back home
        </Link>
        <p className="mb-3 text-[11px] font-semibold tracking-[.2em] text-cyan-200">SEARCH RESULTS</p>
        <h1 className="font-serif text-5xl text-foreground">
          {query ? `“${query}”` : 'Search Praivox'}
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
          {query
            ? `Showing published stories matching “${query}”.`
            : 'Type a search term using the search icon in the header to find stories.'}
        </p>
        <div className="mt-12">
          {query && stories.length > 0 ? (
            <NewsList stories={stories} />
          ) : query ? (
            <EmptyState />
          ) : null}
        </div>
      </main>
    </div>
  )
}
