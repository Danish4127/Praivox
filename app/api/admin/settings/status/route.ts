import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateAdminCredential } from '@/lib/adminCredential'

// Settings page ke "Integration status" card ke liye - dikhata hai ke
// n8n se aakhri baar kab data aaya, aur CRON_SECRET set hai ya nahi
// (full secret kabhi bhi bahar nahi bhejte, sirf last 4 characters,
// taake pehchan ho sake sahi credential n8n mein daali hai ya nahi).

export async function GET() {
  const cronSecret = process.env.CRON_SECRET
  const credential = await getOrCreateAdminCredential()

  const lastRun = await prisma.run.findFirst({
    orderBy: { startedAt: 'desc' },
    select: { startedAt: true, status: true, itemsFetched: true },
  })

  return NextResponse.json({
    adminEmail: credential.email,
    cronSecretConfigured: Boolean(cronSecret),
    cronSecretHint: cronSecret ? `••••${cronSecret.slice(-4)}` : null,
    lastRun: lastRun
      ? { startedAt: lastRun.startedAt, status: lastRun.status, itemsFetched: lastRun.itemsFetched }
      : null,
  })
}
