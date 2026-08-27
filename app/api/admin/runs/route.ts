import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Phase 5 — Run logging / audit trail (scope Table 5 #4: "Every run —
// executed, skipped, or failed — is logged with timestamp, outcome, and
// reason, so run history is auditable from the admin panel or logs.")
//
// Ye route un logon ke liye hai jo Prisma Studio khol kar dekhne ki
// jagah seedha /admin/runs page se dekhna chahte hain.

export async function GET() {
  const runs = await prisma.run.findMany({
    orderBy: { startedAt: 'desc' },
    take: 50, // sirf recent 50 - poori history chahiye ho to pagination baad mein add ho sakti hai
    include: {
      batch: { select: { id: true, status: true } },
      _count: { select: { stories: true } },
    },
  })

  const data = runs.map((run) => ({
    id: run.id,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    status: run.status,
    skipReason: run.skipReason,
    errorDetail: run.errorDetail,
    itemsFetched: run.itemsFetched,
    candidateCount: run.candidateCount,
    verifiedCount: run.verifiedCount,
    sourceErrors: run.sourceErrors ? JSON.parse(run.sourceErrors) : [],
    storiesCount: run._count.stories,
    batchId: run.batch?.id ?? null,
    batchStatus: run.batch?.status ?? null,
  }))

  return NextResponse.json({ runs: data })
}
