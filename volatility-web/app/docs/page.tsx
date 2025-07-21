'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { FileText, Book, Code, ExternalLink } from 'lucide-react'

export default function DocsPage() {
  return (
    <AppLayout>
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="border-b border-border pb-4">
            <h1 className="text-3xl font-bold text-foreground">Documentation</h1>
            <p className="text-muted-foreground mt-2">
              Learn how to use the Volatility Terminal effectively
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="border border-border rounded-lg p-6 hover:border-primary transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <Book className="w-8 h-8 text-primary" />
                <h2 className="text-xl font-semibold">Getting Started</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Learn the basics of portfolio management, volatility monitoring, and trading signals.
              </p>
              <ul className="space-y-2 text-sm">
                <li>• Understanding volatility filters</li>
                <li>• Setting up your portfolio</li>
                <li>• Reading volatility surfaces</li>
                <li>• Using AI chat for insights</li>
              </ul>
            </div>

            <div className="border border-border rounded-lg p-6 hover:border-primary transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <Code className="w-8 h-8 text-primary" />
                <h2 className="text-xl font-semibold">API Reference</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Integrate with our WebSocket and REST APIs for automated trading.
              </p>
              <ul className="space-y-2 text-sm">
                <li>• WebSocket real-time data streams</li>
                <li>• REST API endpoints</li>
                <li>• Authentication methods</li>
                <li>• Rate limits and best practices</li>
              </ul>
            </div>

            <div className="border border-border rounded-lg p-6 hover:border-primary transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-8 h-8 text-primary" />
                <h2 className="text-xl font-semibold">Trading Strategies</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Advanced strategies for volatility trading and risk management.
              </p>
              <ul className="space-y-2 text-sm">
                <li>• Volatility arbitrage</li>
                <li>• Delta-neutral strategies</li>
                <li>• Options Greeks optimization</li>
                <li>• Risk management techniques</li>
              </ul>
            </div>

            <div className="border border-border rounded-lg p-6 hover:border-primary transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <ExternalLink className="w-8 h-8 text-primary" />
                <h2 className="text-xl font-semibold">Resources</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                External resources and community support for traders.
              </p>
              <ul className="space-y-2 text-sm">
                <li>• Community Discord</li>
                <li>• GitHub repository</li>
                <li>• Video tutorials</li>
                <li>• FAQ and troubleshooting</li>
              </ul>
            </div>
          </div>

          <div className="border border-border rounded-lg p-6 bg-muted/50">
            <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
            <p className="text-muted-foreground">
              If you can&apos;t find what you&apos;re looking for, try asking our AI assistant in the Chat section, 
              or reach out to our support team.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}