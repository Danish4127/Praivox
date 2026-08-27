import { NextResponse, type NextRequest } from 'next/server'
import { processFetchedItems } from '@/lib/aggregate'
import type { RawNewsItem } from '@/lib/dedupe'

// Ye route n8n ke liye hai jab n8n KHUD RSS feeds fetch karta hai
// (n8n ke "RSS Feed Read" nodes se) aur raw items humein bhejta hai.
// Humara app sirf processing karta hai: merge -> dedupe -> verify ->
// shortlist -> batch (Phase 2 ka "fetching" wala hissa ab n8n ke andar
// hai, is route mein nahi).
//
// Secret-key (CRON_SECRET) se protected hai - sirf n8n hi is header ke
// sath call kar sakta hai.
//
// Expected JSON body:
// {
//   "items": [
//     {
//       "title": "Some headline",
//       "url": "https://example.com/article",
//       "sourceName": "Al Jazeera",
//       "category": "geopolitical",   // ya "crypto"
//       "publishedAt": "2026-08-23T10:00:00Z"  // ISO string, ya null
//     },
//     ...
//   ]
// }

type IncomingItem = {
  title?: unknown
  url?: unknown
  sourceName?: unknown
  category?: unknown
  publishedAt?: unknown
}

function parseItems(raw: unknown): { items: RawNewsItem[]; skipped: number } {
  if (!Array.isArray(raw)) return { items: [], skipped: 0 }

  const items: RawNewsItem[] = []
  let skipped = 0

  for (const entry of raw as IncomingItem[]) {
    const title = typeof entry.title === 'string' ? entry.title.trim() : ''
    const url = typeof entry.url === 'string' ? entry.url : ''
    const sourceName = typeof entry.sourceName === 'string' ? entry.sourceName : ''
    const category = entry.category === 'geopolitical' || entry.category === 'crypto'
      ? entry.category
      : null

    // Zaroori fields ke bina item ko skip kar do (poora run fail nahi
    // karna - Phase 5 ki "source failure se poora run fail na ho" wali
    // spirit yahan bhi lagu hoti hai)
    if (!title || !url || !sourceName || !category) {
      skipped++
      continue
    }

    let publishedAt: Date | null = null
    if (typeof entry.publishedAt === 'string') {
      const parsed = new Date(entry.publishedAt)
      publishedAt = Number.isNaN(parsed.getTime()) ? null : parsed
    }

    items.push({ title, url, sourceName, category, publishedAt })
  }

  return { items, skipped }
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on the server.' },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const providedSecret = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null

  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const rawItems = (body as { items?: unknown })?.items
  const { items, skipped } = parseItems(rawItems)

  // Phase 5 — Source failure logging: n8n khud RSS fetch karta hai, to
  // agar koi feed down/error ho (jaise BBC timeout ho jaye), n8n us
  // source ke liye ek sourceErrors entry bhej sakta hai (workflow mein
  // "Build Ingest Payload" node ye detect kar ke bhejta hai). Hum yahan
  // wo entries bhi accept karte hain aur missing-field skips ke saath
  // merge kar ke processFetchedItems() ko de dete hain, taake Run row
  // mein poori error history log ho jaye.
  const rawSourceErrors = (body as { sourceErrors?: unknown })?.sourceErrors
  const n8nSourceErrors: { source: string; message: string }[] = Array.isArray(rawSourceErrors)
    ? rawSourceErrors
        .filter(
          (e): e is { source: string; message: string } =>
            !!e && typeof e === 'object' && typeof (e as any).source === 'string' && typeof (e as any).message === 'string'
        )
    : []

  const sourceErrors = [
    ...n8nSourceErrors,
    ...(skipped > 0 ? [{ source: 'n8n-ingest', message: `${skipped} item(s) skipped: missing/invalid fields` }] : []),
  ]

  try {
    const summary = await processFetchedItems(items, sourceErrors)
    return NextResponse.json(summary)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 }
    )
  }
}
