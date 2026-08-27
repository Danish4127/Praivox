import { NextResponse } from 'next/server'
import { rejectFullBatch } from '@/lib/batches'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params
  const result = await rejectFullBatch(batchId)

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
