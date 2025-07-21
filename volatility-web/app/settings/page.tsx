'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { Bell, Shield, Database, Zap } from 'lucide-react'
import { useState } from 'react'

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    trades: true,
    volatility: true,
    portfolio: false,
    news: false,
  })

  const [tradingPrefs, setTradingPrefs] = useState({
    autoHedge: false,
    maxPosition: '10000',
    defaultLeverage: '1',
  })

  return (
    <AppLayout>
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="border-b border-border pb-4">
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-2">
              Configure your trading preferences and notifications
            </p>
          </div>

          {/* Notifications */}
          <div className="border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-sm">Trade Executions</span>
                <input
                  type="checkbox"
                  checked={notifications.trades}
                  onChange={(e) => setNotifications({...notifications, trades: e.target.checked})}
                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-sm">Volatility Alerts</span>
                <input
                  type="checkbox"
                  checked={notifications.volatility}
                  onChange={(e) => setNotifications({...notifications, volatility: e.target.checked})}
                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-sm">Portfolio Updates</span>
                <input
                  type="checkbox"
                  checked={notifications.portfolio}
                  onChange={(e) => setNotifications({...notifications, portfolio: e.target.checked})}
                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-sm">Market News</span>
                <input
                  type="checkbox"
                  checked={notifications.news}
                  onChange={(e) => setNotifications({...notifications, news: e.target.checked})}
                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                />
              </label>
            </div>
          </div>

          {/* Trading Preferences */}
          <div className="border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Trading Preferences</h2>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-sm">Auto-Hedge Delta</span>
                <input
                  type="checkbox"
                  checked={tradingPrefs.autoHedge}
                  onChange={(e) => setTradingPrefs({...tradingPrefs, autoHedge: e.target.checked})}
                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                />
              </label>
              
              <div>
                <label className="block text-sm mb-2">Max Position Size (USD)</label>
                <input
                  type="text"
                  value={tradingPrefs.maxPosition}
                  onChange={(e) => setTradingPrefs({...tradingPrefs, maxPosition: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-2">Default Leverage</label>
                <select
                  value={tradingPrefs.defaultLeverage}
                  onChange={(e) => setTradingPrefs({...tradingPrefs, defaultLeverage: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="1">1x</option>
                  <option value="2">2x</option>
                  <option value="5">5x</option>
                  <option value="10">10x</option>
                  <option value="20">20x</option>
                </select>
              </div>
            </div>
          </div>

          {/* API Settings */}
          <div className="border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">API Configuration</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">API Key</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-2">API Secret</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Data Sources */}
          <div className="border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Data Sources</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Deribit</span>
                <span className="text-xs text-green-500">● Connected</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Polymarket</span>
                <span className="text-xs text-green-500">● Connected</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Binance</span>
                <span className="text-xs text-muted-foreground">○ Disconnected</span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <button className="px-6 py-2 border border-border rounded-md hover:bg-muted transition-colors">
              Cancel
            </button>
            <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}