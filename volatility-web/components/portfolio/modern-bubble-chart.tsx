'use client'

import { Scatter, ScatterChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface BubbleData {
  x: number
  y: number
  z: number
  name: string
  color?: string
}

interface ModernBubbleChartProps {
  title: string
  data: BubbleData[]
  xLabel?: string
  yLabel?: string
  height?: number
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-border">
        <p className="font-medium text-sm mb-1">{data.name}</p>
        <p className="text-xs text-muted-foreground">X: {data.x}</p>
        <p className="text-xs text-muted-foreground">Y: {data.y}</p>
        <p className="text-xs text-muted-foreground">Size: {data.z}</p>
      </div>
    )
  }
  return null
}

export function ModernBubbleChart({
  title,
  data,
  xLabel = 'X Axis',
  yLabel = 'Y Axis',
  height = 400
}: ModernBubbleChartProps) {
  // Calculate domain ranges with padding
  const xMin = Math.min(...data.map(d => d.x))
  const xMax = Math.max(...data.map(d => d.x))
  const yMin = Math.min(...data.map(d => d.y))
  const yMax = Math.max(...data.map(d => d.y))
  
  const xPadding = (xMax - xMin) * 0.1
  const yPadding = (yMax - yMin) * 0.1

  return (
    <div className="dashboard-chart-container">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              dataKey="x"
              name={xLabel}
              domain={[xMin - xPadding, xMax + xPadding]}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              label={{ value: xLabel, position: 'insideBottom', offset: -10, fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yLabel}
              domain={[yMin - yPadding, yMax + yPadding]}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Assets" data={data} fill="hsl(var(--chart-primary))">
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || `hsl(var(--chart-${(index % 5) + 1}))`}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color || `hsl(var(--chart-${(index % 5) + 1}))` }}
            />
            <span className="text-xs text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}