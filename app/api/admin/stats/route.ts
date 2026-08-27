import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// This gives the admin dashboard real numbers instead of the hardcoded
// 0s that were there before. Right now it will genuinely return 0 for
// everything, because the database has no stories in it yet - that's
// expected until the news-fetching step is built.

export async function GET() {
  const [pending, published, rejected, todaysRuns] = await Promise.all([
    prisma.story.count({ where: { status: 'shortlisted' } }),
    prisma.story.count({ where: { status: 'published' } }),
    prisma.story.count({ where: { status: 'rejected' } }),
    prisma.run.count({
      where: {
        startedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)), // start of today
        },
      },
    }),
  ])

  return NextResponse.json({ pending, published, rejected, todaysRuns })
}
