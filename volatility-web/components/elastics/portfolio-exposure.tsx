import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PortfolioExposureProps {
  data?: Array<{
    name: string;
    value: number;
    percentage: number;
    color: string;
  }>;
}

const mockData = [
  { name: 'Crypto', value: 45, percentage: 20, color: '#a78bfa' },
  { name: 'Fixed Income', value: 35, percentage: 15, color: '#60a5fa' },
  { name: 'Equities', value: 30, percentage: 15, color: '#34d399' },
  { name: 'FX & Markets', value: 30, percentage: 15, color: '#4ade80' },
  { name: 'Commodities', value: 25, percentage: 10, color: '#94a3b8' },
  { name: 'Cash', value: 15, percentage: 5, color: '#cbd5e1' },
];

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-sm font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-medium text-gray-900">{payload[0].name}</p>
        <p className="text-sm text-gray-600">
          Value: ${payload[0].value}M ({payload[0].payload.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  return (
    <ul className="space-y-2">
      {payload.map((entry: any, index: number) => (
        <li key={`item-${index}`} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">{entry.value}</span>
          </div>
          <span className="text-sm font-medium text-gray-900">
            {entry.payload.percentage}%
          </span>
        </li>
      ))}
    </ul>
  );
};

export function PortfolioExposure({ data = mockData }: PortfolioExposureProps) {
  return (
    <div className="elastics-card">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Portfolio Exposure</h3>
      
      <div className="flex items-center gap-8">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
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
        </div>
        
        <div className="w-48">
          <CustomLegend payload={data.map(item => ({
            value: item.name,
            color: item.color,
            payload: item
          }))} />
        </div>
      </div>
    </div>
  );
}