'use client'

import { useState } from 'react'
import { RiskBreakdownHeatmap } from './risk-breakdown-heatmap'
import { FactorDecayingChart } from './factor-decaying-chart'
import { AggregateGreeksTable } from './aggregate-greeks-table'
import { StrategyHealthTable } from './strategy-health-table'
import { RiskOverviewSidebar } from './risk-overview-sidebar'

export function ElasticsRiskDashboard() {
  const [selectedDate, setSelectedDate] = useState('01/01/2023')
  const [selectedEndDate, setSelectedEndDate] = useState('31/12/2023')

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Risk</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Monte Carlo Simulator</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1 text-sm border rounded-md w-24"
              />
              <span className="text-sm">to</span>
              <input
                type="text"
                value={selectedEndDate}
                onChange={(e) => setSelectedEndDate(e.target.value)}
                className="px-3 py-1 text-sm border rounded-md w-24"
              />
            </div>
          </div>
        </div>

        {/* Risk Breakdown Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Risk Breakdown</h2>
          <div className="grid grid-cols-2 gap-6">
            <RiskBreakdownHeatmap />
            <FactorDecayingChart />
          </div>
        </div>

        {/* Greeks and Strategy Tables */}
        <div className="grid grid-cols-2 gap-6">
          <AggregateGreeksTable />
          <StrategyHealthTable />
        </div>
      </div>

      {/* Right Sidebar */}
      <RiskOverviewSidebar />
    </div>
  )
}