"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

export function DatePicker({
  date,
  onDateChange,
  disabled = false,
  className,
  placeholder = "Pick a date",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd MMM yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            onDateChange?.(selectedDate)
            if (selectedDate) {
              setIsOpen(false)
            }
          }}
          initialFocus
          disabled={(date) => date > new Date()} // Disable future dates
          captionLayout="dropdown"
          fromYear={1900}
          toYear={new Date().getFullYear()}
          defaultMonth={date || new Date(new Date().getFullYear() - 25, 0, 1)} // Default to 25 years ago
        />
      </PopoverContent>
    </Popover>
  )
}

