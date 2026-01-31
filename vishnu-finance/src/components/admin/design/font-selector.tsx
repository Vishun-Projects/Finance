'use client'

import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type FontSelectorProps = {
    label: string
    value: string
    onChange: (value: string) => void
    type: 'sans' | 'heading' | 'mono'
}

const FONTS = [
    { name: 'Inter', value: 'Inter, system-ui, sans-serif' },
    { name: 'Roboto', value: 'Roboto, system-ui, sans-serif' },
    { name: 'Open Sans', value: '"Open Sans", system-ui, sans-serif' },
    { name: 'SF Pro', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    { name: 'Geist', value: 'Geist, sans-serif' },
    { name: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
]

export function FontSelector({ label, value, onChange, type }: FontSelectorProps) {
    // Attempt to match complex value to simple name for Select value
    const matchedFont = FONTS.find(f => f.value === value)?.name || 'Custom'

    return (
        <div className="flex flex-col gap-2">
            <Label>{label}</Label>
            <Select
                value={matchedFont === 'Custom' ? undefined : value}
                onValueChange={onChange}
            >
                <SelectTrigger>
                    <SelectValue placeholder={value} />
                </SelectTrigger>
                <SelectContent>
                    {FONTS.map(font => (
                        <SelectItem key={font.name} value={font.value}>
                            <span style={{ fontFamily: font.value }}>{font.name}</span>
                        </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom...</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
