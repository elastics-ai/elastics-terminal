'use client'

import React from 'react'
import { AppLayout } from '@/components/layout/app-layout'

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome to Volatility Terminal</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Portfolio Value</h3>
            <p className="text-3xl font-bold text-green-600">$2,540,300</p>
            <p className="text-sm text-gray-500">+2.46% today</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Open Positions</h3>
            <p className="text-3xl font-bold text-blue-600">127</p>
            <p className="text-sm text-gray-500">Active trades</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">P&amp;L Today</h3>
            <p className="text-3xl font-bold text-green-600">+$61,024</p>
            <p className="text-sm text-gray-500">+2.46%</p>
          </div>
        </div>

        <div className="mt-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center">
                <div className="text-blue-600 font-medium">Portfolio</div>
                <div className="text-sm text-gray-500">View positions</div>
              </button>
              <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-center">
                <div className="text-green-600 font-medium">Markets</div>
                <div className="text-sm text-gray-500">Market data</div>
              </button>
              <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center">
                <div className="text-purple-600 font-medium">Risk</div>
                <div className="text-sm text-gray-500">Risk metrics</div>
              </button>
              <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-center">
                <div className="text-orange-600 font-medium">Modules</div>
                <div className="text-sm text-gray-500">Analysis tools</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}