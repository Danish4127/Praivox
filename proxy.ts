import { NextResponse, type NextRequest } from 'next/server'
import { verifySessionToken } from '@/lib/session'

// Runs before every request (only for /admin routes, see config below).
// If there's no valid session cookie, redirects to /admin/login.
// (In Next.js 16 this file was renamed from "middleware.ts" to "proxy.ts")

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('praivox_session')?.value
  const sessionSecret = process.env.SESSION_SECRET

  const isValid = token && sessionSecret && (await verifySessionToken(token, sessionSecret))

  if (!isValid) {
    const loginUrl = new URL('/admin/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Do NOT protect /admin/login (otherwise the login page itself won't load)
  // Do NOT protect /api/admin/login or /api/admin/logout (needed to log in/out)
  // Everything else under /admin and /api/admin is protected
  matcher: ['/admin', '/admin/((?!login).*)', '/api/admin/((?!login|logout).*)'],
}
