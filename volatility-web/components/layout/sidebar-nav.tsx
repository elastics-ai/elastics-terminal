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
  { name: 'Bookkeeper', href: '/modules/bookkeeper', icon: TrendingUp },
  { name: 'Data Library', href: '/data-library', icon: Database },
  { name: 'Backtester', href: '/backtester', icon: Activity },
  { name: 'Markets', href: '/markets', icon: LayoutDashboard },
  { name: 'Data', href: '/data', icon: Database },
  { name: 'News', href: '/news', icon: FileText },
]

const bottomNavigation = [
  { name: 'Documentation', href: '/docs', icon: HelpCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-[200px] flex-col bg-[hsl(var(--sidebar-bg))] border-r border-border">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-border">
        <span className="text-xl font-semibold text-foreground">Elastics</span>
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
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-black text-white'
                  : 'text-[hsl(var(--sidebar-text))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-border px-2 py-4 space-y-1">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-black text-white'
                  : 'text-[hsl(var(--sidebar-text))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </div>

      {/* User Profile */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-medium text-primary">S</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Szymon</p>
            <p className="text-xs text-muted-foreground truncate">szymon@pavlizacapital.com</p>
            <p className="text-xs text-muted-foreground">Pavliza Capital</p>
          </div>
        </div>
      </div>
    </div>
  )
}