'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export type YONValue = 'yes' | 'or' | 'no' | null

interface YONSelectorProps {
  value?: YONValue
  onChange?: (value: YONValue) => void
  disabled?: boolean
  className?: string
  labels?: {
    yes?: string
    or?: string
    no?: string
  }
}

export function YONSelector({
  value,
  onChange,
  disabled = false,
  className,
  labels = {
    yes: 'Yes',
    or: 'Or',
    no: 'No'
  }
}: YONSelectorProps) {
  const handleSelect = (newValue: YONValue) => {
    if (!disabled && onChange && newValue !== null) {
      onChange(newValue === value ? null : newValue)
    }
  }

  return (
    <div className={cn('inline-flex rounded-lg border border-gray-200 p-1', className)}>
      <button
        type="button"
        onClick={() => handleSelect('yes')}
        disabled={disabled}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-md transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500',
          value === 'yes'
            ? 'bg-green-500 text-white'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {labels.yes}
      </button>
      <button
        type="button"
        onClick={() => handleSelect('or')}
        disabled={disabled}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-md transition-colors mx-1',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500',
          value === 'or'
            ? 'bg-yellow-500 text-white'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {labels.or}
      </button>
      <button
        type="button"
        onClick={() => handleSelect('no')}
        disabled={disabled}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-md transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500',
          value === 'no'
            ? 'bg-red-500 text-white'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {labels.no}
      </button>
    </div>
  )
}