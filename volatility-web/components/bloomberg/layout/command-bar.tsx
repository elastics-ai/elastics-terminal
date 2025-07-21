'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const COMMANDS = {
  PORT: '/portfolio',
  FILTER: '/filter',
  VOL: '/volatility',
  CHAT: '/chat',
  POLY: '/polymarket',
  HELP: '/help',
}

export function CommandBar() {
  const [command, setCommand] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isActive, setIsActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Activate command bar with '/' or 'Escape' to clear
      if (e.key === '/' && !isActive) {
        e.preventDefault()
        setIsActive(true)
        inputRef.current?.focus()
      } else if (e.key === 'Escape') {
        setCommand('')
        setIsActive(false)
        inputRef.current?.blur()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive])

  useEffect(() => {
    // Update suggestions based on input
    if (command.length > 0) {
      const filtered = Object.keys(COMMANDS).filter(cmd =>
        cmd.toLowerCase().startsWith(command.toLowerCase())
      )
      setSuggestions(filtered)
    } else {
      setSuggestions([])
    }
  }, [command])

  const executeCommand = (cmd: string) => {
    const upperCmd = cmd.toUpperCase()
    if (COMMANDS[upperCmd as keyof typeof COMMANDS]) {
      router.push(COMMANDS[upperCmd as keyof typeof COMMANDS])
      setCommand('')
      setIsActive(false)
      inputRef.current?.blur()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    executeCommand(command)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault()
      setCommand(suggestions[0])
    }
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="w-full">
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-2 border transition-all",
            isActive
              ? "border-bloomberg-amber bg-black/50"
              : "border-bloomberg-amber/30 bg-black/30"
          )}
        >
          <span className="text-bloomberg-amber text-sm font-mono">
            {isActive ? '>' : '/'}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsActive(true)}
            onBlur={() => setTimeout(() => setIsActive(false), 200)}
            placeholder={isActive ? "Enter command (PORT, FILTER, VOL, CHAT, POLY)" : "Press / to enter command"}
            className="flex-1 bg-transparent text-bloomberg-amber placeholder:text-bloomberg-amber/50 outline-none font-mono text-sm"
          />
          {command && (
            <button
              type="submit"
              className="text-bloomberg-amber hover:text-bloomberg-amber/80 text-sm font-mono"
            >
              ENTER
            </button>
          )}
        </div>
      </form>

      {/* Suggestions dropdown */}
      {isActive && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-bloomberg-amber/50">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => executeCommand(suggestion)}
              className="w-full px-4 py-2 text-left text-bloomberg-amber hover:bg-bloomberg-amber/20 font-mono text-sm"
            >
              {suggestion} - {COMMANDS[suggestion as keyof typeof COMMANDS]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}