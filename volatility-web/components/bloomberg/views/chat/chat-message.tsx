'use client'

import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import { FormattedTime } from '@/components/ui/formatted-time'
import { GitBranch } from 'lucide-react'

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
  const roleLabels = {
    user: 'You',
    assistant: 'Assistant',
    system: 'System'
  }

  return (
    <div className="group relative">
      <div className="max-w-[85%]">
        {/* Message Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-700">
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
          message.role === 'system' && "text-gray-600 italic"
        )}>
          {message.role === 'assistant' ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown 
                components={{
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '')
                  return match ? (
                    <pre className="bg-gray-50 border border-gray-200 p-3 my-2 rounded overflow-x-auto">
                      <code className={`text-sm ${className}`} {...props}>
                        {children}
                      </code>
                    </pre>
                  ) : (
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  )
                },
                p: ({ children }) => <p className="mb-2 text-gray-800">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-2 text-gray-800">{children}</ul>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 text-gray-800">{children}</ol>,
                h3: ({ children }) => <h3 className="font-medium text-gray-900 mt-3 mb-1">{children}</h3>,
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
      
      {/* Branch button - appears on hover */}
      {message.messageId && onBranch && message.role !== 'system' && (
        <button
          onClick={() => onBranch(message.messageId!)}
          className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity
                     flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800
                     bg-gray-100 hover:bg-gray-200 rounded-md shadow-sm"
          title="Create a branch from this message"
        >
          <GitBranch className="w-3 h-3" />
          Branch
        </button>
      )}
    </div>
  )
}
