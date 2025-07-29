'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Generate sample data for trading volume
const generateData = () => {
  const data = []
  const startDate = new Date('2024-05-29')
  
  for (let i = 0; i < 180; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    
    // Simulate trading volume with some patterns
    const baseVolume = 1000000
    const randomFactor = 0.2 + Math.random() * 1.8
    const volume = baseVolume * randomFactor
    
    data.push({
      date: date.toISOString().split('T')[0],
      volume: Math.floor(volume),
      displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })
  }
  
  return data
}

export function TradingVolumeChart() {
  const data = generateData()
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Daily Trading Volume by Strategy</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="displayDate" 
              tick={{ fontSize: 10 }}
              interval={30}
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip 
              formatter={(value: number) => `$${(value / 1000000).toFixed(2)}M`}
              labelFormatter={(label) => label}
            />
            <Bar 
              dataKey="volume" 
              fill="hsl(var(--chart-primary))"
              opacity={0.8}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}