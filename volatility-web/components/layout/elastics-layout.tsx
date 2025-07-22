'use client'

import { ReactNode } from 'react'
import { SidebarNav } from './sidebar-nav'
import { ElasticsHeader } from './elastics-header'

interface ElasticsLayoutProps {
  children: ReactNode
}

export function ElasticsLayout({ children }: ElasticsLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <SidebarNav />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <ElasticsHeader />
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}