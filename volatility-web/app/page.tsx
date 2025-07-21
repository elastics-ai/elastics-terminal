import { AppLayout } from "@/components/layout/app-layout"
import { PortfolioValueCards } from "@/components/dashboard/portfolio-value-cards"
import { RiskMetrics } from "@/components/dashboard/risk-metrics"
import { GreeksDisplay } from "@/components/dashboard/greeks-display"
import { PerformanceBreakdown } from "@/components/dashboard/performance-breakdown"
import { PortfolioExposure } from "@/components/dashboard/portfolio-exposure"
import { NewsFeed } from "@/components/dashboard/news-feed"
import { NotificationsPanel } from "@/components/dashboard/notifications-panel"

export default function Home() {
  return (
    <AppLayout>
      <div className="flex flex-1">
        {/* Main Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground">Portfolio Overview</h1>
          </div>

          <div className="space-y-6">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-12 gap-4">
              {/* Portfolio Value Cards - 8 columns */}
              <div className="col-span-8">
                <PortfolioValueCards />
              </div>

              {/* Risk Metrics - 4 columns */}
              <div className="col-span-4">
                <RiskMetrics />
              </div>
            </div>

            {/* Greeks Display - Full Width */}
            <GreeksDisplay />

            {/* Middle Row */}
            <div className="grid grid-cols-12 gap-6">
              {/* Performance Breakdown - 7 columns */}
              <div className="col-span-7">
                <PerformanceBreakdown />
              </div>

              {/* Portfolio Exposure - 5 columns */}
              <div className="col-span-5">
                <PortfolioExposure />
              </div>
            </div>

            {/* News Feed - Full Width */}
            <NewsFeed />
          </div>
        </div>

        {/* Notifications Sidebar */}
        <NotificationsPanel />
      </div>
    </AppLayout>
  )
}