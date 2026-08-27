import { NextResponse } from 'next/server'
import { createSessionToken } from '@/lib/session'
import { isLocked, recordFailedAttempt, clearAttempts } from '@/lib/loginRateLimit'
import { verifyAdminLogin } from '@/lib/adminCredential'

const SESSION_MAX_AGE = 60 * 60 * 8 // 8 hours

export async function POST(request: Request) {
  const { email, password } = await request.json()

  const sessionSecret = process.env.SESSION_SECRET

  if (!sessionSecret) {
    // .env.local was not set up properly
    return NextResponse.json(
      { error: 'Server not configured. Check .env.local file.' },
      { status: 500 }
    )
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  // Phase 5 — Brute-force protection: email + requester IP dono ko
  // milaa kar ek identifier banate hain, taake ek email pe alag-alag
  // IPs se try karne wala bhi eventually lock ho (email-level bhi
  // count hota rahega), lekin normal case mein sirf attacker lock ho,
  // legit admin kisi doosri IP se try kare to affect na ho.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const identifier = `${email.toLowerCase()}:${ip}`

  const lockStatus = isLocked(identifier)
  if (lockStatus.locked) {
    return NextResponse.json(
      {
        error: `Too many failed attempts. Try again in ${Math.ceil((lockStatus.retryAfterSeconds ?? 0) / 60)} minute(s).`,
      },
      { status: 429 }
    )
  }

  // Credential ab database se aati hai (Settings page se change ho sakti
  // hai) - pehli baar khud .env.local se seed ho jati hai, dekho
  // lib/adminCredential.ts
  const result = await verifyAdminLogin(email, password)

  if (!result) {
    recordFailedAttempt(identifier)
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 })
  }

  clearAttempts(identifier)
  const token = await createSessionToken(result.email, sessionSecret, SESSION_MAX_AGE)

  const response = NextResponse.json({ success: true })
  response.cookies.set('praivox_session', token, {
    httpOnly: true, // can't be accessed via JavaScript - protects against XSS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })

  return response
}
