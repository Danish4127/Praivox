import { PrismaClient } from '@prisma/client'

// In development, Next.js reloads files often, which can create many
// database connections if we're not careful. This pattern reuses a
// single connection instead of making a new one every time.

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
