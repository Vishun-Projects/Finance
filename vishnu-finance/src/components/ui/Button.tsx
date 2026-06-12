"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const BASE_BUTTON_CLASSES =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"

const VARIANT_CLASSES = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
} as const

const SIZE_CLASSES = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
  icon: "h-9 w-9",
} as const

export type ButtonVariant = keyof typeof VARIANT_CLASSES
export type ButtonSize = keyof typeof SIZE_CLASSES

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
  pending?: boolean
}

interface ButtonVariantsInput {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

export function buttonVariants({ variant = "default", size = "default", className }: ButtonVariantsInput = {}) {
  return cn(BASE_BUTTON_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, pending = false, disabled, children, ...props }, ref) => {
    const isDisabled = disabled || pending

    if (asChild) {
      return (
        <Slot
          className={buttonVariants({ variant, size, className })}
          ref={ref}
          aria-busy={pending || undefined}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        disabled={isDisabled}
        aria-busy={pending || undefined}
        {...props}
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {children}
      </button>
    )
  },
)
Button.displayName = "Button"

export { Button }
