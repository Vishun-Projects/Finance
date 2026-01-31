'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export type DesignSettings = {
    theme: string
    primaryColor: string
    surfaceColor: string
    accentColor: string
    borderColor: string
    fontFamilyBody: string
    fontFamilyHeading: string
    baseFontSize: number
    borderRadius: string
}

const DEFAULT_SETTINGS: DesignSettings = {
    theme: 'system',
    primaryColor: '250 85% 40%',
    surfaceColor: '240 5% 97%',
    accentColor: '240 4.8% 95.9%',
    borderColor: '240 5.9% 90%',
    fontFamilyBody: 'Inter',
    fontFamilyHeading: 'Inter',
    baseFontSize: 16,
    borderRadius: '0.5rem',
}

export async function getDesignSettings() {
    try {
        const settings = await prisma.globalDesignSettings.findFirst({
            orderBy: { updatedAt: 'desc' },
        })

        if (!settings) {
            return DEFAULT_SETTINGS
        }

        return {
            theme: settings.theme,
            primaryColor: settings.primaryColor,
            surfaceColor: settings.surfaceColor,
            accentColor: settings.accentColor,
            borderColor: settings.borderColor,
            fontFamilyBody: settings.fontFamilyBody,
            fontFamilyHeading: settings.fontFamilyHeading,
            baseFontSize: settings.baseFontSize,
            borderRadius: settings.borderRadius,
        }
    } catch (error) {
        console.error('Failed to fetch design settings:', error)
        return DEFAULT_SETTINGS
    }
}

export async function updateDesignSettings(data: Partial<DesignSettings>) {
    try {
        // Upsert to ensure we only have one active record or update the latest
        // For simplicity in this "Singleton" pattern, we can just findFirst and update, or create if not exists
        const existing = await prisma.globalDesignSettings.findFirst()

        if (existing) {
            await prisma.globalDesignSettings.update({
                where: { id: existing.id },
                data,
            })
        } else {
            await prisma.globalDesignSettings.create({
                data: {
                    ...DEFAULT_SETTINGS,
                    ...data,
                },
            })
        }

        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Failed to update design settings:', error)
        return { success: false, error: 'Failed to update settings' }
    }
}

export async function resetDesignSettings() {
    try {
        const existing = await prisma.globalDesignSettings.findFirst()
        if (existing) {
            await prisma.globalDesignSettings.update({
                where: { id: existing.id },
                data: DEFAULT_SETTINGS,
            })
        } else {
            await prisma.globalDesignSettings.create({
                data: DEFAULT_SETTINGS,
            })
        }
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Failed to reset design settings:', error)
        return { success: false, error: 'Failed to reset settings' }
    }
}
