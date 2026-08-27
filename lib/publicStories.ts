import { prisma } from './prisma'

// Phase 4 — public news page ab real published stories dikhata hai
// (pehle sirf static EmptyState tha). Ye function sirf "published"
// status wali stories deta hai - "shortlisted", "rejected" waghera
// public route pe kabhi nahi dikhti (scope ka security rule: "no
// pending or unapproved content is ever exposed on the public route").

export type PublicStory = {
  id: string
  title: string
  category: string
  sources: { name: string; url: string }[]
  publishedAt: string
}

export async function getPublishedStories(options?: { category?: string; limit?: number; search?: string }): Promise<PublicStory[]> {
  const stories = await prisma.story.findMany({
    where: {
      status: 'published',
      ...(options?.category ? { category: options.category } : {}),
      ...(options?.search ? { title: { contains: options.search, mode: 'insensitive' } } : {}),
    },
    orderBy: { publishedAt: 'desc' },
    take: options?.limit,
  })

  return stories.map((story) => ({
    id: story.id,
    title: story.title,
    category: story.category,
    sources: JSON.parse(story.sources) as { name: string; url: string }[],
    publishedAt: (story.publishedAt ?? story.createdAt).toISOString(),
  }))
}
