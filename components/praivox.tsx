'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight, ChevronRight, CircleDot, Globe2, Loader2, Menu, Newspaper, Radar, Search, ShieldCheck, Sparkles, X, Bitcoin, LayoutDashboard, LogOut, Settings, History, FileCheck2, Clock3, CalendarDays } from 'lucide-react'

export const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Geopolitics', href: '/category/geopolitics' },
  { label: 'Crypto', href: '/category/crypto' },
]

export function Logo({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="group inline-flex items-center gap-3" aria-label="Praivox home">
    <span className="relative grid size-8 place-items-center rounded-lg border border-violet-400/30 bg-violet-400/10 text-violet-200 shadow-[0_0_24px_rgba(139,92,246,.12)]">
      <span className="absolute size-3 rounded-full border border-cyan-300/80" />
      <span className="absolute h-px w-5 rotate-45 bg-cyan-300/70" />
      <CircleDot className="relative size-3 text-cyan-200" />
    </span>
    <span className="leading-none"><span className="block text-[15px] font-semibold tracking-[.26em] text-foreground">PRAIVOX</span>{!compact && <span className="mt-1 block text-[9px] tracking-[.13em] text-muted-foreground">A NEW STANDARD IN DIGITAL ENGINEERING</span>}</span>
  </Link>
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
    setSearchOpen(false)
  }

  return <header className="sticky top-0 z-50 border-b border-white/[.07] bg-[#080c16]/75 backdrop-blur-xl">
    <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
      <Logo />
      <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">{navItems.map(item => <Link key={item.label} href={item.href} className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">{item.label}</Link>)}</nav>
      <div className="hidden items-center gap-3 md:flex">
        {searchOpen ? <form onSubmit={submitSearch} className="flex items-center gap-2">
          <input autoFocus type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stories…" className="w-56 rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-violet-400/50 focus:outline-none" />
          <button type="button" onClick={() => setSearchOpen(false)} className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-white/[.06] hover:text-foreground" aria-label="Close search"><X className="size-4" /></button>
        </form> : <button onClick={() => setSearchOpen(true)} className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-white/[.06] hover:text-foreground" aria-label="Search"><Search className="size-4" /></button>}
        <Link href="/admin/login" className="rounded-lg border border-white/10 bg-white/[.04] px-4 py-2 text-[13px] font-medium text-foreground transition hover:border-violet-400/50 hover:bg-violet-400/10">Admin Login</Link>
      </div>
      <button className="grid size-10 place-items-center rounded-lg border border-white/10 text-muted-foreground md:hidden" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
    </div>
    {open && <nav className="border-t border-white/[.07] px-5 py-4 md:hidden">
      <form onSubmit={submitSearch} className="mb-3 flex items-center gap-2">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stories…" className="flex-1 rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-violet-400/50 focus:outline-none" />
        <button type="submit" className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-500 text-white" aria-label="Search"><Search className="size-4" /></button>
      </form>
      {navItems.map(item => <Link key={item.label} href={item.href} onClick={() => setOpen(false)} className="block border-b border-white/[.06] py-3 text-sm text-muted-foreground">{item.label}</Link>)}<Link href="/admin/login" onClick={() => setOpen(false)} className="mt-4 block rounded-lg bg-violet-500 px-4 py-3 text-center text-sm font-medium text-white">Admin Login</Link></nav>}
  </header>
}

export function NetworkVisual({ small = false }: { small?: boolean }) {
  return <div className={`network-visual pointer-events-none absolute inset-0 overflow-hidden ${small ? 'opacity-50' : ''}`} aria-hidden="true"><div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(139,92,246,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,.08)_1px,transparent_1px)] [background-size:72px_72px]" /><div className="network-ring ring-one" /><div className="network-ring ring-two" /><span className="node n1" /><span className="node n2" /><span className="node n3" /><span className="node n4" /><span className="node n5" /><div className="data-line line-one" /><div className="data-line line-two" /><div className="absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" /></div>
}

export function CategoryCard({ type }: { type: 'geopolitics' | 'crypto' }) {
  const isGeo = type === 'geopolitics'
  return <Link id={type} href={`/category/${type}`} className="group relative min-h-[260px] overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-7 transition duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:bg-white/[.055] hover:shadow-[0_18px_60px_rgba(0,0,0,.25)]"><div className="absolute -right-16 -top-16 size-48 rounded-full bg-violet-500/10 blur-3xl transition group-hover:bg-violet-500/20" /><div className="relative flex h-full flex-col"><div className="mb-12 grid size-12 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] text-cyan-200">{isGeo ? <Globe2 className="size-6" /> : <Bitcoin className="size-6" />}</div><div className="mt-auto"><div className="mb-2 flex items-center justify-between"><h3 className="font-serif text-2xl text-foreground">{isGeo ? 'Geopolitics' : 'Crypto'}</h3><ArrowRight className="size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-cyan-200" /></div><p className="max-w-sm text-sm leading-6 text-muted-foreground">{isGeo ? 'Global affairs, conflicts, diplomacy and geopolitical developments.' : 'Crypto markets, blockchain developments and digital asset intelligence.'}</p></div></div></Link>
}

