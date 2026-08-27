import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Admin panel ke "Published" nav item ke liye — public site pe jo
// stories dikh rahi hain, unhi ki poori list yahan admin ko bhi dikhti
// hai (newest first), taake wo apna publish history dekh sake
// (scope Phase 1 #2: "see publish history").

export async function GET() {
  const stories = await prisma.story.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    take: 100,
  })

  const data = stories.map((story) => ({
    id: story.id,
    title: story.title,
    category: story.category,
    sourceCount: story.sourceCount,
    sources: JSON.parse(story.sources) as { name: string; url: string }[],
    publishedAt: (story.publishedAt ?? story.createdAt).toISOString(),
  }))

  return NextResponse.json({ stories: data })
}
