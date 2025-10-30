import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Optimized Prisma client with connection pooling and performance settings
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

// Connection pooling and performance optimizations
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

// Performance monitoring
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    if (e.duration > 1000) { // Log slow queries (>1s)
      console.warn(`🐌 Slow query detected: ${e.duration}ms - ${e.query}`)
    }
  })
}
