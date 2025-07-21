'use client'

import { useQuery } from '@tanstack/react-query'
import { chatAPI } from '@/lib/api'

interface SuggestedQuestionsProps {
  onSelectQuestion: (question: string) => void
}

export function SuggestedQuestions({ onSelectQuestion }: SuggestedQuestionsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['chat-suggestions'],
    queryFn: chatAPI.getSuggestions,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const suggestions = data?.suggestions || [
    "What's my current portfolio exposure?",
    "Show me my biggest positions",
    "Explain implied volatility",
    "What are options Greeks?",
    "Analyze my P&L performance"
  ]

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Suggested Questions</h3>
      
      {isLoading ? (
        <div className="animate-pulse text-sm text-gray-400">
          Loading suggestions...
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map((question: string, index: number) => (
            <button
              key={index}
              onClick={() => onSelectQuestion(question)}
              className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 text-sm text-gray-700 transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Capabilities</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Portfolio analysis</li>
          <li>• Risk assessment</li>
          <li>• Market insights</li>
          <li>• SQL query generation</li>
          <li>• Options education</li>
        </ul>
      </div>
    </div>
  )
}