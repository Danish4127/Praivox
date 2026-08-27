import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

/**
 * Admin login ki credential DB se laata hai. Agar DB mein abhi tak
 * koi row nahi hai (pehli baar app chal raha hai), to .env.local ke
 * ADMIN_EMAIL + ADMIN_PASSWORD_HASH se ek row bana deta hai - taake
 * purana setup (jo sirf env pe depend karta tha) tootay nahi.
 *
 * Is migration ke baad, password change UI (Settings page) se DB
 * wala row hi update hota hai - env variable dobara nahi padhi jati.
 */
export async function getOrCreateAdminCredential() {
  const existing = await prisma.adminCredential.findFirst()
  if (existing) return existing

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPasswordHashEnv = process.env.ADMIN_PASSWORD_HASH

  if (!adminEmail || !adminPasswordHashEnv) {
    throw new Error('No admin credential in database, and ADMIN_EMAIL/ADMIN_PASSWORD_HASH are not set in .env.local.')
  }

  // .env.local mein hash base64-wrapped store hota hai (taake .env file
  // mein seedha bcrypt ka '$' wala format na dikhe) - yahan decode karo
  const decodedHash = Buffer.from(adminPasswordHashEnv, 'base64').toString('utf-8')

  return prisma.adminCredential.create({
    data: { email: adminEmail, passwordHash: decodedHash },
  })
}

export async function verifyAdminLogin(email: string, password: string): Promise<{ email: string } | null> {
  const credential = await getOrCreateAdminCredential()
  const emailMatches = email.toLowerCase() === credential.email.toLowerCase()
  const passwordMatches = await bcrypt.compare(password, credential.passwordHash)
  return emailMatches && passwordMatches ? { email: credential.email } : null
}
