'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { DemoChat } from '@/components/demo/DemoChat'

export default function DemoChatPage() {
  return (
    <AppLayout>
      <div className="p-6 bg-background min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Elastics AI Assistant Demo</h1>
            <p className="text-gray-600">
              Experience how Elastics' modular architecture powers intelligent prediction market analysis
            </p>
          </div>
          
          <DemoChat />
          
          <div className="mt-8 max-w-4xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">About This Demo</h4>
              <p className="text-sm text-blue-800">
                This demonstration showcases how Elastics leverages its modular database architecture to provide 
                real-time analysis across multiple prediction market venues. Each module shown represents a 
                pluggable component that can be customized or replaced to adapt to different trading strategies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}