import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// Client requirement: a record of published stories and rejected stories,
// tracked separately, over any date range the admin picks (originally
// asked as "last 7 days", then upgraded to a from/to calendar picker).
//
// ?from=YYYY-MM-DD&to=YYYY-MM-DD — both optional. Defaults to the last
// 7 days if not provided (keeps the old behavior as the default view).
//
// Legacy rejected stories (rejected before rejectedAt existed) have no
// rejectedAt at all. Rather than hide them forever, we fall back to
// createdAt for those specific rows and flag them as dateUnknown so the
// UI can say "actual rejection date wasn't recorded" instead of lying
// about it.

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function parseDateParam(value: string | null, fallback: Date): Date {
  if (!value) return fallback
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const now = new Date()
  const defaultFrom = new Date(now.getTime() - SEVEN_DAYS_MS)

  const from = parseDateParam(searchParams.get('from'), defaultFrom)
  // "to" should include the whole selected day, not cut off at midnight
  const toRaw = parseDateParam(searchParams.get('to'), now)
  const to = new Date(toRaw)
  to.setHours(23, 59, 59, 999)

  const [publishedRows, rejectedRows] = await Promise.all([
    prisma.story.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      take: 1000,
    }),
    prisma.story.findMany({
      where: { status: 'rejected' },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
  ])

  function inRange(date: Date) {
    return date >= from && date <= to
  }

  const published = publishedRows
    .map((story) => {
      const effectiveDate = story.publishedAt ?? story.createdAt
      return {
        id: story.id,
        title: story.title,
        category: story.category,
        sourceCount: story.sourceCount,
        sources: JSON.parse(story.sources) as { name: string; url: string }[],
        date: effectiveDate.toISOString(),
        dateUnknown: !story.publishedAt,
      }
    })
    .filter((s) => inRange(new Date(s.date)))

  const rejected = rejectedRows
    .map((story) => {
      const effectiveDate = story.rejectedAt ?? story.createdAt
      return {
        id: story.id,
        title: story.title,
        category: story.category,
        sourceCount: story.sourceCount,
        sources: JSON.parse(story.sources) as { name: string; url: string }[],
        date: effectiveDate.toISOString(),
        // No rejectedAt at all -> this row predates the field, we're
        // showing createdAt instead, so flag it as not a real reject date.
        dateUnknown: !story.rejectedAt,
      }
    })
    .filter((s) => inRange(new Date(s.date)))

  return NextResponse.json({
    rangeStart: from.toISOString(),
    rangeEnd: to.toISOString(),
    published,
    rejected,
  })
}
