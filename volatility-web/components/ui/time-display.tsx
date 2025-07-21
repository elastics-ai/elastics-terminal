'use client'

import { useEffect, useState } from 'react'
import { ClientOnly } from './client-only'

interface TimeDisplayProps {
  format?: 'time' | 'date' | 'datetime'
  locale?: string
  className?: string
  fallback?: string
}

export function TimeDisplay({ 
  format = 'time', 
  locale, 
  className,
  fallback = '--:--:--'
}: TimeDisplayProps) {
  const [time, setTime] = useState<string>(fallback)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      let formatted: string
      
      switch (format) {
        case 'time':
          formatted = now.toLocaleTimeString(locale)
          break
        case 'date':
          formatted = now.toLocaleDateString(locale)
          break
        case 'datetime':
          formatted = now.toLocaleString(locale)
          break
        default:
          formatted = now.toLocaleTimeString(locale)
      }
      
      setTime(formatted)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [format, locale])

  return (
    <ClientOnly fallback={<span className={className}>{fallback}</span>}>
      <span className={className}>{time}</span>
    </ClientOnly>
  )
}