'use client'

import { AppLayout } from "@/components/layout/app-layout"
import { PortfolioSummary } from "@/components/bloomberg/views/portfolio/portfolio-summary"
import { RiskMetrics } from "@/components/bloomberg/views/portfolio/risk-metrics"
import { PnLBreakdown } from "@/components/bloomberg/views/portfolio/pnl-breakdown"
import { PositionsTable } from "@/components/bloomberg/views/portfolio/positions-table"

export default function PortfolioPage() {
  return (
    <AppLayout>
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Portfolio Management</h1>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Top row - 3 panels */}
          <div className="col-span-4">
            <PortfolioSummary />
          </div>
          <div className="col-span-4">
            <RiskMetrics />
          </div>
          <div className="col-span-4">
            <PnLBreakdown />
          </div>
          
          {/* Bottom row - full width positions table */}
          <div className="col-span-12">
            <PositionsTable />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}