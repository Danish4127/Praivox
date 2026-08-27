import { NextResponse } from 'next/server'
import { getPendingBatch } from '@/lib/batches'

// Admin panel ki "Pending Review" screen isi route se data leti hai.
// proxy.ts pehle se hi isko protect kar raha hai (/api/admin/** sab
// protected hai, login/logout ke ilawa) - yahan alag se auth check
// dobara likhne ki zaroorat nahi.

export async function GET() {
  const batch = await getPendingBatch()

  if (!batch) {
    return NextResponse.json({ batch: null })
  }

  return NextResponse.json({
    batch: {
      id: batch.id,
      createdAt: batch.createdAt,
      stories: batch.stories.map((story) => ({
        id: story.id,
        title: story.title,
        category: story.category,
        sourceCount: story.sourceCount,
        sources: JSON.parse(story.sources) as { name: string; url: string }[],
        status: story.status,
        aiSummary: story.aiSummary,
        consistencyScore: story.consistencyScore,
      })),
    },
  })
}
