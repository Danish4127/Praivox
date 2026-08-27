import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getOrCreateAdminCredential } from '@/lib/adminCredential'

// Settings page ka "Change Password" form isko call karta hai.
// Ye route already /api/admin/* ke andar hai, isliye proxy.ts se
// login-cookie protection khud lagu ho jati hai.

export async function POST(request: Request) {
  const { currentPassword, newPassword } = await request.json()

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Current and new password are required.' }, { status: 400 })
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 })
  }

  const credential = await getOrCreateAdminCredential()

  const currentMatches = await bcrypt.compare(currentPassword, credential.passwordHash)
  if (!currentMatches) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 })
  }

  const newHash = await bcrypt.hash(newPassword, 10)
  await prisma.adminCredential.update({
    where: { id: credential.id },
    data: { passwordHash: newHash },
  })

  return NextResponse.json({ success: true })
}
