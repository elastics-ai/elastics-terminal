'use client'

import { Bell, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface StatusBadgeProps {
  label: string
  value: string | number
  status?: 'critical' | 'warning' | 'info' | 'success'
}

function StatusBadge({ label, value, status }: StatusBadgeProps) {
  const statusColors = {
    critical: 'text-red-600 bg-red-50',
    warning: 'text-amber-600 bg-amber-50',
    info: 'text-blue-600 bg-blue-50',
    success: 'text-green-600 bg-green-50',
  }

  const statusIcons = {
    critical: AlertCircle,
    warning: AlertCircle,
    info: Info,
    success: CheckCircle,
  }

  const Icon = status ? statusIcons[status] : null

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-md",
      status ? statusColors[status] : "text-gray-600 bg-gray-50"
    )}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span className="text-xs font-medium">{label}</span>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  )
}

export function ElasticsHeader() {
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })

  return (
    <div className="h-12 border-b border-border bg-background px-6 flex items-center justify-between">
      {/* Left side - Elastics branding and status */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          <span className="text-sm font-medium">Elastics</span>
        </div>
        
        <div className="flex items-center gap-3">
          <StatusBadge label="Critical" value="3" status="critical" />
          <StatusBadge label="Warning" value="2" status="warning" />
          <StatusBadge label="Info" value="4" status="info" />
        </div>
      </div>

      {/* Right side - Time and notifications */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{currentTime} UTC</span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Portfolio Risk Alert
              </div>
              <p className="text-xs text-muted-foreground">
                Risk level exceeded threshold on Strategy Alpha
              </p>
              <span className="text-xs text-muted-foreground">2 minutes ago</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 text-blue-500" />
                Market Update
              </div>
              <p className="text-xs text-muted-foreground">
                VIX increased by 12% in the last hour
              </p>
              <span className="text-xs text-muted-foreground">15 minutes ago</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}