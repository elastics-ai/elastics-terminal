'use client'

import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

interface ModernAreaChartProps {
  title: string
  data: any[]
  dataKey: string
  xKey?: string
  color?: string
  height?: number
  showGrid?: boolean
  valueFormatter?: (value: any) => string
  gradient?: boolean
}

export function ModernAreaChart({
  title,
  data,
  dataKey,
  xKey = 'date',
  color = 'hsl(var(--chart-primary))',
  height = 300,
  showGrid = true,
  valueFormatter = (value) => value,
  gradient = true
}: ModernAreaChartProps) {
  const gradientId = `gradient-${dataKey}`

  return (
    <div className="dashboard-chart-container">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={data} 
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            {gradient && (
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
            )}
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                vertical={false}
              />
            )}
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => {
                if (value instanceof Date || !isNaN(Date.parse(value))) {
                  return format(new Date(value), 'yyyy-MM-dd')
                }
                return value
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={valueFormatter}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px'
              }}
              labelFormatter={(value) => {
                if (value instanceof Date || !isNaN(Date.parse(value))) {
                  return format(new Date(value), 'yyyy-MM-dd')
                }
                return value
              }}
              formatter={valueFormatter}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={gradient ? `url(#${gradientId})` : color}
              fillOpacity={gradient ? 1 : 0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}