'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

type ColorPickerProps = {
    label: string
    value: string // Expecting HSL string like "250 85% 40%" or just CSS var value
    onChange: (value: string) => void
    description?: string
}

// Utility to convert HSL string (space separated) to Hex
// This is rough approximation for display. 
// "250 85% 40%" -> needs conversion
function hslToHex(hsl: string): string {
    // Parsing "H S% L%"
    const parts = hsl.match(/([\d.]+)%?/g)?.map(p => parseFloat(p))
    if (!parts || parts.length < 3) return '#000000'

    const [h, s, l] = parts

    const lVal = l / 100
    const a = s * Math.min(lVal, 1 - lVal) / 100
    const f = (n: number) => {
        const k = (n + h / 30) % 12
        const color = lVal - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
        return Math.round(255 * color).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
}

// Hex to HSL space separated
function hexToHsl(hex: string): string {
    let r = 0, g = 0, b = 0
    if (hex.length === 4) {
        r = parseInt('0x' + hex[1] + hex[1])
        g = parseInt('0x' + hex[2] + hex[2])
        b = parseInt('0x' + hex[3] + hex[3])
    } else if (hex.length === 7) {
        r = parseInt('0x' + hex[1] + hex[2])
        g = parseInt('0x' + hex[3] + hex[4])
        b = parseInt('0x' + hex[5] + hex[6])
    }

    r /= 255
    g /= 255
    b /= 255

    const cmin = Math.min(r, g, b),
        cmax = Math.max(r, g, b),
        delta = cmax - cmin
    let h = 0,
        s = 0,
        l = 0

    if (delta === 0)
        h = 0
    else if (cmax === r)
        h = ((g - b) / delta) % 6
    else if (cmax === g)
        h = (b - r) / delta + 2
    else
        h = (r - g) / delta + 4

    h = Math.round(h * 60)
    if (h < 0) h += 360

    l = (cmax + cmin) / 2
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
    s = +(s * 100).toFixed(1)
    l = +(l * 100).toFixed(1)

    return `${h} ${s}% ${l}%`
}

export function ColorPicker({ label, value, onChange, description }: ColorPickerProps) {
    const [hex, setHex] = React.useState('#000000')

    React.useEffect(() => {
        // Only update hex from props if it doesn't match current derived hex (avoid loops)
        setHex(hslToHex(value))
    }, [value])

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHex = e.target.value
        setHex(newHex)
        onChange(hexToHsl(newHex))
    }

    return (
        <div className="flex flex-col gap-2">
            <Label>{label}</Label>
            <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className="w-12 h-10 p-1 border-2"
                            style={{ backgroundColor: `hsl(${value})` }}
                        >
                            <span className="sr-only">Pick color</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3">
                        <Input
                            type="color"
                            value={hex}
                            onChange={handleHexChange}
                            className="w-[200px] h-[200px] p-0 border-0 cursor-pointer"
                        />
                    </PopoverContent>
                </Popover>
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="font-mono text-xs w-32"
                />
                <div className="text-xs text-muted-foreground">
                    {description}
                </div>
            </div>
        </div>
    )
}
