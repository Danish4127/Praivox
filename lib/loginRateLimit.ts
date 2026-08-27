// Phase 5 — Admin auth protection (scope Table 5 #5: "Standard
// protections against brute-force login attempts on the admin panel.")
//
// Simple sliding-window lockout: X galat attempts (per IP+email) ke
// baad, us combination ko kuch waqt ke liye lock kar dete hain, chahe
// password sahi hi kyun na diya jaye.
//
// Note: in-memory hai (ek Map), isliye har server restart pe reset ho
// jata hai, aur agar app kabhi multiple instances/serverless functions
// pe chale (jaise Vercel), har instance ka apna alag counter hoga.
// Ye ek single local/small-VPS deployment (jo is project ka scope hai)
// ke liye theek hai. Agar future mein multi-instance production pe
// jaana ho, isi logic ko Redis ya ek DB table mein move kar dena
// (interface same rakh ke) - abhi ke liye ye kaafi hai.

type Attempt = { count: number; firstAttemptAt: number; lockedUntil: number | null }

const attempts = new Map<string, Attempt>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minute window mein attempts ginte hain
const LOCKOUT_MS = 15 * 60 * 1000 // lock lagne ke baad 15 minute wait

function keyFor(identifier: string) {
  return identifier.toLowerCase()
}

/** Login attempt se PEHLE call karo - batata hai ke ye identifier abhi locked hai ya nahi. */
export function isLocked(identifier: string): { locked: boolean; retryAfterSeconds?: number } {
  const entry = attempts.get(keyFor(identifier))
  if (!entry || !entry.lockedUntil) return { locked: false }

  if (Date.now() < entry.lockedUntil) {
    return { locked: true, retryAfterSeconds: Math.ceil((entry.lockedUntil - Date.now()) / 1000) }
  }

  // Lock ka waqt guzar chuka - reset kar do
  attempts.delete(keyFor(identifier))
  return { locked: false }
}

/** Galat password/email milne par call karo. */
export function recordFailedAttempt(identifier: string): void {
  const key = keyFor(identifier)
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
    // Naya window shuru
    attempts.set(key, { count: 1, firstAttemptAt: now, lockedUntil: null })
    return
  }

  const count = entry.count + 1
  const lockedUntil = count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : null
  attempts.set(key, { count, firstAttemptAt: entry.firstAttemptAt, lockedUntil })
}

/** Successful login par call karo - is identifier ka counter saaf kar do. */
export function clearAttempts(identifier: string): void {
  attempts.delete(keyFor(identifier))
}
