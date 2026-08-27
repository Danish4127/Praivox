import { prisma } from './prisma'
import { mergeAndDedupe, titleSimilarity, SIMILARITY_THRESHOLD, type RawNewsItem } from './dedupe'
import { shortlistTopStories } from './rank'
import { applySemanticDedupe } from './semanticDedupe'
import { generateHeadlineCaption, scoreConsistency } from './ai'

export type AggregationSummary = {
  runId: string
  status: 'completed' | 'skipped' | 'failed'
  totalItemsFetched: number
  totalCandidates: number
  verifiedCount: number
  shortlistedCount: number
  batchId: string | null
  sourceErrors: { source: string; message: string }[]
  skipReason?: string
}

// Phase 4/5 — kitni recent rejected/published stories check karni hain
// jab naye clusters ko unke against filter kar rahe hon (performance ke
// liye poori history nahi, bas ek reasonable window).
const RECENT_LOOKBACK = 200

/**
 * Phase 2 + Phase 3 ka poora "processing" kaam karta hai, RAW items lekar:
 *   1. Duplicate stories ko group karna                  (Phase 2)
 *   2. Sirf verified (2+ source) stories ko aage badhaana (Phase 3)
 *   3. Verified pool mein se top 10 chunna                (Phase 3)
 *   4. In 10 ko ek Batch bana kar "Pending Review" karna   (Phase 3)
 *
 * Ye function ye NAHI karta ke news kahan se aayi - fetching poori tarah
 * n8n ka kaam hai (n8n ke RSS Feed Read nodes). Ye sirf n8n se aaye hue
 * raw items ko process karta hai: /api/cron/ingest ka yahi ek caller hai.
 */
