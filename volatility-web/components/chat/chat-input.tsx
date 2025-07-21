'use client'

import * as React from 'react'
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { PlusCircle } from "lucide-react"
import { cn } from '../../lib/utils'

export function ChatInput() {
  const [isFocused, setIsFocused] = React.useState(false)
  const [value, setValue] = React.useState('')

  return (
    <div className="relative">
      <div className={cn("absolute -top-14 left-0 flex gap-2 transition-opacity duration-300", isFocused ? "opacity-0" : "opacity-100")}>
        <Button variant="outline" size="sm" className="rounded-full bg-background">
          <PlusCircle className="w-4 h-4 mr-2" />
          Hedge BTC LONG with BTC PUT OPTION
        </Button>
        <Button variant="outline" size="sm" className="rounded-full bg-background">
          <PlusCircle className="w-4 h-4 mr-2" />
          Lower volatility with tighter SL
        </Button>
        <Button variant="outline" size="sm" className="rounded-full bg-background">
          <PlusCircle className="w-4 h-4 mr-2" />
          Circle IPO in 3 days - set up trading agent
        </Button>
      </div>
      
      {isFocused ? (
        <textarea
          placeholder="Ask anything"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            "flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all duration-300",
            "pr-12"
          )}
          autoFocus
        />
      ) : (
        <Input
          placeholder="Ask anything"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="pr-12 transition-all duration-300"
        />
      )}
    </div>
  )
}
