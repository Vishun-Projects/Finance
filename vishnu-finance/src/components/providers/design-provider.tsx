'use client'

import * as React from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { getDesignSettings } from '@/app/actions/design-system'
import type { DesignSettings } from '@/app/actions/design-system'

type DesignProviderProps = {
    children: React.ReactNode
    initialSettings?: DesignSettings
}

export const DesignContext = React.createContext<{
    settings: DesignSettings | null
    updateSettings: (settings: Partial<DesignSettings>) => void
}>({
    settings: null,
    updateSettings: () => { },
})

export function DesignProvider({ children, initialSettings }: DesignProviderProps) {
    const { isDark } = useTheme()
    const [settings, setSettings] = React.useState<DesignSettings | null>(initialSettings || null)

    // Fetch settings on mount if not provided
    React.useEffect(() => {
        if (!settings) {
            getDesignSettings().then(setSettings)
        }
    }, [settings])

    // Apply settings to CSS variables
    React.useEffect(() => {
        if (!settings) return

        const root = document.documentElement
        const [h, s, l] = settings.primaryColor.split(' ').map(v => parseFloat(v))

        // --- Smart Contrast Tuning & Monochrome Inversion ---
        let tunedH = h
        let tunedS = s
        let tunedL = l

        // 1. Monochrome Detection (Grayscale)
        const isMonochrome = s < 10

        if (isMonochrome) {
            if (isDark) {
                // Dark Mode: Force Light (White)
                tunedL = l < 50 ? 98 : 10;
                tunedS = 0;
            } else {
                // Light Mode: Force Dark (Black)
                tunedL = l > 50 ? 2 : l;
                tunedS = 0;
            }
        } else {
            // 2. Chromatic Tuning
            if (isDark) {
                // Dark Mode: Ensure it pops (min lightness 55%)
                tunedL = Math.max(l, 55)
                // Boost saturation
                tunedS = Math.min(s + 10, 100)
            } else {
                // Light Mode: Ensure it's legible (max lightness 45%)
                tunedL = Math.min(l, 45)
            }
        }

        // Reconstruct primary color string
        const primaryColor = `${tunedH} ${tunedS}% ${tunedL}%`
        const originalColor = `${h} ${s}% ${l}%`

        root.style.setProperty('--primary', primaryColor)
        root.style.setProperty('--primary-original', originalColor)
        root.style.setProperty('--ring', primaryColor)

        // --- Complementary Accent Generation ---
        let accentHue, accentS, accentL;

        // Check if custom accent
        const hasCustomAccent = settings.accentColor && !settings.accentColor.startsWith('240 4.8%'); // Check against default

        if (hasCustomAccent) {
            const [ah, as, al] = settings.accentColor.split(' ').map(v => parseFloat(v));
            accentHue = ah;
            accentS = as;
            accentL = al;
            // Safety
            if (accentS < 10) {
                if (isDark) accentL = al < 50 ? 98 : 10;
                // Keep light accent light in light mode? Or dark?
                // Usually accents should be visible. 
                else accentL = al > 50 ? 10 : al;
            } else if (isDark) {
                accentL = Math.max(al, 40);
            }
        } else {
            accentHue = (tunedH + 180) % 360
            accentS = Math.max(tunedS - 20, 30)
            accentL = isDark ? 60 : 50
            if (isMonochrome) {
                accentHue = 210; accentS = 5; accentL = isDark ? 40 : 80;
            }
        }

        const accentColor = `${accentHue} ${accentS}% ${accentL}%`

        root.style.setProperty('--accent-color', accentColor)
        root.style.setProperty('--accent-color', accentColor)
        root.style.setProperty('--chart-2', accentColor) // Accent
        root.style.setProperty('--chart-1', primaryColor) // Primary
        root.style.setProperty('--chart-3', isDark ? '217 91% 60%' : '215 25% 27%') // Blue-ish fallback
        root.style.setProperty('--chart-4', '43 96% 64%') // Yellow/Gold constant
        root.style.setProperty('--chart-5', '12 76% 61%') // Red/Orange constant

        // --- Foreground Contrast ---
        const isBright = tunedL > 60 || (tunedS > 50 && tunedL > 45 && (tunedH > 40 && tunedH < 190));
        const foregroundColor = isBright ? '0 0% 9%' : '0 0% 100%'
        root.style.setProperty('--primary-foreground', foregroundColor)

        // Radius
        root.style.setProperty('--radius', settings.borderRadius)

        // Typography
        if (settings.fontFamilyBody && settings.fontFamilyBody !== 'System') {
            root.style.setProperty('--font-sans', settings.fontFamilyBody)
            loadGoogleFont(settings.fontFamilyBody)
        }
        if (settings.fontFamilyHeading) {
            root.style.setProperty('--font-heading', settings.fontFamilyHeading)
            loadGoogleFont(settings.fontFamilyHeading)
        }
    }, [settings, isDark])

    const loadGoogleFont = (fontName: string) => {
        if (!fontName || fontName === 'System' || fontName === 'Inter') return // Inter is built-in

        const linkId = `google-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`
        if (document.getElementById(linkId)) return

        const link = document.createElement('link')
        link.id = linkId
        link.rel = 'stylesheet'
        link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800&display=swap`
        document.head.appendChild(link)
    }

    return (
        <DesignContext.Provider value={{ settings, updateSettings: (s) => setSettings(prev => ({ ...prev!, ...s })) }}>
            {children}
        </DesignContext.Provider>
    )
}
