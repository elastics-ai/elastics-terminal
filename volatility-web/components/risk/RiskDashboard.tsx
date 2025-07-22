'use client'

import { useState } from 'react'
import { RiskHeader } from './RiskHeader'
import { RiskOverview } from './RiskOverview'
import { FactorDecomposition } from './FactorDecomposition'
import { GreeksAnalysis } from './GreeksAnalysis'
import { StrategyMetrics } from './StrategyMetrics'
import { VolatilityMetrics } from './VolatilityMetrics'

export function RiskDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [timeRange, setTimeRange] = useState('1D')

  return (
    <div className="min-h-screen bg-background">
      <RiskHeader 
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
      
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left column - Risk Overview */}
          <div className="col-span-3">
            <RiskOverview />
          </div>
          
          {/* Middle column - Factor Decomposition */}
          <div className="col-span-6">
            <FactorDecomposition timeRange={timeRange} />
          </div>
          
          {/* Right column - Strategy & Greeks */}
          <div className="col-span-3 space-y-6">
            <StrategyMetrics />
            <GreeksAnalysis />
            <VolatilityMetrics />
          </div>
        </div>
      </div>
    </div>
  )
}