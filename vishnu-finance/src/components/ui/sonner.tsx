"use client"

import { useEffect, useState } from "react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")

  useEffect(() => {
    // Detect theme from document class
    const updateTheme = () => {
      if (typeof window !== "undefined") {
        const isDark = document.documentElement.classList.contains("dark")
        const isHighContrast = document.documentElement.classList.contains("high-contrast")
        setTheme(isDark || isHighContrast ? "dark" : "light")
      }
    }

    // Initial theme detection
    updateTheme()

    // Watch for theme changes via MutationObserver
    const observer = new MutationObserver(updateTheme)
    if (typeof window !== "undefined") {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      })
    }

    return () => observer.disconnect()
  }, [])

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast glass-regular glass-text group-[.toaster]:shadow-none",
          description: "group-[.toast]:opacity-80 font-medium",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
