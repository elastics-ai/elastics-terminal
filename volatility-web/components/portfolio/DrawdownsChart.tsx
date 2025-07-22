'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Generate sample drawdown data
const generateData = () => {
  const data = []
  const startDate = new Date('2024-05-29')
  let cumReturn = 0
  let peak = 0
  
  for (let i = 0; i < 180; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    
    // Simulate cumulative returns
    const dailyReturn = (Math.random() - 0.48) * 2
    cumReturn += dailyReturn
    
    // Update peak
    if (cumReturn > peak) {
      peak = cumReturn
    }
    
    // Calculate drawdown
    const drawdown = peak > 0 ? ((cumReturn - peak) / peak) * 100 : 0
    
    data.push({
      date: date.toISOString().split('T')[0],
      drawdown: Math.min(0, drawdown), // Ensure drawdown is negative
      displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })
  }
  
  return data
}

export function DrawdownsChart() {
  const data = generateData()
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Drawdowns</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="displayDate" 
              tick={{ fontSize: 10 }}
              interval={30}
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
            />
            <Tooltip 
              formatter={(value: number) => `${value.toFixed(2)}%`}
              labelFormatter={(label) => label}
            />
            <Area 
              type="monotone" 
              dataKey="drawdown" 
              stroke="hsl(var(--chart-primary))"
              fill="hsl(var(--chart-primary))"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}