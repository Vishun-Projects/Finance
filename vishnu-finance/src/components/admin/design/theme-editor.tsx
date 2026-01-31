'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { DesignContext } from '@/components/providers/design-provider'
import { updateDesignSettings, resetDesignSettings } from '@/app/actions/design-system'
import { Loader2, RotateCcw, Save, Type, MousePointerClick, Palette } from 'lucide-react'

// Helper to convert HSL string "H S% L%" to Hex for the input picker
function hslToHex(hsl: string): string {
    if (!hsl) return '#000000';
    const [h, s, l] = hsl.split(' ').map(v => parseFloat(v));
    const l_dec = l / 100;
    const a = s * Math.min(l_dec, 1 - l_dec) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l_dec - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

// Helper to convert Hex to HSL string "H S% L%" for Tailwind
function hexToHsl(hex: string): string {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt("0x" + hex[1] + hex[1]);
        g = parseInt("0x" + hex[2] + hex[2]);
        b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
        r = parseInt("0x" + hex[1] + hex[2]);
        g = parseInt("0x" + hex[3] + hex[4]);
        b = parseInt("0x" + hex[5] + hex[6]);
    }
    r /= 255;
    g /= 255;
    b /= 255;
    const cmin = Math.min(r, g, b),
        cmax = Math.max(r, g, b),
        delta = cmax - cmin;
    let h = 0, s = 0, l = 0;

    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return `${h} ${s}% ${l}%`;
}

