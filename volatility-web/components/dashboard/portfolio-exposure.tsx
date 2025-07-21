'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const data = [
  { name: 'Crypto', value: 50, color: '#5B8DEF' },
  { name: 'Equities', value: 20, color: '#36B37E' },
  { name: 'Fixed Income', value: 15, color: '#FFAB00' },
  { name: 'Derivatives', value: 15, color: '#FF5630' },
  { name: 'Pred. Markets', value: 15, color: '#6554C0' },
  { name: 'Commodities', value: 10, color: '#00B8D9' },
  { name: 'Cash', value: 5, color: '#97A0AF' },
]

export function PortfolioExposure() {
  const RADIAN = Math.PI / 180
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-md p-2">
          <p className="text-xs">
            {`${payload[0].name}: ${payload[0].value}%`}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="chart-container h-full">
      <h3 className="text-base font-semibold mb-4">Portfolio Exposure</h3>
      
      <div className="h-[250px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              innerRadius={60}
              outerRadius={100}
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
            <p className="text-base font-semibold">Crypto</p>
            <p className="text-xl font-bold">50%</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground">{item.name}</span>
            </div>
            <span className="text-xs font-medium">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}