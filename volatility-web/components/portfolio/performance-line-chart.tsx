'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface PerformanceData {
  date: string
  value: number
  benchmark?: number
}

interface PerformanceLineChartProps {
  data: {
    dates: string[]
    returns: number[]
    cumulative: number[]
  }
}

export const PerformanceLineChart: React.FC<PerformanceLineChartProps> = ({ data }) => {
  const chartData = data.dates.map((date, index) => ({
    date,
    returns: (data.returns[index] * 100).toFixed(2),
    cumulative: (data.cumulative[index] * 100 - 100).toFixed(2),
    benchmark: ((1.05 ** (index + 1) - 1) * 100).toFixed(2) // 5% monthly benchmark
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-medium text-sm">{label}</p>
          {payload.map((entry: any) => (
            <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Performance Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cumulative" className="w-full">
          <TabsList>
            <TabsTrigger value="cumulative">Cumulative Returns</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Returns</TabsTrigger>
          </TabsList>
          
          <TabsContent value="cumulative" className="mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" />
                <YAxis 
                  tickFormatter={(value) => `${value}%`}
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#6366f1"
                  strokeWidth={2}
                  name="Portfolio"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Benchmark (5%)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="monthly" className="mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" />
                <YAxis 
                  tickFormatter={(value) => `${value}%`}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="returns"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Monthly Returns"
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}