'use client'

import React from 'react'
import { TrendingUp, AlertCircle } from 'lucide-react'

interface ContractMatch {
  id: string
  event: string
  kalshiPrice: number | null
  polymarketPrice: number | null
  deribitPrice: number | null
  spread: number
  spreadPercent: number
  recommendation: string
  potentialProfit: number
  tags: string[]
}

interface ContractMatcherTableProps {
  matches: ContractMatch[]
}

export function ContractMatcherTable({ matches }: ContractMatcherTableProps) {
  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
    return `${price}¢`
  }

  const getSpreadColor = (spreadPercent: number) => {
    if (spreadPercent >= 15) return 'text-green-600'
    if (spreadPercent >= 10) return 'text-yellow-600'
    if (spreadPercent >= 5) return 'text-orange-600'
    return 'text-gray-600'
  }

  const getRecommendationParts = (recommendation: string) => {
    const parts = recommendation.split(', ')
    return parts.map(part => {
      const [action, exchange] = part.split(' ')
      return { action, exchange }
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kalshi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Polymarket
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deribit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Spread
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recommendation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Potential Profit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {matches.map((match) => (
              <tr key={match.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{match.event}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm font-medium ${match.kalshiPrice !== null ? 'text-gray-900' : 'text-gray-400'}`}>
                    {formatPrice(match.kalshiPrice)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm font-medium ${match.polymarketPrice !== null ? 'text-gray-900' : 'text-gray-400'}`}>
                    {formatPrice(match.polymarketPrice)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm font-medium ${match.deribitPrice !== null ? 'text-gray-900' : 'text-gray-400'}`}>
                    {formatPrice(match.deribitPrice)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm font-medium ${getSpreadColor(match.spreadPercent)}`}>
                    {match.spread}¢ ({match.spreadPercent}%)
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getRecommendationParts(match.recommendation).map((part, idx) => (
                      <span key={idx} className="text-sm">
                        <span className={`font-medium ${part.action === 'Buy' ? 'text-green-600' : 'text-red-600'}`}>
                          {part.action}
                        </span>
                        <span className="text-gray-600"> {part.exchange}</span>
                        {idx < getRecommendationParts(match.recommendation).length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">
                      ${match.potentialProfit}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {match.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}