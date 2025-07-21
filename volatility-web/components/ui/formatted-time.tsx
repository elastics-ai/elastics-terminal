'use client'

import { ClientOnly } from './client-only'

interface FormattedTimeProps {
  timestamp: number | string | Date
  format?: 'time' | 'date' | 'datetime' | 'relative'
  locale?: string
  className?: string
  fallback?: string
}

export function FormattedTime({ 
  timestamp, 
  format = 'time', 
  locale, 
  className,
  fallback = '--:--:--'
}: FormattedTimeProps) {
  const formatTime = () => {
    try {
      const date = new Date(timestamp)
      
      switch (format) {
        case 'time':
          return date.toLocaleTimeString(locale)
        case 'date':
          return date.toLocaleDateString(locale)
        case 'datetime':
          return date.toLocaleString(locale)
        case 'relative':
          // Simple relative time
          const now = new Date()
          const diff = now.getTime() - date.getTime()
          const seconds = Math.floor(diff / 1000)
          const minutes = Math.floor(seconds / 60)
          const hours = Math.floor(minutes / 60)
          const days = Math.floor(hours / 24)
          
          if (days > 0) return `${days}d ago`
          if (hours > 0) return `${hours}h ago`
          if (minutes > 0) return `${minutes}m ago`
          if (seconds > 0) return `${seconds}s ago`
          return 'just now'
        default:
          return date.toLocaleTimeString(locale)
      }
    } catch (error) {
      return fallback
    }
  }

  return (
    <ClientOnly fallback={<span className={className}>{fallback}</span>}>
      <span className={className}>{formatTime()}</span>
    </ClientOnly>
  )
}