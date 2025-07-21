'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Home, 
  PieChart, 
  TrendingUp, 
  MessageSquare,
  BarChart3,
  Settings,
  Database,
  Newspaper,
  Book,
  BotMessageSquare
} from 'lucide-react'
import { Header } from './header'
import { FixedChatInput } from '@/components/chat/FixedChatInput'
import Image from 'next/image'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Agents', href: '/agents', icon: BotMessageSquare },
  { name: 'Portfolio', href: '/portfolio', icon: PieChart },
  { name: 'Risk', href: '/risk', icon: TrendingUp },
  { name: 'Backtester', href: '/backtester', icon: BarChart3 },
  { name: 'Prediction Markets', href: '/polymarket', icon: BarChart3 },
  { name: 'Data Library', href: '/data', icon: Database },
  { name: 'Agent Library', href: '/agent-library', icon: MessageSquare },
  { name: 'News', href: '/news', icon: Newspaper },
  { name: 'Volatility Filter', href: '/filter', icon: TrendingUp },
]

const bottomNavigation = [
  { name: 'Documentation', href: '/docs', icon: Book },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-60 bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-text))] flex flex-col">
        {/* Logo */}
        <div className="p-4 flex items-center gap-3">
          <div className="flex items-center">
            <span className="text-xl">☰</span>
          </div>
          <h1 className="text-lg font-semibold">
            Elastics
          </h1>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-[hsl(var(--sidebar-active))] text-white"
                    : "text-[hsl(var(--sidebar-text))]/70 hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-text))]"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Navigation & User Info */}
        <div className="px-4 py-4 space-y-4 border-t border-[hsl(var(--sidebar-text))]/10">
          <nav className="space-y-1">
            {bottomNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-[hsl(var(--sidebar-active))] text-white"
                      : "text-[hsl(var(--sidebar-text))]/70 hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-text))]"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="p-2 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--sidebar-active))] flex items-center justify-center">
                <span className="text-sm font-medium text-white">W</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[hsl(var(--sidebar-text))]">Wojtek</p>
                <p className="text-xs text-[hsl(var(--sidebar-text))]/60">wojtek@elastics.ai</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto pb-24">
          {children}
        </div>
      </main>

      {/* Fixed Chat Input - Available on all pages */}
      <FixedChatInput />
    </div>
  )
}