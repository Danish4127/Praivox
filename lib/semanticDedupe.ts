import { type StoryCluster, titleSimilarity, SIMILARITY_THRESHOLD } from './dedupe'
import { areSameStory } from './ai'

// Phase 6 — AI-Assisted Semantic Deduplication (scope Table 6)
//
// Plain word-matching (dedupe.ts) already merges obvious duplicates.
// Ye pass sirf "maybe" range ke pairs check karta hai - jahan titles
// thoda milte hain (SIMILARITY_THRESHOLD se kam, lekin bilkul unrelated
// bhi nahi) - AI se pooch kar confirm karta hai ke kya ye asal mein
// EK hi story hai, alag alfaz mein likhi hui.
//
// Bounded by design: total AI calls per run capped, taake ek run kabhi
// bohot lamba ya mehnga na ho jaye.

const MAYBE_RANGE_MIN = 0.1 // isse kam similarity = bilkul unrelated, AI se poochna waste hai
const MAX_AI_DEDUPE_CALLS = 25 // Groq free tier ka 30-requests/minute limit se neeche rakha (safety margin)
const DELAY_BETWEEN_CALLS_MS = 2200 // ~27 calls/minute pace - 30 RPM limit ke andar rehne ke liye

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function applySemanticDedupe(clusters: StoryCluster[]): Promise<StoryCluster[]> {
  // Agar AI configure hi nahi hai, seedha wapis kar do - koi extra kaam
  // nahi (fail-safe: ai.ts khud bhi null return karega, lekin isse
  // bekaar API calls ki koshish bhi nahi hoti)
  if (!process.env.GROQ_API_KEY) return clusters

  const merged = [...clusters]
  const removed = new Set<number>()
  let aiCallsUsed = 0

  for (let i = 0; i < merged.length && aiCallsUsed < MAX_AI_DEDUPE_CALLS; i++) {
    if (removed.has(i)) continue

    for (let j = i + 1; j < merged.length && aiCallsUsed < MAX_AI_DEDUPE_CALLS; j++) {
      if (removed.has(j)) continue
      if (merged[i].category !== merged[j].category) continue

      const similarity = titleSimilarity(merged[i].title, merged[j].title)
      if (similarity < MAYBE_RANGE_MIN || similarity >= SIMILARITY_THRESHOLD) continue // plain matching ne already decide kar diya, ya bilkul unrelated hai

      if (aiCallsUsed > 0) await sleep(DELAY_BETWEEN_CALLS_MS) // rate limit ke andar rehne ke liye har call ke beech thoda rukna
      aiCallsUsed++
      const same = await areSameStory(merged[i].title, merged[j].title)
      if (same !== true) continue // false ya null (AI fail) - safe default: alag hi rehne do

      // Same story confirm hui - j ko i mein merge kar do
      const a = merged[i]
      const b = merged[j]
      for (const source of b.sources) {
        if (!a.sources.some((s) => s.name === source.name)) {
          a.sources.push(source)
        }
      }
      for (const title of b.sourceTitles) {
        if (!a.sourceTitles.includes(title)) a.sourceTitles.push(title)
      }
      a.sourceCount = a.sources.length
      if (b.latestPublishedAt && (!a.latestPublishedAt || b.latestPublishedAt > a.latestPublishedAt)) {
        a.latestPublishedAt = b.latestPublishedAt
      }
      removed.add(j)
    }
  }

  return merged.filter((_, index) => !removed.has(index))
}