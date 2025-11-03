import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Optimized Prisma client with connection pooling and performance settings
// Connection pool configuration: 10-20 connections recommended for 250 concurrent users
// DATABASE_URL should include: ?connection_limit=10&pool_timeout=20
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pooling optimization
  __internal: {
    engine: {
      connectTimeout: 10000, // 10 seconds
      queryTimeout: 30000,   // 30 seconds
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

// Performance monitoring
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    if (e.duration > 1000) { // Log slow queries (>1s)
      console.warn(`🐌 Slow query detected: ${e.duration}ms - ${e.query}`)
    }
  })
}

// Connection pool monitoring (production-safe)
let connectionCount = 0
prisma.$on('query' as any, () => {
  connectionCount++
  // Log connection pool stats every 100 queries
  if (connectionCount % 100 === 0 && process.env.NODE_ENV === 'development') {
    console.log(`📊 Connection pool usage: ${connectionCount} queries processed`)
  }
})
