import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AlphaBetaChartProps {
  data?: Array<{
    name: string;
    alpha: number;
    beta: number;
    size: number;
    color: string;
  }>;
}

const mockData = [
  { name: 'Alpha', alpha: 0.15, beta: 0.8, size: 40, color: '#10b981' },
  { name: 'Beta', alpha: 0.45, beta: 1.2, size: 30, color: '#3b82f6' },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-medium text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600">Alpha: {data.alpha}</p>
        <p className="text-sm text-gray-600">Beta: {data.beta}</p>
      </div>
    );
  }
  return null;
};

export function AlphaBetaChart({ data = mockData }: AlphaBetaChartProps) {
  return (
    <div className="elastics-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Alpha/Beta</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600">Alpha</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-600">Beta</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              type="number"
              dataKey="alpha"
              name="Alpha"
              domain={[0, 0.6]}
              ticks={[0, 0.2, 0.4, 0.6]}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              label={{ value: 'Alpha', position: 'insideBottom', offset: -30, style: { fontSize: 12, fill: '#6b7280' } }}
            />
            <YAxis
              type="number"
              dataKey="beta"
              name="Beta"
              domain={[0, 1.6]}
              ticks={[0, 0.4, 0.8, 1.2, 1.6]}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              label={{ value: 'Beta', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Assets" data={data} fill="#8884d8">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex justify-between text-sm">
        <div>
          <span className="text-gray-500">Sept 10</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">20%</span>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="font-medium text-gray-900">Alpha</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">40%</span>
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="font-medium text-gray-900">Beta</span>
          </div>
        </div>
      </div>
    </div>
  );
}