export async function processFetchedItems(
  items: RawNewsItem[],
  sourceErrors: { source: string; message: string }[] = []
): Promise<AggregationSummary> {
  // Phase 4 — Concurrency gate (critical rule, scope Table 4 #3):
  // agar koi batch abhi bhi "Pending Review" mein baitha hai, to naya
  // run bilkul process nahi hota - koi merge/dedupe/verify/shortlist
  // nahi, sirf ek "skipped" Run row log hoti hai. n8n ne RSS items to
  // fetch kar hi liye the (wo fetching hamare control se bahar hai),
  // lekin PROCESSING yahin ruk jaati hai jab tak admin pending batch ko
  // action na kar de.
  const pendingBatch = await prisma.batch.findFirst({ where: { status: 'pending' } })

  if (pendingBatch) {
    const skipReason = `Batch ${pendingBatch.id} is still Pending Review — new run skipped until it's approved/rejected.`
    const skippedRun = await prisma.run.create({
      data: {
        status: 'skipped',
        finishedAt: new Date(),
        skipReason,
        itemsFetched: items.length,
        sourceErrors: sourceErrors.length ? JSON.stringify(sourceErrors) : null,
      },
    })
    return {
      runId: skippedRun.id,
      status: 'skipped',
      totalItemsFetched: items.length,
      totalCandidates: 0,
      verifiedCount: 0,
      shortlistedCount: 0,
      batchId: null,
      sourceErrors,
      skipReason,
    }
  }

  const run = await prisma.run.create({
    data: {
      status: 'completed', // shuru mein optimistic, neeche update karenge agar sab fail ho jaye
      itemsFetched: items.length,
      sourceErrors: sourceErrors.length ? JSON.stringify(sourceErrors) : null,
    },
  })

  try {
    // Agar EK bhi item nahi mila, to run ko "failed" mark karo
    if (items.length === 0) {
      await prisma.run.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          errorDetail: 'No items received: ' + JSON.stringify(sourceErrors),
        },
      })
      return {
        runId: run.id,
        status: 'failed',
        totalItemsFetched: 0,
        totalCandidates: 0,
        verifiedCount: 0,
        shortlistedCount: 0,
        batchId: null,
        sourceErrors,
      }
    }

    const clusters = mergeAndDedupe(items)

    // Phase 6 — AI-Assisted Semantic Deduplication (OPTIONAL). Agar
    // GROQ_API_KEY set nahi hai, ye function turant clusters wapis kar
    // deta hai bina kuch kiye (dekho lib/semanticDedupe.ts). Agar AI
    // configured hai, "maybe" range ke pairs ko AI se double-check karke
    // aur zyada duplicates pakadta hai jo plain word-matching se chhoot
    // jate hain (alag alfaz, same story).
    const semanticallyDeduped = await applySemanticDedupe(clusters)

    // Phase 4/5 (scope Table 4 #2 + Table 5 #3 "Cross-run duplication"):
    // "Rejected items are discarded and excluded from being reconsidered
    // in future runs where possible" + "avoid re-shortlisting a story
    // that was already published, or is still pending, from a previous
    // batch." ("still pending" ka case concurrency gate se already cover
    // ho jata hai - jab tak ek batch pending hai, koi naya run process
    // hi nahi hota - isliye yahan sirf terminal states: rejected aur
    // published check karte hain.) Same similarity logic jo dedupe mein
    // use hoti hai - agar title kaafi milta julta hai, cluster exclude.
    const recentActioned = await prisma.story.findMany({
      where: { status: { in: ['rejected', 'published'] } },
      select: { title: true, category: true },
      orderBy: { createdAt: 'desc' },
      take: RECENT_LOOKBACK,
    })

    const eligibleClusters = recentActioned.length
      ? semanticallyDeduped.filter(
          (cluster) =>
            !recentActioned.some(
              (actioned) =>
                actioned.category === cluster.category &&
                titleSimilarity(actioned.title, cluster.title) >= SIMILARITY_THRESHOLD
            )
        )
      : semanticallyDeduped

    // Phase 3: sirf verified (2+ source) stories mein se top 10 chuno.
    // Unverified (single-source) stories yahin exclude ho jati hain -
    // wo database mein save hi nahi hoti (scope ka rule: "Unverified
    // single-source stories are excluded").
    const { selected, verifiedCount } = shortlistTopStories(eligibleClusters)

    let batchId: string | null = null

    if (selected.length > 0) {
      const batch = await prisma.batch.create({
        data: { status: 'pending', runId: run.id },
      })
      batchId = batch.id

      // Phase 6 — AI summary + consistency score, sirf in 10 (ya kam)
      // shortlisted stories ke liye - is se pehle sab candidates ke
      // liye AI call karna waste hota (jo shortlist mein aayi hi nahi).
      // Sequentially chalate hain (ek ek karke, thodi delay ke sath) -
      // Groq free tier ka 30-requests/minute limit hai, aur ye sab
      // parallel mein bhejne se (jaise pehle Promise.all se hota tha)
      // wahi limit turant toot jata hai. Har call apne aap fail-safe hai
      // (lib/ai.ts) - agar AI down/unconfigured hai, aiSummary/
      // consistencyScore null reh jate hain, story phir bhi normally
      // shortlist hoti hai.
      const enrichments: { summary: string | null; consistency: 'high' | 'medium' | 'low' | null }[] = []
      for (const cluster of selected) {
        if (enrichments.length > 0) await new Promise((resolve) => setTimeout(resolve, 2200))
        const summary = await generateHeadlineCaption(cluster.title, cluster.sourceCount)
        await new Promise((resolve) => setTimeout(resolve, 2200))
        const consistency = await scoreConsistency(cluster.title, cluster.sourceTitles)
        enrichments.push({ summary, consistency })
      }

      // Selected top-10 (ya kam, agar 10 se kam verified milein) ko
      // Story rows ke roop mein save karo, seedha "shortlisted" status
      // ke sath, aur naye batch se link kar do.
      await prisma.story.createMany({
        data: selected.map((cluster, index) => ({
          title: cluster.title,
          category: cluster.category,
          sourceCount: cluster.sourceCount,
          sources: JSON.stringify(cluster.sources),
          verified: true,
          status: 'shortlisted',
          publishedAt: null,
          runId: run.id,
          batchId: batch.id,
          aiSummary: enrichments[index].summary,
          consistencyScore: enrichments[index].consistency,
        })),
      })
    }
    // Open question C (10 se kam verified milne par kya karein) client se
    // CONFIRM ho chuka hai: "jitni mil jayein publish kar do" - isliye
    // jitni bhi verified stories milein (1 se 10 tak), utni hi ek chhota
    // batch bana kar Pending Review mein bhej di jati hain. Sirf tab
    // batch nahi banta jab 'selected' bilkul khaali ho (0 verified) -
    // us surat mein run "completed" hi mana jata hai, bas 0 shortlisted
    // stories ke sath, aur agla run normally chalta rahega.

    await prisma.run.update({
      where: { id: run.id },
      data: {
        status: 'completed',
        finishedAt: new Date(),
        candidateCount: semanticallyDeduped.length,
        verifiedCount,
        shortlistedCount: selected.length,
      },
    })

    return {
      runId: run.id,
      status: 'completed',
      totalItemsFetched: items.length,
      totalCandidates: semanticallyDeduped.length,
      verifiedCount,
      shortlistedCount: selected.length,
      batchId,
      sourceErrors,
    }
  } catch (error) {
    // Kuch bilkul unexpected fail ho gaya (jaise database error)
    await prisma.run.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        errorDetail: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}