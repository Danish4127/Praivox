import { NextResponse } from 'next/server'
import { approveStory } from '@/lib/batches'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params
  const result = await approveStory(storyId)

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