export function ThemeEditor() {
    const { settings, updateSettings } = React.useContext(DesignContext)
    const [isSaving, setIsSaving] = React.useState(false)

    // Local state for the inputs to avoid jank, synced with context on change
    const [primaryHex, setPrimaryHex] = React.useState('#000000')

    React.useEffect(() => {
        if (settings?.primaryColor) {
            setPrimaryHex(hslToHex(settings.primaryColor))
        }
    }, [settings?.primaryColor])

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const hex = e.target.value;
        setPrimaryHex(hex);
        const hsl = hexToHsl(hex);
        updateSettings({ primaryColor: hsl });
    }

    const handleSave = async () => {
        if (!settings) return
        setIsSaving(true)
        try {
            await updateDesignSettings(settings)
            toast.success("Global design settings updated.")
        } catch (e) {
            toast.error("Failed to save settings.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleReset = async () => {
        if (confirm("Reset all design settings to default?")) {
            setIsSaving(true)
            await resetDesignSettings()
            window.location.reload()
        }
    }

    if (!settings) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Brand Colors */}
                <Card className="col-span-1 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="w-5 h-5" />
                            Brand Identity
                        </CardTitle>
                        <CardDescription>
                            Define your primary brand color. Choose from a curated scheme or pick a custom color.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* 1. Quick Color Schemes */}
                        <div className="space-y-3">
                            <Label>Artist Palettes</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {[
                                    { name: 'Luxury', value: '45 90% 45%', hex: '#d4af37', accent: '0 0% 10%', accentHex: '#1a1a1a' }, // Gold + Black
                                    { name: 'Nature', value: '100 40% 40%', hex: '#4d8f3d', accent: '75 85% 60%', accentHex: '#dfff4f' }, // Olive + Lime
                                    { name: 'Corporate', value: '250 85% 40%', hex: '#2c0fbd', accent: '30 90% 60%', accentHex: '#f97316' }, // Navy + Orange
                                    { name: 'Classic', value: '220 90% 30%', hex: '#082f91', accent: '40 90% 60%', accentHex: '#facc15' }, // Deep Blue + Gold
                                    { name: 'Cyber', value: '290 80% 50%', hex: '#d946ef', accent: '180 90% 50%', accentHex: '#06b6d4' }, // Magenta + Cyan
                                    { name: 'Sunset', value: '15 90% 55%', hex: '#f97316', accent: '280 60% 50%', accentHex: '#9333ea' }, // Orange + Purple
                                    { name: 'Bold', value: '0 90% 20%', hex: '#610505', accent: '10 90% 55%', accentHex: '#f97316' }, // Dark Red + Orange
                                    { name: 'Soft', value: '230 40% 60%', hex: '#8b9bd6', accent: '25 90% 75%', accentHex: '#fdba74' }, // Periwinkle + Peach
                                    { name: 'Pastel', value: '140 20% 60%', hex: '#85bda0', accent: '30 80% 80%', accentHex: '#fde68a' }, // Sage + Cream
                                    { name: 'Obsidian', value: '0 0% 0%', hex: '#000000', accent: '0 0% 50%', accentHex: '#808080' }, // Black + Grey
                                    { name: 'Emerald', value: '142 76% 36%', hex: '#16a34a', accent: '340 70% 60%', accentHex: '#f43f5e' }, // Green + Rose
                                ].map((scheme) => (
                                    <button
                                        key={scheme.name}
                                        onClick={() => {
                                            updateSettings({
                                                primaryColor: scheme.value,
                                                accentColor: scheme.accent
                                            })
                                            setPrimaryHex(scheme.hex)
                                        }}
                                        className="group relative flex flex-col items-stretch rounded-xl overflow-hidden border border-border transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow-md h-24"
                                        title={scheme.name}
                                    >
                                        <div className="flex-1 w-full" style={{ backgroundColor: scheme.hex }}></div>
                                        <div className="h-4 w-full" style={{ backgroundColor: scheme.accentHex }}></div>
                                        <div className="bg-card p-1 text-[10px] uppercase font-bold text-center text-muted-foreground tracking-wider border-t border-border">
                                            {scheme.name}
                                        </div>
                                        {settings.primaryColor === scheme.value && (
                                            <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full shadow-md flex items-center justify-center">
                                                <div className="w-2 h-2 bg-black rounded-full" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Custom Picker */}
                        <div className="space-y-3">
                            <Label>Custom Color</Label>
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-lg border border-border overflow-hidden shadow-sm relative shrink-0">
                                    <input
                                        type="color"
                                        className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer p-0 border-0"
                                        value={primaryHex}
                                        onChange={handleColorChange}
                                    />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Input
                                        value={primaryHex.toUpperCase()}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPrimaryHex(val);
                                            if (/^#[0-9A-F]{6}$/i.test(val)) {
                                                updateSettings({ primaryColor: hexToHsl(val) })
                                            }
                                        }}
                                        className="font-mono uppercase h-10"
                                        maxLength={7}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Dual-Mode Live Preview */}
                        <div className="space-y-4">
                            <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Smart Preview</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ThemePreviewFrame mode="light" settings={settings!} />
                                <ThemePreviewFrame mode="dark" settings={settings!} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Interface Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MousePointerClick className="w-5 h-5" />
                            Interface & Typography
                        </CardTitle>
                        <CardDescription>
                            Fine-tune the global appearance of your application.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Border Radius */}
                        <div className="space-y-3">
                            <Label>Border Radius</Label>
                            <Select
                                value={settings.borderRadius}
                                onValueChange={(val) => updateSettings({ borderRadius: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0rem">None (Sharp)</SelectItem>
                                    <SelectItem value="0.3rem">Small (0.3rem)</SelectItem>
                                    <SelectItem value="0.5rem">Medium (0.5rem)</SelectItem>
                                    <SelectItem value="0.75rem">Large (0.75rem)</SelectItem>
                                    <SelectItem value="1.0rem">Extra Large (1.0rem)</SelectItem>
                                    <SelectItem value="1.5rem">Rounded (1.5rem)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Fonts */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Type className="w-4 h-4 text-muted-foreground" />
                                <Label>Typography</Label>
                            </div>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Body Font</Label>
                                    <Select
                                        value={settings.fontFamilyBody}
                                        onValueChange={(val) => updateSettings({ fontFamilyBody: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Inter">Inter (Default)</SelectItem>
                                            <SelectItem value="Manrope">Manrope</SelectItem>
                                            <SelectItem value="System">System UI</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Heading Font</Label>
                                    <Select
                                        value={settings.fontFamilyHeading}
                                        onValueChange={(val) => updateSettings({ fontFamilyHeading: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Inter">Inter</SelectItem>
                                            <SelectItem value="Manrope">Manrope</SelectItem>
                                            <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                                            <SelectItem value="JetBrains Mono">JetBrains Mono</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end gap-4">
                <Button variant="ghost" onClick={handleReset} className="text-muted-foreground hover:text-destructive">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Defaults
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="min-w-[150px]">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                </Button>
            </div>
        </div>
    )
}

// --- Preview Components ---

import type { DesignSettings } from '@/app/actions/design-system'

function ThemePreviewFrame({ mode, settings }: { mode: 'light' | 'dark', settings: DesignSettings }) {
    // 1. Calculate Variables (Logic duplicated from design-provider for simulation)
    const [h, s, l] = settings.primaryColor.split(' ').map(v => parseFloat(v));
    const isDark = mode === 'dark';

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

    const primaryColor = `${tunedH} ${tunedS}% ${tunedL}%`;

    // Accent Generation
    let accentHue, accentS, accentL;

    // Check if custom accent
    const hasCustomAccent = settings.accentColor && !settings.accentColor.startsWith('240 4.8%');

    if (hasCustomAccent) {
        const [ah, as, al] = settings.accentColor.split(' ').map(v => parseFloat(v));
        accentHue = ah;
        accentS = as;
        accentL = al;
        // Safety
        if (accentS < 10) {
            if (isDark) accentL = al < 50 ? 98 : 10;
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
    const accentColor = `${accentHue} ${accentS}% ${accentL}%`;

    // Contrast
    const isBright = tunedL > 60 || (tunedS > 50 && tunedL > 45 && (tunedH > 40 && tunedH < 190));
    const primaryForeground = isBright ? '0 0% 9%' : '0 0% 100%';

    // Base Theme Colors (Approximated from globals.css)
    const baseVars = isDark ? {
        '--background': '0 0% 0%',
        '--foreground': '0 0% 100%',
        '--card': '0 0% 3.9%',
        '--card-foreground': '0 0% 100%',
        '--popover': '0 0% 3.9%',
        '--popover-foreground': '0 0% 100%',
        '--muted': '0 0% 9%',
        '--muted-foreground': '240 5% 64.9%',
        '--border': '0 0% 14.9%',
        '--input': '0 0% 14.9%',
    } : {
        '--background': '240 5% 97%',
        '--foreground': '0 0% 9%',
        '--card': '0 0% 100%',
        '--card-foreground': '0 0% 9%',
        '--popover': '0 0% 100%',
        '--popover-foreground': '0 0% 9%',
        '--muted': '240 4.8% 95.9%',
        '--muted-foreground': '240 3.8% 46.1%',
        '--border': '240 5.9% 90%',
        '--input': '240 5.9% 90%',
    };

    const style = {
        ...baseVars,
        '--primary': primaryColor,
        '--primary-foreground': primaryForeground,
        '--accent-color': accentColor,
        '--radius': settings.borderRadius,
    } as React.CSSProperties;

    return (
        <div style={style} className="rounded-xl border border-border bg-background text-foreground overflow-hidden shadow-sm flex flex-col font-sans h-full">
            {/* Header */}
            <div className="h-10 border-b border-border flex items-center px-4 justify-between bg-card text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>{mode} Mode</span>
                <span className="w-2 h-2 rounded-full bg-primary/20 shadow-[0_0_10px_currentColor] text-primary"></span>
            </div>

            <div className="p-5 space-y-6 flex-1 bg-background relative">
                {/* Decorative Glow */}
                {isDark && <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>}

                {/* KPI Card */}
                <div className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-3 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Balance</p>
                            <p className="text-2xl font-bold tracking-tight text-primary">₹1,24,500</p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Palette className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="h-1 w-full bg-muted overflow-hidden rounded-full">
                        <div className="h-full bg-primary w-[70%]"></div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        <span className="text-primary font-bold">+12%</span> vs last month
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm w-full">Primary Action</Button>
                    <div className="flex gap-2 w-full">
                        <Button size="sm" variant="outline" className="flex-1 border-border text-foreground hover:bg-muted">Secondary</Button>
                        <Button size="sm" variant="ghost" className="flex-1 hover:bg-muted text-muted-foreground">Ghost</Button>
                    </div>
                </div>

                {/* Badge Row */}
                <div className="flex items-center gap-2">
                    <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">Active</Badge>
                    <Badge variant="outline" className="text-muted-foreground border-border">Tag</Badge>
                    {/* Accent Badge */}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-transparent" style={{ backgroundColor: 'hsl(var(--accent-color))', color: 'hsl(var(--primary-foreground))' }}>
                        Accent
                    </span>
                </div>
            </div>
        </div>
    );
}
