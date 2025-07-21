'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import { FormattedTime } from '@/components/ui/formatted-time'
import { GitBranch, Copy, Check } from 'lucide-react'

interface ChatMessageProps {
  message: {
    id?: string
    messageId?: number
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
  }
  onBranch?: (messageId: number) => void
  branches?: number
}

export function ChatMessage({ message, onBranch, branches }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  
  const roleLabels = {
    user: 'You',
    assistant: 'Assistant',
    system: 'System'
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn(
      "group relative py-4",
      message.role === 'user' ? 'flex justify-end' : ''
    )}>
      <div className={cn(
        "max-w-[70%]",
        message.role === 'user' ? 'bg-gray-50 rounded-lg px-4 py-3' : ''
      )}>
        {/* Message Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            "text-xs font-medium",
            message.role === 'user' ? 'text-gray-600' : 'text-gray-700'
          )}>
            {roleLabels[message.role]}
          </span>
          <span className="text-xs text-gray-400">
            <FormattedTime timestamp={message.timestamp} format="time" fallback="--:--:--" />
          </span>
          {/* Branch indicator */}
          {branches && branches > 0 && (
            <span className="flex items-center gap-1 text-xs text-blue-500">
              <GitBranch className="w-3 h-3" />
              {branches} {branches === 1 ? 'branch' : 'branches'}
            </span>
          )}
        </div>
        
        {/* Message Content */}
        <div className={cn(
          "text-sm",
          message.role === 'system' && "text-gray-600 italic",
          message.role === 'user' && "text-gray-800"
        )}>
          {message.role === 'assistant' ? (
            <div className="prose prose-sm max-w-none text-gray-800">
              <ReactMarkdown 
                components={{
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '')
                  return match ? (
                    <pre className="bg-gray-50 border border-gray-200 p-3 my-3 rounded-md overflow-x-auto">
                      <code className={`text-sm ${className}`} {...props}>
                        {children}
                      </code>
                    </pre>
                  ) : (
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded-sm text-sm font-mono" {...props}>
                      {children}
                    </code>
                  )
                },
                p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                h3: ({ children }) => <h3 className="font-semibold text-gray-900 mt-4 mb-2 text-base">{children}</h3>,
                table: ({ children }) => (
                  <table className="border border-gray-200 my-2 text-sm">
                    {children}
                  </table>
                ),
                th: ({ children }) => (
                  <th className="border border-gray-200 px-3 py-1 text-left bg-gray-50 font-medium">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-gray-200 px-3 py-1">
                    {children}
                  </td>
                ),
              }}
            >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-gray-800">{message.content}</div>
          )}
        </div>
      </div>
      
      {/* Action buttons - appear on hover */}
      <div className={cn(
        "absolute opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2",
        message.role === 'user' ? 'left-0 top-4' : 'right-0 top-4'
      )}>
        {/* Copy button */}
        {message.role !== 'system' && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700
                       bg-white hover:bg-gray-50 rounded-md shadow-sm border border-gray-200"
            title="Copy message"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        )}
        
        {/* Branch button */}
        {message.messageId && onBranch && message.role !== 'system' && (
          <button
            onClick={() => onBranch(message.messageId!)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700
                       bg-white hover:bg-gray-50 rounded-md shadow-sm border border-gray-200"
            title="Create a branch from this message"
          >
            <GitBranch className="w-3 h-3" />
            Branch
            {branches && branches > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full text-[10px] font-medium">
                {branches}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
