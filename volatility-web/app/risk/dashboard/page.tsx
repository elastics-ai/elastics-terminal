'use client'

import React, { useState, useEffect } from 'react'
import { Shield, AlertTriangle, TrendingUp, Activity, Brain } from 'lucide-react'
import { RiskHeatmap } from '@/components/risk/risk-heatmap'
import { GreeksDisplay } from '@/components/risk/greeks-display'
import { AISuggestions } from '@/components/dashboard/ai-suggestions'

export default function RiskDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [riskData, setRiskData] = useState<any[]>([])
  const [greeksData, setGreeksData] = useState<any[]>([])
  const [portfolioMetrics, setPortfolioMetrics] = useState<any>({})

  useEffect(() => {
    fetchRiskData()
  }, [])

  const fetchRiskData = async () => {
    try {
      // Simulate API call
      setTimeout(() => {
        setRiskData([
          { category: 'Market Risk', subcategory: 'Delta', value: 0.75, label: 'High' },
          { category: 'Market Risk', subcategory: 'Gamma', value: 0.45, label: 'Medium' },
          { category: 'Market Risk', subcategory: 'Vega', value: 0.85, label: 'Critical' },
          { category: 'Market Risk', subcategory: 'Theta', value: 0.25, label: 'Low' },
          { category: 'Credit Risk', subcategory: 'Counterparty', value: 0.65, label: 'High' },
          { category: 'Credit Risk', subcategory: 'Settlement', value: 0.35, label: 'Medium' },
          { category: 'Credit Risk', subcategory: 'Collateral', value: 0.45, label: 'Medium' },
          { category: 'Credit Risk', subcategory: 'Concentration', value: 0.55, label: 'Medium' },
          { category: 'Operational Risk', subcategory: 'System', value: 0.15, label: 'Low' },
          { category: 'Operational Risk', subcategory: 'Process', value: 0.55, label: 'Medium' },
          { category: 'Operational Risk', subcategory: 'Model', value: 0.35, label: 'Medium' },
          { category: 'Operational Risk', subcategory: 'Regulatory', value: 0.25, label: 'Low' },
          { category: 'Liquidity Risk', subcategory: 'Funding', value: 0.45, label: 'Medium' },
          { category: 'Liquidity Risk', subcategory: 'Market', value: 0.65, label: 'High' },
          { category: 'Liquidity Risk', subcategory: 'Asset', value: 0.35, label: 'Medium' },
          { category: 'Liquidity Risk', subcategory: 'Contingent', value: 0.55, label: 'Medium' }
        ])

        setGreeksData([
          { name: 'Delta', value: 125000, change: 15000, changePercent: 13.6, description: 'Rate of change of option price with respect to underlying' },
          { name: 'Gamma', value: 8500, change: -1200, changePercent: -12.4, description: 'Rate of change of delta with respect to underlying' },
          { name: 'Vega', value: 45000, change: 5000, changePercent: 12.5, description: 'Sensitivity to volatility changes' },
          { name: 'Theta', value: -12000, change: -2000, changePercent: 20.0, description: 'Time decay of option value' },
          { name: 'Rho', value: 3500, change: 500, changePercent: 16.7, description: 'Sensitivity to interest rate changes' }
        ])

        setPortfolioMetrics({
          totalValue: 15250000,
          atRisk: 2100000,
          stressTestLoss: -850000,
          sharpeRatio: 1.25,
          maxDrawdown: -0.18,
          volatility: 0.24
        })

        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to fetch risk data:', error)
      setLoading(false)
    }
  }

  const aiSuggestions = [
    {
      type: 'warning' as const,
      title: 'High Vega Exposure Detected',
      description: 'Your portfolio has 85% Vega risk. Consider hedging with volatility swaps or reducing position sizes in high-vega options.',
      metric: 'Vega: 85%',
      trend: 'up' as const
    },
    {
      type: 'info' as const,
      title: 'Delta-Neutral Opportunity',
      description: 'Current delta exposure of $125k can be neutralized by shorting 1,250 shares of the underlying asset.',
      metric: 'Delta: $125k',
      trend: 'neutral' as const
    },
    {
      type: 'success' as const,
      title: 'Risk Diversification Improved',
      description: 'Your risk is now spread across 4 asset classes, reducing concentration risk by 30%.',
      metric: 'Concentration: -30%',
      trend: 'down' as const
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="h-8 w-8 text-orange-600" />
          <h1 className="text-2xl font-bold text-gray-900">Risk Dashboard</h1>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Portfolio Value</span>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">${(portfolioMetrics.totalValue / 1000000).toFixed(2)}M</p>
            <p className="text-sm text-green-600 mt-1">+12.5% MTD</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Value at Risk (95%)</span>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">${(portfolioMetrics.atRisk / 1000000).toFixed(2)}M</p>
            <p className="text-sm text-orange-600 mt-1">13.8% of portfolio</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Sharpe Ratio</span>
              <Activity className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{portfolioMetrics.sharpeRatio.toFixed(2)}</p>
            <p className="text-sm text-gray-600 mt-1">Risk-adjusted returns</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Max Drawdown</span>
              <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{(portfolioMetrics.maxDrawdown * 100).toFixed(1)}%</p>
            <p className="text-sm text-gray-600 mt-1">Peak to trough</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <RiskHeatmap data={riskData} />
        <GreeksDisplay greeks={greeksData} aggregateValue={186000} />
      </div>

      <div className="mb-6">
        <AISuggestions />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategy Health Score</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Market Making Strategy</span>
                <span className="text-sm font-medium text-green-600">Healthy (85)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Arbitrage Strategy</span>
                <span className="text-sm font-medium text-yellow-600">Warning (65)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Momentum Strategy</span>
                <span className="text-sm font-medium text-red-600">Critical (35)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-red-600 h-2 rounded-full" style={{ width: '35%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Metrics Timeline</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <p>Risk metrics chart would be displayed here</p>
          </div>
        </div>
      </div>
    </div>
  )
}