"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Lightbulb, TrendingUp, Shield, Target } from "lucide-react"

interface AISuggestion {
  id: string
  type: "optimization" | "risk" | "opportunity" | "rebalance"
  title: string
  description: string
  confidence: number
  impact: "high" | "medium" | "low"
  action?: string
}

const mockSuggestions: AISuggestion[] = [
  {
    id: "1",
    type: "risk",
    title: "High Delta Concentration Detected",
    description: "Your portfolio has 85% positive delta exposure. Consider adding put spreads to reduce directional risk.",
    confidence: 92,
    impact: "high",
    action: "Reduce Delta"
  },
  {
    id: "2", 
    type: "opportunity",
    title: "Volatility Surface Arbitrage",
    description: "ETH 30-day implied volatility is trading 15% below realized volatility. Consider long vol strategies.",
    confidence: 78,
    impact: "medium",
    action: "Long Volatility"
  },
  {
    id: "3",
    type: "optimization",
    title: "Gamma Hedging Optimization",
    description: "Current gamma exposure can be hedged more efficiently with fewer trades using cross-asset positions.",
    confidence: 65,
    impact: "medium",
    action: "Optimize Hedging"
  },
  {
    id: "4",
    type: "rebalance",
    title: "Expiry Concentration Risk",
    description: "40% of your options expire within 7 days. Consider rolling positions to spread expiry risk.",
    confidence: 88,
    impact: "high",
    action: "Roll Positions"
  }
]

const getTypeIcon = (type: AISuggestion["type"]) => {
  switch (type) {
    case "optimization":
      return <Target className="h-4 w-4" />
    case "risk":
      return <Shield className="h-4 w-4" />
    case "opportunity":
      return <TrendingUp className="h-4 w-4" />
    case "rebalance":
      return <Lightbulb className="h-4 w-4" />
  }
}

const getTypeColor = (type: AISuggestion["type"]) => {
  switch (type) {
    case "optimization":
      return "bg-blue-100 text-blue-800"
    case "risk":
      return "bg-red-100 text-red-800"
    case "opportunity":
      return "bg-green-100 text-green-800"
    case "rebalance":
      return "bg-yellow-100 text-yellow-800"
  }
}

const getImpactColor = (impact: AISuggestion["impact"]) => {
  switch (impact) {
    case "high":
      return "bg-red-100 text-red-800"
    case "medium":
      return "bg-yellow-100 text-yellow-800"
    case "low":
      return "bg-green-100 text-green-800"
  }
}

export function AISuggestions() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">AI Suggestions</h3>
        <Badge variant="secondary" className="ml-auto">
          {mockSuggestions.length} Active
        </Badge>
      </div>

      <div className="space-y-4">
        {mockSuggestions.map((suggestion) => (
          <div key={suggestion.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {getTypeIcon(suggestion.type)}
                <h4 className="font-medium">{suggestion.title}</h4>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getTypeColor(suggestion.type)}>
                  {suggestion.type}
                </Badge>
                <Badge className={getImpactColor(suggestion.impact)}>
                  {suggestion.impact}
                </Badge>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {suggestion.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Confidence: {suggestion.confidence}%
              </div>
              {suggestion.action && (
                <Button size="sm" variant="outline">
                  {suggestion.action}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t">
        <Button variant="ghost" className="w-full">
          View All Suggestions
        </Button>
      </div>
    </Card>
  )
}