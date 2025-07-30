'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  Bot,
  Package,
  Activity,
  Database,
  FileText,
  Settings,
  HelpCircle,
  Home
} from 'lucide-react'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { name: 'Portfolio Overview', href: '/portfolio-overview', icon: LayoutDashboard },
  { name: 'Risk', href: '/risk', icon: TrendingUp },
  { name: 'Agents', href: '/agents', icon: Bot },
  { name: 'Modules', href: '/modules', icon: Package },
  { name: 'Volatility Surface', href: '/modules/volatility', icon: Activity },
  { name: '3D Vol Surfaces', href: '/volatility/surfaces', icon: TrendingUp },
  { name: 'Bookkeeper', href: '/modules/bookkeeper', icon: TrendingUp },
  { name: 'Data Library', href: '/data-library', icon: Database },
  { name: 'Backtester', href: '/backtester', icon: Activity },
  { name: 'Markets', href: '/markets', icon: LayoutDashboard },
  { name: 'Data', href: '/elastics', icon: Database },
  { name: 'News', href: '/news', icon: FileText },
]

const bottomNavigation = [
  { name: 'Documentation', href: '/docs', icon: HelpCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-[200px] flex-col border-r border-[hsl(var(--sidebar-border))]" style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}>
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-[hsl(var(--sidebar-border))]">
        <span className="text-xl font-semibold text-[hsl(var(--sidebar-text))]">Elastics</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'bg-black text-white shadow-md'
                  : 'text-[hsl(var(--sidebar-text))] hover:bg-[hsl(var(--sidebar-hover))]'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-[hsl(var(--sidebar-border))] px-2 py-4 space-y-1">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'bg-black text-white shadow-md'
                  : 'text-[hsl(var(--sidebar-text))] hover:bg-[hsl(var(--sidebar-hover))]'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </div>

      {/* User Profile */}
      <div className="border-t border-[hsl(var(--sidebar-border))] p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[hsl(var(--sidebar-active))]/20 flex items-center justify-center">
            <span className="text-xs font-medium text-[hsl(var(--sidebar-active))]">S</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[hsl(var(--sidebar-text))] truncate">Szymon</p>
            <p className="text-xs text-[hsl(var(--sidebar-text))]/70 truncate">szymon@pavlizacapital.com</p>
            <p className="text-xs text-[hsl(var(--sidebar-text))]/70">Pavliza Capital</p>
          </div>
        </div>
      </div>
    </div>
  )
}