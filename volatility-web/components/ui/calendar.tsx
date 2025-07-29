"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"

interface CalendarProps {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  className?: string
}

const Calendar = React.forwardRef<
  HTMLDivElement,
  CalendarProps
>(({ className, mode, selected, onSelect, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`p-3 ${className}`}
      {...props}
    >
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Simple Calendar Placeholder</p>
        <Button
          variant="outline"
          onClick={() => onSelect?.(new Date())}
        >
          Select Today
        </Button>
      </div>
    </div>
  )
})
Calendar.displayName = "Calendar"

export { Calendar }
