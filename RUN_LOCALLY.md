# Praivox Frontend — Ab Real Login Ke Sath

Ye wahi frontend hai jo aapne v0.dev se banaya, lekin ab isme **asli, secure
admin login** lag chuka hai (pehle wala fake/demo login hataa diya gaya hai).

## Kya badla hai

- Pehle: password code mein likha hua tha (`praivox`), aur login yaad rakhne
  ka kaam sirf browser ki memory (`localStorage`) mein hota tha — koi bhi
  jo code dekh le, password jaan sakta tha.
- Ab: password **hash** (locked/scrambled form) mein `.env.local` file mein
  save hota hai, login check server pe hota hai, aur session cookie
  secure tareeqe se sign ki jati hai. Design bilkul wahi hai, sirf peeche
  ka kaam badla hai.

## Pehli baar setup karna (sirf ek dafa)

### Step 1: Packages install karo
```
npm install
```

### Step 2: .env.local file banao
`.env.local.example` ki copy banao aur naam `.env.local` rakho.

### Step 3: Apna password choose karo aur "hash" banao
Terminal mein ye chalao (apna khud ka password use karo `TestPass123` ki
jagah):
```
node scripts/hash-password.js TestPass123
```

Jo output mile (ek lambi si string), usko copy karke `.env.local` mein
`ADMIN_PASSWORD_HASH=` ke saamne paste kar do.

### Step 4: Random secret banao
Terminal mein ye chalao:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Jo output mile, usko `.env.local` mein `SESSION_SECRET=` ke saamne paste
kar do.

### Step 5: Apna email set karo
`.env.local` mein `ADMIN_EMAIL=` ke saamne apna email likh do (koi bhi
email chalega, ye sirf login ke liye hai).

Ab aapki `.env.local` kuch is tarah dikhni chahiye:
```
ADMIN_EMAIL=admin@praivox.com
ADMIN_PASSWORD_HASH=<lambi si string jo Step 3 mein mili>
SESSION_SECRET=<lambi si string jo Step 4 mein mili>
```

## Chalana

```
npm run dev -- --webpack
```

(Agar aapke system pe "Turbopack not supported" wali error na aaye, to
sirf `npm run dev` bhi chal jayega — `--webpack` sirf Windows ke us
issue ka fix hai jo humein pehle mila tha.)

Browser mein `http://localhost:3000` kholo.

## Test karo

1. Bina login `http://localhost:3000/admin` kholne ki koshish karo →
   automatically login page pe bhej dega
2. Galat password daal ke dekho → error aayega
3. Sahi email/password (jo aapne Step 5 aur Step 3 mein set kiya) daal
   ke login karo → dashboard khulega
4. "Log out" button dabao → wapas login page pe chale jaoge, aur ab
   `/admin` phir se protected ho jayega

## Database Setup (Neon Postgres + Prisma)

**Update:** Ab database SQLite nahi, **Neon (free hosted Postgres)** hai.
Ye badlav Vercel pe deploy karne ke liye zaroori tha — Vercel ke
serverless functions ek local file (SQLite) mein data permanently save
nahi rakh sakte, isliye hosted database chahiye. Neon Vercel khud
recommend karta hai aur free tier kaafi hai is project ke liye.

### Setup (sirf ek dafa)

1. **Neon database banao** — do tareeqe hain:
   - **Option A (aasan):** Vercel dashboard mein jao → Storage tab →
     "Create Database" → "Postgres" (ye Neon hi hai, Vercel ke andar
     integrated) → banao aur connection string copy karo
   - **Option B (seedha Neon se):** https://neon.tech pe free account
     banao → naya project banao → "Connection string" copy karo

   Connection string kuch is tarah dikhegi:
   ```
   postgresql://user:password@ep-xxxx.neon.tech/dbname?sslmode=require
   ```

2. Ye connection string **do jagah** paste karo:
   - `.env.local` mein `DATABASE_URL=` ke saamne
   - Ek naya file banao naam `.env` (bina ".local" ke) usi folder mein
     jahan `package.json` hai, aur usme bhi wahi line likho:
     ```
     DATABASE_URL="postgresql://user:password@ep-xxxx.neon.tech/dbname?sslmode=require"
     ```
   **Zaroori:** Prisma CLI (`npx prisma migrate dev`) sirf `.env` file
   padhti hai, `.env.local` nahi (ye sirf Next.js ka apna convention
   hai) — isliye dono jagah zaroori hai.

3. Terminal mein ye chalao — ye Neon database mein tables bana dega:
   ```
   npx prisma migrate dev --name init
   ```

4. (Optional) Database ko visually dekhna ho to:
   ```
   npx prisma studio
   ```

### Test karo

