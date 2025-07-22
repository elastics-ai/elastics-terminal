'use client'

import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

interface ModernLineChartProps {
  title: string
  data: any[]
  dataKey: string
  xKey?: string
  color?: string
  height?: number
  showGrid?: boolean
  valueFormatter?: (value: any) => string
}

export function ModernLineChart({
  title,
  data,
  dataKey,
  xKey = 'date',
  color = 'hsl(var(--chart-primary))',
  height = 300,
  showGrid = true,
  valueFormatter = (value) => value
}: ModernLineChartProps) {
  return (
    <div className="dashboard-chart-container">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={data} 
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
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
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}