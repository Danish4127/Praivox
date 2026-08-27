import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Client requirement (added after Phase 6): a 7-day record of what
// happened in the review queue, split into two separate lists —
// published stories and rejected stories — each covering only the
// last 7 days.
//
// Published uses the existing publishedAt (set in lib/batches.ts on
// approve). Rejected uses the new rejectedAt field (added specifically
// for this requirement — rejections previously had no timestamp at all,
// see prisma/schema.prisma).

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export async function GET() {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS)

  const [published, rejected] = await Promise.all([
    prisma.story.findMany({
      where: { status: 'published', publishedAt: { gte: cutoff } },
      orderBy: { publishedAt: 'desc' },
    }),
    prisma.story.findMany({
      where: { status: 'rejected', rejectedAt: { gte: cutoff } },
      orderBy: { rejectedAt: 'desc' },
    }),
  ])

  const mapStory = (story: (typeof published)[number], dateField: 'publishedAt' | 'rejectedAt') => ({
    id: story.id,
    title: story.title,
    category: story.category,
    sourceCount: story.sourceCount,
    sources: JSON.parse(story.sources) as { name: string; url: string }[],
    date: (dateField === 'publishedAt' ? story.publishedAt : story.rejectedAt)?.toISOString() ?? null,
  })

  return NextResponse.json({
    rangeStart: cutoff.toISOString(),
    rangeEnd: new Date().toISOString(),
    published: published.map((s) => mapStory(s, 'publishedAt')),
    rejected: rejected.map((s) => mapStory(s, 'rejectedAt')),
  })
}
