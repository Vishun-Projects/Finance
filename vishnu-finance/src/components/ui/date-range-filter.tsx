"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type DateRangePreset = 'month' | 'lastMonth' | 'quarter' | 'year' | 'all' | 'custom'

interface DateRangeFilterProps {
  className?: string
  startDate: string  // ISO string YYYY-MM-DD
  endDate: string    // ISO string YYYY-MM-DD
  onRangeChange: (startDate: string, endDate: string, preset: DateRangePreset) => void
  disabled?: boolean
  showPresets?: boolean
}

export function DateRangeFilter({
  className,
  startDate,
  endDate,
  onRangeChange,
  disabled = false,
  showPresets = true,
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [preset, setPreset] = React.useState<DateRangePreset>('month')
  
  // Convert ISO strings to Date objects for the picker
  const dateRange: DateRange | undefined = React.useMemo(() => {
    const from = startDate ? new Date(startDate) : undefined
    const to = endDate ? new Date(endDate) : undefined
    if (from && to) {
      return { from, to }
    }
    return undefined
  }, [startDate, endDate])

  // Update preset based on current range
  React.useEffect(() => {
    const today = new Date()
    const start = dateRange?.from
    const end = dateRange?.to
    
    if (!start || !end) return
    
    // Check if matches current month
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
    if (start.getTime() === currentMonthStart.getTime() && end.getTime() === currentMonthEnd.getTime()) {
      setPreset('month')
      return
    }
    
    // Check if matches last month
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999)
    if (start.getTime() === lastMonthStart.getTime() && end.getTime() === lastMonthEnd.getTime()) {
      setPreset('lastMonth')
      return
    }
    
    // Check if matches quarter
    const quarter = Math.floor(today.getMonth() / 3)
    const quarterStart = new Date(today.getFullYear(), quarter * 3, 1)
    const quarterEnd = new Date(today.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999)
    if (start.getTime() === quarterStart.getTime() && end.getTime() === quarterEnd.getTime()) {
      setPreset('quarter')
      return
    }
    
    // Check if matches year
    const yearStart = new Date(today.getFullYear(), 0, 1)
    const yearEnd = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999)
    if (start.getTime() === yearStart.getTime() && end.getTime() === yearEnd.getTime()) {
      setPreset('year')
      return
    }
    
    // Check if matches all time
    const allTimeStart = new Date(2020, 0, 1)
    const allTimeEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
    if (start.getTime() === allTimeStart.getTime() && end.getTime() === allTimeEnd.getTime()) {
      setPreset('all')
      return
    }
    
    setPreset('custom')
  }, [dateRange])

  const handlePresetClick = (presetValue: DateRangePreset) => {
    if (presetValue === 'custom') {
      setPreset('custom')
      setIsOpen(true)
      return
    }

    const today = new Date()
    let start: Date, end: Date
    
    switch (presetValue) {
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
        break
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999)
        break
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3)
        start = new Date(today.getFullYear(), quarter * 3, 1)
        end = new Date(today.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999)
        break
      case 'year':
        start = new Date(today.getFullYear(), 0, 1)
        end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999)
        break
      case 'all':
        start = new Date(2020, 0, 1)
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
        break
      default:
        return
    }
    
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]
    onRangeChange(startStr, endStr, presetValue)
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const start = new Date(range.from)
      start.setHours(0, 0, 0, 0)
      const end = new Date(range.to)
      end.setHours(23, 59, 59, 999)
      
      const startStr = start.toISOString().split('T')[0]
      const endStr = end.toISOString().split('T')[0]
      onRangeChange(startStr, endStr, 'custom')
      setIsOpen(false)
    } else if (range?.from) {
      // Only start date selected, wait for end date
      // Keep picker open
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showPresets && (
        <>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={preset === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handlePresetClick('month')}
              disabled={disabled}
              className="text-xs"
            >
              This Month
            </Button>
            <Button
              variant={preset === 'lastMonth' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handlePresetClick('lastMonth')}
              disabled={disabled}
              className="text-xs"
            >
              Last Month
            </Button>
            <Button
              variant={preset === 'quarter' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handlePresetClick('quarter')}
              disabled={disabled}
              className="text-xs"
            >
              Quarter
            </Button>
            <Button
              variant={preset === 'year' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handlePresetClick('year')}
              disabled={disabled}
              className="text-xs"
            >
              Year
            </Button>
            <Button
              variant={preset === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handlePresetClick('all')}
              disabled={disabled}
              className="text-xs"
            >
              All Time
            </Button>
          </div>
          <div className="h-6 w-px bg-gray-300" />
        </>
      )}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            size="sm"
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd-MM-yyyy")} - {format(dateRange.to, "dd-MM-yyyy")}
                </>
              ) : (
                format(dateRange.from, "dd-MM-yyyy")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleDateRangeChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

