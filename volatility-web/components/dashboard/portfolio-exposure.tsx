'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const data = [
  { name: 'Crypto', value: 50, color: 'hsl(var(--chart-primary))' },
  { name: 'Equities', value: 20, color: '#9ca3af' },
  { name: 'Fixed Income', value: 15, color: '#cbd5e1' },
  { name: 'Derivatives', value: 15, color: '#a1a1aa' },
  { name: 'Pred. Markets', value: 15, color: '#a5b4fc' },
  { name: 'Commodities', value: 10, color: '#d4d4d8' },
  { name: 'Cash', value: 5, color: '#e5e7eb' },
]

export function PortfolioExposure() {
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, value
  }: any) => {
    if (value < 10) return null // Don't show labels for small slices
    
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize="14"
        fontWeight="600"
      >
        {`${value}%`}
      </text>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-border rounded-md p-3 shadow-lg">
          <p className="text-sm font-medium">{payload[0].name}</p>
          <p className="text-lg font-semibold">{payload[0].value}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-border h-full">
      <h3 className="text-lg font-semibold mb-6">Portfolio Exposure</h3>
      
      <div className="flex items-center gap-8">
        {/* Pie Chart */}
        <div className="h-[240px] w-[240px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                innerRadius={60}
                outerRadius={110}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Crypto</p>
              <p className="text-2xl font-bold">50%</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1">
          <div className="space-y-3">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <span className="text-sm font-semibold">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}