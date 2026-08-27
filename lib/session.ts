// This file creates and verifies "session tokens".
// A session token is a small "pass" a user gets after logging in,
// so they don't have to enter their password on every request.
//
// We sign it ourselves (with a secret key) so nobody can copy/edit
// it to fake a login.

const encoder = new TextEncoder()

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const withPadding = padded + '='.repeat((4 - (padded.length % 4)) % 4)
  return atob(withPadding)
}

async function getKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

/**
 * Called right after a successful login.
 * Builds a token containing: admin email + expiry time,
 * and signs it with the secret key.
 */
export async function createSessionToken(
  email: string,
  secret: string,
  maxAgeSeconds: number
): Promise<string> {
  const expiry = Date.now() + maxAgeSeconds * 1000
  // Expiry goes FIRST because it's always purely numeric (never has a dot).
  // The email itself can contain a dot (e.g. admin@praivox.com), so it goes last.
  const payload = `${expiry}.${email}`
  const key = await getKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const signatureHex = bufferToHex(signature)
  return `${base64UrlEncode(payload)}.${signatureHex}`
}

/**
 * Called before every protected page load to check whether the
 * cookie's token is genuine and hasn't expired.
 */
export async function verifySessionToken(
  token: string,
  secret: string
): Promise<{ email: string } | null> {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [payloadEncoded, signatureHex] = parts
  let payload: string
  try {
    payload = base64UrlDecode(payloadEncoded)
  } catch {
    return null
  }

  const key = await getKey(secret)
  const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const expectedSignatureHex = bufferToHex(expectedSignature)

  if (expectedSignatureHex !== signatureHex) return null // token was tampered with

  // Only split on the FIRST dot (expiry.email) - since the email itself
  // can contain dots (e.g. praivox.com), we can't use a plain split().
  const firstDotIndex = payload.indexOf('.')
  if (firstDotIndex === -1) return null
  const expiryStr = payload.slice(0, firstDotIndex)
  const email = payload.slice(firstDotIndex + 1)

  const expiry = Number(expiryStr)
  if (!email || Number.isNaN(expiry) || Date.now() > expiry) return null // expired

  return { email }
}
