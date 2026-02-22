import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Optimized Prisma client with connection pooling and performance settings
// Forced connection limits for high concurrent advisor tasks
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || '';
  if (url.includes('?')) {
    if (!url.includes('connection_limit')) {
      return `${url}&connection_limit=20&pool_timeout=30`;
    }
    return url;
  }
  return `${url}?connection_limit=20&pool_timeout=30`;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
})

// CRITICAL FIX: Ensure singleton pattern works in BOTH development AND production
// This prevents connection pool exhaustion by reusing the same PrismaClient instance
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

