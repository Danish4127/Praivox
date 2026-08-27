// Phase 3 — Verification & Shortlisting
//
// Ye file wahi kaam karti hai jo scope document ke Phase 3 mein likha hai:
//   1. Sirf "verified" stories ko aage jaane do (2+ independent sources)
//   2. In verified stories mein se best 10 chuno
//
// Ranking rule (open question B ka default jawab, jab tak client confirm
// na kare): sabse nayi khabrein pehle, aur dono categories (geopolitical
// / crypto) ko fair mauka — taake agar geopolitical ki khabrein zyada
// hon to crypto poori tarah dab na jaye.

import type { StoryCluster } from './dedupe'

export type ShortlistResult = {
  selected: StoryCluster[]
  verifiedCount: number
  excludedUnverifiedCount: number
}

const SHORTLIST_SIZE = 10

/**
 * Verified pool (sourceCount >= 2) mein se, category-fairness ke sath,
 * top N (default 10) stories chunta hai — sabse nayi pehle.
 *
 * Fallback (open question C ka default): agar verified stories 10 se
 * kam hain, jitni bhi hain utni hi return kar deta hai (chhota batch) —
 * run fail nahi hota, bas batch mein 10 se kam items hote hain.
 */
export function shortlistTopStories(
  clusters: StoryCluster[],
  size: number = SHORTLIST_SIZE
): ShortlistResult {
  const verified = clusters.filter((c) => c.sourceCount >= 2)
  const unverified = clusters.length - verified.length

  // Recency ke hisaab se sort karo (sabse nayi pehle; jinki date nahi
  // hai unko sabse peeche daal do)
  const byRecency = [...verified].sort((a, b) => {
    const aTime = a.latestPublishedAt ? a.latestPublishedAt.getTime() : 0
    const bTime = b.latestPublishedAt ? b.latestPublishedAt.getTime() : 0
    return bTime - aTime
  })

  // Category ke hisaab se alag queues banao (har queue apne andar
  // recency order mein hai)
  const queuesByCategory = new Map<string, StoryCluster[]>()
  for (const story of byRecency) {
    const list = queuesByCategory.get(story.category) ?? []
    list.push(story)
    queuesByCategory.set(story.category, list)
  }
  const categories = Array.from(queuesByCategory.keys())

  // Round-robin: baari baari har category se ek story uthao, taake
  // koi ek category doosri ko poori tarah dabaa na sake
  const selected: StoryCluster[] = []
  let stillHasItems = true
  while (selected.length < size && stillHasItems) {
    stillHasItems = false
    for (const category of categories) {
      if (selected.length >= size) break
      const queue = queuesByCategory.get(category)!
      if (queue.length > 0) {
        selected.push(queue.shift()!)
        stillHasItems = true
      }
    }
  }

  return {
    selected,
    verifiedCount: verified.length,
    excludedUnverifiedCount: unverified,
  }
}
