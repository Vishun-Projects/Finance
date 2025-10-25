import { PrismaClient } from '@prisma/client'

/**
 * @file This file is to instantiate the prisma client and reuse the same client across the application.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma