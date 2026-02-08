'use server'

import { prisma } from '@/lib/db'

export async function checkDatabaseConnection() {
    try {
        const userCount = await prisma.user.count({ take: 1 })
        return {
            success: true,
            message: `Database connected successfully. User count check: ${userCount >= 0 ? 'OK' : 'FAIL'}`,
            timestamp: new Date().toISOString()
        }
    } catch (error) {
        console.error('Database Connection Error:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown database error',
            timestamp: new Date().toISOString()
        }
    }
}
