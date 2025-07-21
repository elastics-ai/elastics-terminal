'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Home, 
  PieChart, 
  TrendingUp, 
  Activity,
  MessageSquare,
  BarChart3,
  FileText,
  Settings,
  Database
} from 'lucide-react'
import { Header } from './header'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Agents', href: '/agents', icon: Activity },
  { name: 'Portfolio', href: '/portfolio', icon: PieChart },
  { name: 'Risk', href: '/risk', icon: TrendingUp },
  { name: 'Backtester', href: '/backtester', icon: BarChart3 },
  { name: 'Prediction Markets', href: '/polymarket', icon: BarChart3 },
  { name: 'Data Library', href: '/data', icon: FileText },
  { name: 'Agent Library', href: '/agent-library', icon: MessageSquare },
  { name: 'Chat History', href: '/chat-history', icon: MessageSquare },
  { name: 'Modules', href: '/modules', icon: Database },
]

const bottomNavigation = [
  { name: 'News', href: '/news', icon: FileText },
  { name: 'Documentation', href: '/docs', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-[200px] bg-[hsl(var(--sidebar-bg))] border-r border-border">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-border/20">
            <h1 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="text-xl">☰</span> Elastics
            </h1>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "text-[hsl(var(--sidebar-text))] hover:bg-white/10"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Bottom Navigation */}
          <nav className="px-2 py-4 space-y-1 border-t border-border/20">
            {bottomNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "text-[hsl(var(--sidebar-text))] hover:bg-white/10"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-border/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-medium text-primary">S</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-white">szymon@elastics.ai</p>
                <p className="text-xs text-[hsl(var(--sidebar-text))]">Elastics</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        {children}
      </div>
    </div>
  )
}