export function EmptyState({ admin = false }: { admin?: boolean }) {
  return <div className="relative overflow-hidden rounded-2xl border border-white/[.09] bg-white/[.025] px-6 py-16 text-center"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,.12),transparent_45%)]" /><div className="relative mx-auto max-w-md"><div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl border border-violet-300/20 bg-violet-400/[.08] text-violet-200">{admin ? <LayoutDashboard className="size-7" /> : <Radar className="size-7" />}</div><h3 className="font-serif text-2xl text-foreground">{admin ? 'Your workspace is ready.' : 'Your news feed is getting ready.'}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{admin ? 'News batches will appear here once the aggregation workflow is connected.' : 'Verified stories will appear here once they are published.'}</p></div></div>
}

export function StatCard({ label, icon: Icon, value }: { label: string, icon: typeof Clock3, value?: number }) { return <div className="rounded-xl border border-white/[.08] bg-white/[.025] p-5"><div className="flex items-center justify-between text-muted-foreground"><span className="text-xs">{label}</span><Icon className="size-4" /></div><p className="mt-4 text-3xl font-semibold text-foreground">{value ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">No activity yet</p></div> }

export function useDemoAuth() { const [authed, setAuthed] = useState(false); useEffect(() => setAuthed(window.localStorage.getItem('praivox-admin') === 'true'), []); return authed }
export function LoadingButton({ loading }: { loading: boolean }) { return <>{loading ? <><Loader2 className="size-4 animate-spin" /> Signing in...</> : 'Sign In'}</> }

// Phase 5.2: Published aur Settings ke apne pages ban gaye - ab
// har nav item ka apna real page hai.
export const adminNav = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { label: 'Pending Review', icon: Clock3, href: '/admin/review' },
  { label: 'Published', icon: FileCheck2, href: '/admin/published' },
  { label: 'Run History', icon: History, href: '/admin/runs' },
  // Client requirement: published vs. rejected stories, tracked
  // separately, filterable by any from/to date range.
  { label: 'Reports', icon: CalendarDays, href: '/admin/reports' },
  { label: 'Settings', icon: Settings, href: '/admin/settings' },
]

// Admin dashboard aur Pending Review page dono ka sidebar bilkul same
// hai, isliye ek shared component bana diya (pehle ye markup admin
// page.tsx ke andar hardcoded tha).
export function AdminSidebar({ drawer, onClose }: { drawer: boolean; onClose: () => void }) {
  const pathname = usePathname()

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/admin/login'
  }

  return <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/[.08] bg-[#0a0f1c] p-5 transition-transform lg:translate-x-0 ${drawer ? 'translate-x-0' : '-translate-x-full'}`}>
    <div className="flex items-center justify-between"><Logo compact /><button className="lg:hidden" onClick={onClose} aria-label="Close navigation"><X className="size-5" /></button></div>
    <nav className="mt-12 space-y-1" aria-label="Admin navigation">{adminNav.map((item) => {
      const active = item.href === pathname
      return <Link key={item.label} href={item.href} onClick={onClose} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${active ? 'bg-violet-400/10 text-violet-200' : 'text-muted-foreground hover:bg-white/[.04] hover:text-foreground'}`}><item.icon className="size-4" />{item.label}</Link>
    })}</nav>
    <div className="mt-auto border-t border-white/[.08] pt-4"><div className="flex items-center gap-3 px-2"><div className="grid size-8 place-items-center rounded-full bg-violet-400/15 text-xs font-medium text-violet-200">A</div><div><p className="text-xs font-medium text-foreground">Admin</p><p className="text-[10px] text-muted-foreground">admin@praivox.com</p></div></div><button onClick={logout} className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-white/[.04] hover:text-foreground"><LogOut className="size-4" /> Log out</button></div>
  </aside>
}

// Public site (home + category pages) par ek published story dikhane
// ke liye card. sources array me se har source ek clickable link hai
// (original article ka url).
export type PublicStoryDTO = {
  id: string
  title: string
  category: string
  sources: { name: string; url: string }[]
  publishedAt: string
}

export function NewsCard({ story }: { story: PublicStoryDTO }) {
  const date = new Date(story.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const isCrypto = story.category === 'crypto'
  return <article className="rounded-2xl border border-white/10 bg-white/[.03] p-6 transition duration-200 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-white/[.05]">
    <div className="mb-3 flex items-center gap-3 text-[11px] text-muted-foreground"><span className={`rounded-full px-2.5 py-0.5 font-medium tracking-wide ${isCrypto ? 'bg-cyan-300/10 text-cyan-200' : 'bg-violet-400/10 text-violet-200'}`}>{isCrypto ? 'CRYPTO' : 'GEOPOLITICAL'}</span><span>{date}</span></div>
    <h3 className="font-serif text-xl leading-snug text-foreground">{story.title}</h3>
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">{story.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-cyan-200">{s.name}<ChevronRight className="size-3" /></a>)}</div>
  </article>
}

export function NewsList({ stories }: { stories: PublicStoryDTO[] }) {
  return <div className="grid gap-4 sm:grid-cols-2">{stories.map((story) => <NewsCard key={story.id} story={story} />)}</div>
}

export { ShieldCheck, Newspaper, Sparkles, ChevronRight, LogOut }
