import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function appendQueryParam(url: string, key: string, value: string): string {
  if (url.includes(`${key}=`)) return url
  return url.includes('?') ? `${url}&${key}=${value}` : `${url}?${key}=${value}`
}

/** Prisma datasource URL with pool settings for dev vs serverless production */
const getDatabaseUrl = () => {
  const isProduction = process.env.NODE_ENV === 'production'

  // Local dev: optional session pooler (5432) is faster than transaction pooler (6543)
  const base =
    !isProduction && process.env.DATABASE_URL_SESSION
      ? process.env.DATABASE_URL_SESSION
      : process.env.DATABASE_URL || ''

  if (!base) return base

  let url = base

  // Supabase transaction pooler (6543) requires pgbouncer=true for Prisma
  if (url.includes(':6543')) {
    url = appendQueryParam(url, 'pgbouncer', 'true')
  }

  // Serverless: small pool per warm instance — pooler multiplexes to Postgres
  const connectionLimit = isProduction ? '5' : '5'
  url = appendQueryParam(url, 'connection_limit', connectionLimit)
  url = appendQueryParam(url, 'pool_timeout', '30')

  if (isProduction && url.includes('db.') && url.includes('.supabase.co:5432')) {
    console.error(
      '[db] DATABASE_URL uses direct Supabase host (5432). Use the transaction pooler on port 6543 in production or you will hit max connections.',
    )
  }

  return url
}

const createPrismaClient = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

// Dev hot-reload can keep a PrismaClient from before `prisma generate` (missing new models).
const cached = globalForPrisma.prisma
if (cached && typeof cached.incomeBudgetPlan === 'undefined') {
  void cached.$disconnect().catch(() => {})
  globalForPrisma.prisma = undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
}

if (process.env.NODE_ENV !== 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

