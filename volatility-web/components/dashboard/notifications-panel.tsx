'use client'

import { Bell, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const notifications = [
  {
    id: 1,
    title: 'Pair Trading Strategy',
    content: 'IT flagged • 61 ago',
    status: 'critical',
    time: '11:45am',
  },
  {
    id: 2,
    title: 'Event-driven Strategy',
    content: 'IT triggered • 9d ago',
    status: 'critical',
    time: '11:02am',
  },
  {
    id: 3,
    title: 'Pair Trading Strategy',
    content: 'IT flagged • 7d ago',
    status: 'critical',
    time: '10:58am',
  },
  {
    id: 4,
    title: 'Event-driven Strategy',
    content: 'IT triggered • 10 ago',
    status: 'info',
    time: '10:45am',
  },
]

export function NotificationsPanel() {
  return (
    <div className="w-80 bg-card border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <h3 className="text-sm font-semibold">Notifications</h3>
            <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">1</span>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="p-4 border-b border-border hover:bg-secondary/20 transition-colors cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                notification.status === 'critical' 
                  ? "bg-[hsl(var(--critical))] text-white" 
                  : "bg-[hsl(var(--info))] text-white"
              )}>
                {notification.status}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium mb-1">{notification.title}</h4>
                <p className="text-xs text-muted-foreground">{notification.content}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {notification.time}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border">
        <button className="text-xs text-primary hover:underline w-full text-center">
          See All
        </button>
      </div>
    </div>
  )
}