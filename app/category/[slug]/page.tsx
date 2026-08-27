import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EmptyState, NewsList, SiteHeader } from '@/components/praivox'
import { getPublishedStories } from '@/lib/publicStories'

// URL slug ('geopolitics') aur db mein stored category ('geopolitical')
// ke naam alag hain, isliye ye chhota mapping.
const CATEGORY_BY_SLUG: Record<string, string> = {
  geopolitics: 'geopolitical',
  crypto: 'crypto',
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const title = slug === 'crypto' ? 'Crypto' : 'Geopolitics'
  const category = CATEGORY_BY_SLUG[slug] ?? slug
  const stories = await getPublishedStories({ category })

  return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto max-w-7xl px-5 py-24 lg:px-8"><Link href="/" className="mb-10 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> Back home</Link><p className="mb-3 text-[11px] font-semibold tracking-[.2em] text-cyan-200">COVERAGE / {title.toUpperCase()}</p><h1 className="font-serif text-6xl text-foreground">{title}</h1><p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">Verified {title.toLowerCase()} intelligence, carefully curated from multiple sources.</p><div className="mt-12">{stories.length > 0 ? <NewsList stories={stories} /> : <EmptyState />}</div></main></div>
}
