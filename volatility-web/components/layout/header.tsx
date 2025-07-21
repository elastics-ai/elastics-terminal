'use client'

import { Bell } from "lucide-react"
import { useState, useEffect } from 'react'

export function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const formatTime = (date: Date) => {
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds} UTC`;
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-white">
      <div>
        <h1 className="text-xl font-semibold">Portfolio Overview</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-muted-foreground">Critical</span>
            <span className="status-badge status-critical">1</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-muted-foreground">Warning</span>
            <span className="status-badge status-warning">4</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span className="text-muted-foreground">Info</span>
            <span className="status-badge status-info">14</span>
          </div>
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{formatTime(time)}</span>
          <div className="relative">
            <Bell className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </div>
        </div>
      </div>
    </header>
  )
}