Admin dashboard kholo (`/admin`) — stat cards (Pending/Published/
Today's Runs/Rejected) ab **asli database se** aa rahe hain, hardcoded
nahi. Abhi sab 0 dikhenge kyunki database khaali hai — ye normal hai.

## Zaroori: .env.local kabhi kisi ko mat bhejna

Ye file aapka password-hash, secret, aur database location rakhti hai.
Isko GitHub pe upload mat karna (`.gitignore` mein already add hai) aur
kisi ke saath share mat karna.

## Agar password badalna ho

Bas Step 3 dobara karo (naye password ke saath) aur naya hash
`.env.local` mein update kar do. Server restart karo.

## News Fetching (Phase 2 + 3) — ab poori tarah n8n se

News fetching is app ke andar nahi hoti — **n8n** khud RSS feeds fetch
karta hai (n8n ke "RSS Feed Read" nodes se) aur phir humare app ko
`/api/cron/ingest` route pe POST kar deta hai. Wahan se app:

1. Duplicate stories ko group karta hai (2+ sources ne same story cover
   ki to "verified" ban jati hai)
2. Verified pool mein se top 10 (recency + category-fairness se) chunta
   hai
3. In 10 ko ek Batch bana kar "Pending Review" mein daal deta hai

Is app mein koi RSS source list nahi hai — sources (Al Jazeera, BBC
World, NYT World, CoinDesk, CoinTelegraph, Decrypt) sirf n8n workflow
ke andar maintained hain. Koi source badalni/hatani/add karni ho to
n8n workflow mein jao, code mein nahi.

### n8n workflow setup

1. **Schedule Trigger** node — cron `0 * * * *`, timezone PKT (har
   ghante, 6 PM bhi khud shamil ho jata hai)
2. **RSS Feed Read** node har source ke liye, output ko normalize karo
   (title, url, sourceName, category)
3. **Merge** node — sab sources ke items ek array mein combine karo
4. **HTTP Request** node:
   - Method: `POST`
   - URL: `https://your-domain.com/api/cron/ingest`
   - Header: `Authorization: Bearer <CRON_SECRET, .env.local se>`
   - Body: `{ "items": [...] }`

### Test karo (bina n8n ke, manually)

n8n set up karne se pehle bhi is endpoint ko manually test kar sakte ho:

```bash
curl -X POST http://localhost:3000/api/cron/ingest \
  -H "Authorization: Bearer <your CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "title": "Test story", "url": "https://example.com/1", "sourceName": "Source A", "category": "geopolitical", "publishedAt": null },
      { "title": "Test story", "url": "https://example.com/2", "sourceName": "Source B", "category": "geopolitical", "publishedAt": null }
    ]
  }'
```

(Do items jaan-boojh kar same title ke sath diye hain — taake dedupe +
verification test ho: dono milkar ek "verified" story ban jani chahiye,
kyunki 2 alag sources ne cover ki.)

### Agar koi source fail ho

Ye n8n ke andar handle hota hai (RSS Feed Read node ka "Continue on
Fail" option on karo) — baaki sources se kaam chalta rahega.

### Database mein dekhna ho to

```
npx prisma studio
```
Ye browser mein database explorer kholega — `Story` table mein
jitni bhi stories fetch hui hain, wo dikhengi.

## Zaroori: .env.local kabhi kisi ko mat bhejna

Ye file aapka password-hash, secret, aur database location rakhti hai.
Isko GitHub pe upload mat karna (`.gitignore` mein already add hai) aur
kisi ke saath share mat karna.

## Agar password badalna ho

Bas Step 3 dobara karo (naye password ke saath) aur naya hash
`.env.local` mein update kar do. Server restart karo.

## Vercel Deployment

Ab project deploy karne ke liye taiyar hai. Steps:

### 1. GitHub pe push karo

Ye repo pehle se GitHub se connected hai. Terminal mein:
```
git add .
git commit -m "Postgres migration + deployment prep"
git push
```

### 2. Vercel pe import karo

1. https://vercel.com pe jao, GitHub se login karo
2. "Add New" → "Project" → apna `Privox` repo select karo
3. **Root Directory** field mein `praivox frontend` likho (kyunki
   project ek subfolder mein hai, root mein nahi)
4. Abhi "Deploy" mat dabana — pehle environment variables set karo
   (agla step)

### 3. Environment Variables set karo

Vercel ke "Environment Variables" section mein ye sab add karo (wahi
values jo aapki `.env.local` mein hain):

```
ADMIN_EMAIL
ADMIN_PASSWORD_HASH
SESSION_SECRET
CRON_SECRET
DATABASE_URL       (Neon wala connection string)
GROQ_API_KEY       (agar AI feature use kar rahe ho, warna khaali chhod do)
```

### 4. Deploy karo

"Deploy" dabao. 2-3 minute mein build ho jayega, aur ek URL milega
jaisa: `https://privox-xyz.vercel.app`

### 5. n8n ka URL update karo

n8n mein "POST to Praivox Ingest" node kholo, URL field mein jo ngrok
wala URL tha usko apne **asli Vercel URL** se replace karo:
```
https://privox-xyz.vercel.app/api/cron/ingest
```
(Authorization header wahi rahega, kuch badalne ki zarurat nahi)

### 6. Test karo

n8n mein workflow ko "Execute Workflow" se manually ek dafa chalao —
agar sahi chala to Vercel wale live URL pe `/admin` dashboard mein
Pending Review number badhna chahiye.

### 7. n8n ko Active karo

Sab test ho jaye to n8n workflow ko top-right se **"Active"** kar do —
ab ye 24/7 khud chalega, aapka computer on hone ki zarurat nahi (kyunki
ab app Vercel pe chal raha hai, ngrok/local server ki zarurat khatam).

---

## Project Status

- ✅ Phase 1 — Public page + Admin login
- ✅ Phase 2 — News fetch (n8n) + merge + dedupe
- ✅ Phase 3 — Verify + Top-10 shortlist + Batch
- ✅ Phase 4 — Approve/Reject + Publish + Concurrency gate
- ✅ Phase 5 — Error handling, Run History, brute-force protection
- ✅ Extra — 7-day Published/Rejected report (client requirement)
- ⚙️ Phase 6 — AI enhancements (optional, partially wired via `GROQ_API_KEY`)
