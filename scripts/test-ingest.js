// Test script — proves the ingest pipeline (dedupe -> verify -> shortlist
// -> batch) actually works, WITHOUT depending on real RSS feeds happening
// to cover the same story twice in the same hour.
//
// Why this exists: with only 3 sources per category, two outlets rarely
// cover the exact same story in the same run — so "0 shortlisted" from
// real n8n runs doesn't tell you whether the CODE works, just whether
// today's news happened to overlap. This script sends 2 sources per
// category with intentionally similar headlines (same words: names,
// numbers, key terms) so a match is guaranteed if the pipeline is
// working correctly.
//
// Usage:
//   node scripts/test-ingest.js
//   node scripts/test-ingest.js http://localhost:3000 your-cron-secret
//
// Or set env vars: INGEST_URL and CRON_SECRET (same value as your
// .env.local), then just: node scripts/test-ingest.js

const url = process.argv[2] || process.env.INGEST_URL || 'http://localhost:3000'
const secret = process.argv[3] || process.env.CRON_SECRET

if (!secret) {
  console.error('Missing CRON_SECRET. Pass it as the 2nd argument, or set CRON_SECRET in your environment.')
  console.error('Example: node scripts/test-ingest.js http://localhost:3000 your-cron-secret')
  process.exit(1)
}

const now = new Date().toISOString()
// A unique tag per run — without this, re-running the script would produce
// titles that match your PREVIOUS test run's title too closely, and the
// cross-run dedupe filter (lib/aggregate.ts "recentActioned") would
// correctly exclude it as already-actioned. This keeps each test run's
// story cluster distinct from earlier ones so you can run this repeatedly.
const runTag = `test${Date.now()}`

// Two sources per category, deliberately worded to share enough words
// to clear SIMILARITY_THRESHOLD (0.25) in lib/dedupe.ts -> guaranteed
// verified (2+ source) cluster if the pipeline logic is correct.
const items = [
  // --- geopolitical: should cluster together (shared words: ukraine,
  // russia, peace, talks, geneva) ---
  { title: `Ukraine and Russia hold new peace talks in Geneva ${runTag}`, url: `https://example.com/${runTag}-geo-1`, sourceName: 'BBC World', category: 'geopolitical', publishedAt: now },
  { title: `Russia and Ukraine peace talks resume in Geneva ${runTag}`, url: `https://example.com/${runTag}-geo-2`, sourceName: 'NYT World', category: 'geopolitical', publishedAt: now },
  // a single-source noise item — should NOT get verified (only 1 source)
  { title: `Local elections postponed in southern region amid unrest ${runTag}`, url: `https://example.com/${runTag}-geo-3`, sourceName: 'The Guardian', category: 'geopolitical', publishedAt: now },

  // --- crypto: should cluster together (shared words: bitcoin, surges,
  // 70000, etf, inflows) ---
  { title: `Bitcoin price surges past 70000 after ETF inflows ${runTag}`, url: `https://example.com/${runTag}-crypto-1`, sourceName: 'CoinDesk', category: 'crypto', publishedAt: now },
  { title: `Bitcoin surges past 70000 as ETF inflows accelerate ${runTag}`, url: `https://example.com/${runTag}-crypto-2`, sourceName: 'Decrypt', category: 'crypto', publishedAt: now },
  // single-source noise item — should NOT get verified
  { title: `New DeFi protocol launches on layer 2 network ${runTag}`, url: `https://example.com/${runTag}-crypto-3`, sourceName: 'CoinTelegraph', category: 'crypto', publishedAt: now },
]

async function main() {
  console.log(`POSTing ${items.length} test items to ${url}/api/cron/ingest ...`)

  const res = await fetch(`${url}/api/cron/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ items, sourceErrors: [] }),
  })

  const body = await res.json()

  if (!res.ok) {
    console.error(`Request failed (${res.status}):`, body)
    process.exit(1)
  }

  console.log('\nResult:', JSON.stringify(body, null, 2))

  console.log('\n--- What SHOULD have happened ---')
  console.log('candidateCount: 4 (2 geopolitical clusters + 2 crypto clusters, after the paired headlines merge)')
  console.log('verifiedCount: 2 (one geopolitical cluster with 2 sources, one crypto cluster with 2 sources)')
  console.log('shortlistedCount: 2 (both verified clusters get shortlisted)')
  console.log('\nIf shortlistedCount is 0 here, the bug is in the CODE (dedupe/verify logic), not in your RSS luck.')
  console.log('If shortlistedCount is 2 here but real n8n runs still give 0, the CODE is fine — it just means')
  console.log('your 6 live RSS feeds genuinely aren\'t covering the same specific story in the same hour.')
  console.log('\nNote: if a batch is currently "Pending Review", this run will be SKIPPED (concurrency gate) —')
  console.log('approve/reject the pending batch first, then re-run this script.')
  console.log('\nYou can safely re-run this script multiple times — each run gets a unique tag so it won\'t')
  console.log('be excluded as a duplicate of a previous test run.')
}

main().catch((err) => {
  console.error('Script failed:', err)
  process.exit(1)
})
