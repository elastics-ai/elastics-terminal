'use client'

import React from 'react'
import { Check, X, AlertCircle } from 'lucide-react'

interface SuggestedTrade {
  id: string
  contract: string
  action: 'buy' | 'sell'
  quantity: number
  currentPrice: number
  targetPrice: number
  impact: string
  reason: string
  approved?: boolean
}

interface SuggestedTradesTableProps {
  trades: SuggestedTrade[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onApproveAll: () => void
}

export function SuggestedTradesTable({ trades, onApprove, onReject, onApproveAll }: SuggestedTradesTableProps) {
  const pendingTrades = trades.filter(t => t.approved === undefined)
  const approvedTrades = trades.filter(t => t.approved === true)
  const rejectedTrades = trades.filter(t => t.approved === false)

  const formatPrice = (price: number) => `$${price.toFixed(2)}`
  const formatQuantity = (qty: number) => qty.toLocaleString()

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Suggested Trades</h3>
          {pendingTrades.length > 0 && (
            <button
              onClick={onApproveAll}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <Check className="h-4 w-4" />
              <span>Approve All ({pendingTrades.length})</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contract
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Impact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trades.map((trade) => (
              <tr key={trade.id} className={trade.approved === false ? 'opacity-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{trade.contract}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    trade.action === 'buy' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {trade.action.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatQuantity(trade.quantity)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPrice(trade.currentPrice)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPrice(trade.targetPrice)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-gray-900">{trade.impact}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {trade.reason}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {trade.approved === undefined ? (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onApprove(trade.id)}
                        className="p-1 hover:bg-green-100 rounded text-green-600"
                        title="Approve"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onReject(trade.id)}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                        title="Reject"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : trade.approved ? (
                    <span className="text-green-600 text-sm font-medium">Approved</span>
                  ) : (
                    <span className="text-red-600 text-sm font-medium">Rejected</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {trades.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No trades suggested. Portfolio is optimally balanced.</p>
        </div>
      )}

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              Pending: <span className="font-medium text-gray-900">{pendingTrades.length}</span>
            </span>
            <span className="text-gray-600">
              Approved: <span className="font-medium text-green-600">{approvedTrades.length}</span>
            </span>
            <span className="text-gray-600">
              Rejected: <span className="font-medium text-red-600">{rejectedTrades.length}</span>
            </span>
          </div>
          <div className="text-gray-600">
            Total Value Impact: <span className="font-medium text-gray-900">$12,450</span>
          </div>
        </div>
      </div>
    </div>
  )
}