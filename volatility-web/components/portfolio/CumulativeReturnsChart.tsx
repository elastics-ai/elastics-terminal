'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Generate sample data for cumulative returns
const generateData = () => {
  const data = []
  const startDate = new Date('2024-05-29')
  let cumReturn = 0
  
  for (let i = 0; i < 180; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    
    // Simulate cumulative returns with some volatility
    const dailyReturn = (Math.random() - 0.48) * 2
    cumReturn += dailyReturn
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: cumReturn,
      displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })
  }
  
  return data
}

export function CumulativeReturnsChart() {
  const data = generateData()
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Cumulative Returns (Equity Curves)</CardTitle>
          <Select defaultValue="6m">
            <SelectTrigger className="w-24 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1M</SelectItem>
              <SelectItem value="3m">3M</SelectItem>
              <SelectItem value="6m">6M</SelectItem>
              <SelectItem value="1y">1Y</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="displayDate" 
              tick={{ fontSize: 10 }}
              interval={30}
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
            />
            <Tooltip 
              formatter={(value: number) => `${value.toFixed(2)}%`}
              labelFormatter={(label) => label}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--chart-primary))" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}