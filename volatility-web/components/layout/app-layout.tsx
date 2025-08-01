'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
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
  BotMessageSquare,
  LogOut,
  User
} from 'lucide-react'
import { Header } from './header'
// import { FixedChatInput } from '@/components/chat/FixedChatInput'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const { data: session, status } = useSession()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

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
            {status === 'loading' ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-300 animate-pulse"></div>
                <div className="flex-1">
                  <div className="w-20 h-4 bg-gray-300 rounded animate-pulse mb-1"></div>
                  <div className="w-32 h-3 bg-gray-300 rounded animate-pulse"></div>
                </div>
              </div>
            ) : session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 w-full hover:bg-[hsl(var(--sidebar-hover))] p-2 rounded-md transition-colors">
                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--sidebar-active))] flex items-center justify-center">
                      {session.user.image ? (
                        <Image
                          src={session.user.image}
                          alt={session.user.name || 'User'}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <span className="text-sm font-medium text-white">
                          {session.user.name?.charAt(0)?.toUpperCase() || 
                           session.user.email?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-[hsl(var(--sidebar-text))]">
                        {session.user.name || 'User'}
                      </p>
                      <p className="text-xs text-[hsl(var(--sidebar-text))]/60 truncate">
                        {session.user.email}
                      </p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-56" 
                  align="end" 
                  forceMount
                >
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {session.user.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user.email}
                      </p>
                      {(session as any).tenantId && (
                        <p className="text-xs leading-none text-muted-foreground">
                          Tenant: {(session as any).tenantId}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-red-600 focus:text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[hsl(var(--sidebar-text))]">Not signed in</p>
                  <Button
                    onClick={() => window.location.href = '/auth/signin'}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-[hsl(var(--sidebar-text))]/60 hover:text-[hsl(var(--sidebar-text))] p-0 h-auto font-normal"
                  >
                    Sign in
                  </Button>
                </div>
              </div>
            )}
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

      {/* Fixed Chat Input - Disabled for demo */}
      {/* <FixedChatInput /> */}
    </div>
  )
}