import { AppLayout } from "@/components/layout/app-layout"
import { PortfolioValueCards } from "@/components/dashboard/portfolio-value-cards"
import { PerformanceBreakdown } from "@/components/dashboard/performance-breakdown"
import { PortfolioExposure } from "@/components/dashboard/portfolio-exposure"
import { NewsFeed } from "@/components/dashboard/news-feed"
import { NotificationsPanel } from "@/components/dashboard/notifications-panel"

export default function Home() {
  return (
    <AppLayout>
      <div className="flex-1 p-6 overflow-y-auto bg-background">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-12 gap-6">
            {/* Main Dashboard Area */}
            <div className="col-span-9 flex flex-col gap-6">
              <PortfolioValueCards />
              <PerformanceBreakdown />
              <div className="grid grid-cols-2 gap-6">
                <PortfolioExposure />
                <NewsFeed />
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="col-span-3">
              <NotificationsPanel />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}