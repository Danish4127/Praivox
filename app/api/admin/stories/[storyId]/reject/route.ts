import { NextResponse } from 'next/server'
import { rejectStory } from '@/lib/batches'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params
  const result = await rejectStory(storyId)

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
