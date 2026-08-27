// Phase 6 — AI-Assisted Enhancements (OPTIONAL, scope Table 6)
//
// Zaroori usool: agar AI call fail ho jaye (timeout, rate limit, no
// API key, network issue - kuch bhi), poora function null return
// karta hai aur KABHI throw nahi karta. Caller (lib/aggregate.ts) is
// null ko handle karta hai aur normal processing continue rakhta hai -
// scope ki apni requirement hai: "The core system (Phases 1-5) must
// be fully functional without any AI dependency."
//
// Provider: Groq (free tier - https://console.groq.com). 2026-08 mein
// Gemini se switch kiya - Groq ka free tier zyada generous hai
// (1000 req/day is model ke liye) aur bohot fast hai. OpenAI-compatible
// REST endpoint hai, isliye koi SDK install nahi ki.

const GROQ_MODEL = 'openai/gpt-oss-120b' // Groq free tier, fast + achi quality
const AI_TIMEOUT_MS = 8000 // 8 second - isse zyada wait nahi karte, aage badh jate hain

async function callGroq(prompt: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null // AI configured hi nahi hai - chup-chaap skip

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 500, // reasoning model hai - "sochne" ke tokens bhi isi budget se katte hain, isliye 200 kaafi nahi tha (jawab khaali aa raha tha)
        reasoning_effort: 'low', // kam "sochna" chahiye - ye ek seedha YES/NO sawal hai, deep reasoning ki zaroorat nahi
        include_reasoning: false, // reasoning text response mein wapis mat bhejo - sirf final answer chahiye
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      // DEBUG (temporary) - abhi confirm karna hai ke switch kaam kar
      // raha hai, baad mein ye 3 lines hata sakte hain.
      const bodyText = await res.text().catch(() => '(could not read body)')
      console.log(`[ai-debug] Groq call failed: HTTP ${res.status} ${res.statusText} — ${bodyText.slice(0, 300)}`)
      return null // rate-limited ya koi aur API error - fail silently
    }

    const data = await res.json()
    const text: string | undefined = data?.choices?.[0]?.message?.content
    if (!text) {
      console.log(`[ai-debug] Groq returned 200 but no usable text: ${JSON.stringify(data).slice(0, 300)}`)
    }
    return text?.trim() || null
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError'
    console.log(`[ai-debug] Groq call threw${isAbort ? ' (TIMEOUT)' : ''}: ${err instanceof Error ? err.message : String(err)}`)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Semantic dedup: do headlines ALFAZ mein alag hon lekin ek hi
 * underlying story ho, to AI se pooch lo (plain word-matching
 * (dedupe.ts) ye pakad nahi paati). Sirf "maybe" range ke pairs pe
 * call hoti hai (aggregate.ts mein), taake AI calls limited rahein.
 *
 * Return: true/false = AI ne confidently bataya, null = AI unavailable
 * ya fail hui (is case mein caller ye pair ko ALAG hi maanega -
 * "safe default": AI fail hone se zyada merging nahi hogi, sirf utni
 * hi jitni plain matching pehle se karti thi).
 */
export async function areSameStory(titleA: string, titleB: string): Promise<boolean | null> {
  const prompt = `You are helping deduplicate a news feed. Are these two headlines about the SAME underlying real-world news event, even if worded differently by different publishers? Answer with exactly one word: YES or NO.

Headline A: ${titleA}
Headline B: ${titleB}`

  const response = await callGroq(prompt)
  if (!response) return null

  const normalized = response.toUpperCase()
  if (normalized.startsWith('YES')) return true
  if (normalized.startsWith('NO')) return false
  return null // unexpected response format - treat as "don't know"
}

/**
 * Ek chhota, neutral, ek-line restatement banata hai - sirf headline se
 * (poora article text pipeline mein maujood nahi hai, isliye ye "AI
 * summary" nahi, ek short caption hai - naye facts fabricate nahi
 * karta).
 *
 * Return: string, ya null agar AI available/working nahi.
 */
export async function generateHeadlineCaption(
  title: string,
  sourceCount: number
): Promise<string | null> {
  const prompt = `Rewrite this news headline as a single short, neutral sentence (max 25 words) for a news aggregator caption. Do NOT add any facts, numbers, or details that are not already in the headline - only rephrase what's given. Do not mention that you are rephrasing.

Headline: ${title}
(Corroborated by ${sourceCount} independent sources)

Respond with ONLY the one-sentence caption, nothing else.`

  return callGroq(prompt)
}

/**
 * Headline-level corroboration confidence: kitne sources ne cover kiya
 * aur unke headlines ka framing kitna consistent hai. Ye FULL fact-
 * checking NAHI hai (poora article text maujood nahi hai) - sirf ek
 * signal hai jo admin ko batata hai "in sources ke headlines ek jaisi
 * kahani bata rahe hain" ya "thoda alag angle se".
 *
 * Return: 'high' | 'medium' | 'low', ya null agar AI fail ho.
 */
export async function scoreConsistency(
  title: string,
  sourceTitles: string[]
): Promise<'high' | 'medium' | 'low' | null> {
  if (sourceTitles.length < 2) return null // scoring ka matlab hi nahi agar 1 hi source hai

  const prompt = `These are headlines from different news outlets, all reporting on what appears to be the same story. Based ONLY on how consistent their framing/facts appear at the headline level (not full articles, which you don't have access to), rate corroboration confidence as exactly one word: HIGH, MEDIUM, or LOW.

Headlines:
${sourceTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`

  const response = await callGroq(prompt)
  if (!response) return null

  const normalized = response.toUpperCase()
  if (normalized.startsWith('HIGH')) return 'high'
  if (normalized.startsWith('MEDIUM')) return 'medium'
  if (normalized.startsWith('LOW')) return 'low'
  return null
}