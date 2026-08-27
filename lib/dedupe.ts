// Ye file "duplicate" news items ko dhoond kar ek group mein daal deti hai.
// Koi AI use nahi ki - sirf titles ke words compare karte hain.
//
// Tareeqa: har title ko chhote-chhote words mein tod do, phir do titles
// compare karo ke unke words kitne match karte hain (0 se 1 tak ka score,
// jise "Jaccard similarity" kehte hain). Agar score threshold se zyada
// hai, dono ek hi story maani jayengi.

export type RawNewsItem = {
  title: string
  url: string
  sourceName: string
  category: string
  publishedAt: Date | null
}

export type StoryCluster = {
  title: string // sabse pehle mila title use karte hain
  category: string
  sourceCount: number
  sources: { name: string; url: string }[]
  latestPublishedAt: Date | null
  // Phase 6 — AI consistency scoring ke liye: har contributing source
  // ka apna ASLI headline text (kyunki har publisher apne alfaz mein
  // likhta hai, sirf ek "title" kaafi nahi hai comparison ke liye)
  sourceTitles: string[]
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'on',
  'for', 'and', 'or', 'with', 'at', 'by', 'from', 'as', 'it', 'its',
  // Phase 5.1 — thoda expand kiya (headline-matching test se pata chala
  // ke ye generic words alag publishers ke headlines mein bohot alag
  // andaaz mein aate hain, aur inhe hataane se genuine same-story
  // matches ka score kaafi improve hota hai)
  'says', 'say', 'said', 'after', 'over', 'amid', 'up', 'out', 'into',
  'than', 'more', 'most', 'now', 'still', 'about', 'new', 'who', 'what',
  'why', 'how', 'when', 'where', 'not', 'no', 'has', 'have', 'will',
  'be', 'their', 'his', 'her', 'you', 'we', 'us', 'they', 'he', 'she',
  'can', 'could', 'would', 'should', 'may', 'might', 'just',
])

function titleToWordSet(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      // Punctuation ko SPACE se replace karte hain (khaali string se nahi) -
      // taake "US-Canada" jaisi hyphenated cheezein "us" + "canada" do
      // alag words bane, na ke ek jud kar "uscanada" ban jaye (jo kabhi
      // match nahi karta).
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word))
  )
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const word of a) if (b.has(word)) intersection++
  const union = a.size + b.size - intersection
  return intersection / union
}

// Phase 5.1 — real n8n data se test kiya (251 items aaye the, 0 verified
// hui thin kyunki alag publishers ke titles kabhi 50% match nahi karte -
// har outlet apna khud ka headline likhta hai). 0.5 bohot strict tha;
// 0.25 pe genuine same-story pairs (jaise "Trump lashes out after
// US-Canada talks..." aur "Carney Stands Up to Trump in U.S.-Canada
// Trade War") 0.25-0.44 range mein aate hain, jabke unrelated stories
// 0-0.08 pe hi rehti hain - achha separation hai. Isse behtar accuracy
// ke liye Phase 6 (AI-assisted semantic dedup) proper fix hoga.
export const SIMILARITY_THRESHOLD = 0.25

// Phase 4 mein use hota hai: kisi naye cluster ka title kisi purani
// (jaise rejected) story ke title se kitna milta hai, ye check karne ke
// liye. Wahi jaccard-similarity logic, bas do plain titles ke beech.
export function titleSimilarity(a: string, b: string): number {
  return jaccardSimilarity(titleToWordSet(a), titleToWordSet(b))
}

/**
 * Bahut saari raw news items leta hai (alag-alag sources se), aur
 * unhe groups mein bant deta hai - har group ek "unique story" hai,
 * jise kitne sources ne cover kiya (sourceCount) uske sath.
 */
export function mergeAndDedupe(items: RawNewsItem[]): StoryCluster[] {
  const clusters: (StoryCluster & { wordSet: Set<string> })[] = []

  for (const item of items) {
    const wordSet = titleToWordSet(item.title)

    // Same category ke andar hi matching clusters dhoondo
    const match = clusters.find(
      (cluster) =>
        cluster.category === item.category &&
        jaccardSimilarity(cluster.wordSet, wordSet) >= SIMILARITY_THRESHOLD
    )

    if (match) {
      // Ye story pehle se kisi cluster mein hai -> naya source add kar do
      const alreadyHasSource = match.sources.some((s) => s.name === item.sourceName)
      if (!alreadyHasSource) {
        match.sources.push({ name: item.sourceName, url: item.url })
        match.sourceCount += 1
        match.sourceTitles.push(item.title)
      }
      if (item.publishedAt && (!match.latestPublishedAt || item.publishedAt > match.latestPublishedAt)) {
        match.latestPublishedAt = item.publishedAt
      }
    } else {
      // Nayi story -> naya cluster banao
      clusters.push({
        title: item.title,
        category: item.category,
        sourceCount: 1,
        sources: [{ name: item.sourceName, url: item.url }],
        sourceTitles: [item.title],
        latestPublishedAt: item.publishedAt,
        wordSet,
      })
    }
  }

  // wordSet ko wapas hatao (wo sirf internal use ke liye tha)
  return clusters.map(({ wordSet, ...cluster }) => cluster)
}
