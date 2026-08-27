# Phase 5 — Error Handling & Edge Cases

Ye Phase 4 ke upar build hua hai. Neeche wahi 5 items hain jo scope
document ke Table 5 mein the, aur kya add hua:

## 1. Source failure
n8n workflow ke har RSS node mein `onError: continueRegularOutput` set
kar diya hai — agar koi feed down/timeout ho, sirf uska output khaali
aata hai, poora workflow crash nahi hota. "Build Ingest Payload" node ab
har source ka item-count check karta hai; agar 0 hai, ek `sourceErrors`
entry bana kar app ko bhej deta hai. App (`ingest/route.ts`) ye entries
accept kar ke Run row mein save karta hai — Run History page pe dikhti
hain.

**Zaroori:** updated `praivox-news-fetch-workflow.json` ko apne n8n
mein dobara import karo (ya existing workflow ke RSS nodes pe manually
"Continue On Fail" on karo + "Build Ingest Payload" code node ka code
naye wale se replace karo).

## 2. Under-10 fallback (Section 6, open question C)
**Confirmed:** jitni bhi verified stories mil jayein (1 se 10 tak),
utni hi ek chhota batch bana kar Pending Review mein bhej di jati hain.
Sirf 0 verified stories hone par koi batch nahi banta.

## 3. Cross-run duplication
Pehle sirf **rejected** stories dobara shortlist hone se rukti thi. Ab
**published** stories bhi check hoti hain — same-category, similar
title wali story dobara shortlist nahi hogi. ("Still pending" wala case
concurrency gate khud handle karta hai — jab tak koi batch pending hai,
naya run process hi nahi hota.)

## 4. Run logging / audit trail
Naya **Run History** page: `/admin/runs` (sidebar mein link add ho
chuka hai). Har run — completed/skipped/failed — timestamp, items
fetched, source errors, aur kitni stories shortlist huin, sab dikhta
hai.

## 5. Admin brute-force protection
`lib/loginRateLimit.ts` — 15 minute window mein 5 galat attempts ke
baad, us email+IP combination ko 15 minute ke liye lock kar deta hai
(chahe agli baar sahi password hi kyun na diya jaye). In-memory hai
(server restart pe reset hota hai) — is scope (single local/VPS
deployment) ke liye kaafi hai.

---

## Setup — is baar ek naya command chalana hoga

Schema mein 2 naye fields aaye hain (`Run.itemsFetched`,
`Run.sourceErrors`) — migration chalao:

```
npx prisma migrate dev --name phase5_run_logging
```

Uske baad `npm run dev -- --webpack` se app chalao, jaisे pehle karte
the.

## Test kaise karo

1. **Source failure test:** n8n mein kisi ek RSS node ka URL jaan-
   boojh kar galat kar do (jaise ek letter change kar do), workflow
   manually run karo → `/admin/runs` pe us run ke neeche ek orange
   warning line dikhni chahiye ("X: 0 items received...").
2. **Cross-run duplication test:** ek story approve/publish karo, phir
   agle run mein wahi headline (ya kaafi milta julta title) dobara
   bhejo (manual curl se) → wo is baar shortlist nahi honi chahiye.
3. **Run History:** `/admin/runs` khol kar dekho — completed/skipped
   dono tarah ke runs dikhne chahiye timestamps ke sath.
4. **Brute-force lock:** login page pe 5 baar jaan-boojh kar galat
   password daalo → 6th baar pe "Too many failed attempts..." wala
   error aana chahiye, chahe password sahi hi kyun na ho. 15 minute
   baad (ya `.env.local` mein koi bhi field change kar ke server
   restart karne se, kyunki counter memory mein hai) reset ho jayega.
