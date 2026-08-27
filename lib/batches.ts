import { prisma } from './prisma'

// Phase 4 — Approval, Concurrency Gate & Publishing (scope Table 4)
//
// Ye file batch/story approve-reject ki saari business logic rakhti hai,
// taake API routes chhote aur simple rahein (wo sirf ye functions call
// karte hain).
//
// Rules:
//   - Admin poora batch approve/reject kar sakta hai, YA individual
//     stories ko.
//   - Approved story turant "published" ho jati hai - koi alag manual
//     publish step nahi hai (acceptance criteria: "Approved items appear
//     on the public news page automatically").
//   - Rejected story sirf "rejected" ban jati hai, publish nahi hoti.
//   - Jab batch ki SAARI stories action ho jayein (koi "shortlisted"
//     baaki na bache), batch khud finalize ho jata hai:
//       - sab approved  -> batch.status = "approved"
//       - sab rejected  -> batch.status = "rejected"
//       - mix dono ka   -> batch.status = "partially_approved"
//     Jab tak koi story "shortlisted" baaki hai, batch "pending" hi
//     rehta hai - isi wajah se naye runs concurrency gate (aggregate.ts)
//     se skip hote rehte hain.

export async function getPendingBatch() {
  return prisma.batch.findFirst({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' }, // sabse purana pending batch pehle dikhao
    include: {
      stories: { orderBy: { createdAt: 'asc' } },
    },
  })
}

async function finalizeBatchIfComplete(batchId: string) {
  const stories = await prisma.story.findMany({ where: { batchId } })
  const stillPending = stories.some((s) => s.status === 'shortlisted')
  if (stillPending) return // kuch stories abhi bhi baaki hain, batch "pending" hi rahega

  const approvedCount = stories.filter((s) => s.status === 'published').length
  const rejectedCount = stories.filter((s) => s.status === 'rejected').length

  let status: string
  if (rejectedCount === 0) status = 'approved'
  else if (approvedCount === 0) status = 'rejected'
  else status = 'partially_approved'

  await prisma.batch.update({
    where: { id: batchId },
    data: { status, reviewedAt: new Date() },
  })
}

export async function approveStory(storyId: string) {
  const story = await prisma.story.findUnique({ where: { id: storyId } })
  if (!story) return { error: 'Story not found.' as const }
  if (story.status !== 'shortlisted') return { error: 'This story was already actioned.' as const }

  await prisma.story.update({
    where: { id: storyId },
    data: { status: 'published', publishedAt: new Date() },
  })

  if (story.batchId) await finalizeBatchIfComplete(story.batchId)
  return { success: true as const }
}

export async function rejectStory(storyId: string) {
  const story = await prisma.story.findUnique({ where: { id: storyId } })
  if (!story) return { error: 'Story not found.' as const }
  if (story.status !== 'shortlisted') return { error: 'This story was already actioned.' as const }

  await prisma.story.update({
    where: { id: storyId },
    data: { status: 'rejected', rejectedAt: new Date() },
  })

  if (story.batchId) await finalizeBatchIfComplete(story.batchId)
  return { success: true as const }
}

export async function approveFullBatch(batchId: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } })
  if (!batch) return { error: 'Batch not found.' as const }
  if (batch.status !== 'pending') return { error: 'This batch was already actioned.' as const }

  // Sirf wo stories jo abhi tak "shortlisted" hain (kisi ne pehle se
  // individually reject/approve nahi ki) - unko ek sath publish karo.
  await prisma.story.updateMany({
    where: { batchId, status: 'shortlisted' },
    data: { status: 'published', publishedAt: new Date() },
  })

  // finalizeBatchIfComplete se hi batch status set karwate hain (na ke
  // hardcoded "approved") - kyunki ho sakta hai kuch stories admin ne
  // ismein se pehle hi individually reject ki hon, us case mein batch
  // "partially_approved" banna chahiye, "approved" nahi.
  await finalizeBatchIfComplete(batchId)

  return { success: true as const }
}

export async function rejectFullBatch(batchId: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } })
  if (!batch) return { error: 'Batch not found.' as const }
  if (batch.status !== 'pending') return { error: 'This batch was already actioned.' as const }

  await prisma.story.updateMany({
    where: { batchId, status: 'shortlisted' },
    data: { status: 'rejected', rejectedAt: new Date() },
  })

  // Yahan bhi finalizeBatchIfComplete hi status decide karta hai - agar
  // kuch stories pehle se approved ho chuki thin, batch "rejected" ki
  // jagah "partially_approved" banega.
  await finalizeBatchIfComplete(batchId)

  return { success: true as const }
}
