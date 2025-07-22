import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar } from 'lucide-react';

interface PerformanceBreakdownProps {
  data?: Array<{
    date: string;
    portfolio: number;
    benchmark: number;
  }>;
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
}

const mockData = [
  { date: 'Apr 2023', portfolio: 30, benchmark: 20 },
  { date: 'May 2023', portfolio: 20, benchmark: 15 },
  { date: 'Jun 2023', portfolio: 25, benchmark: 22 },
  { date: 'Jul 2023', portfolio: 28, benchmark: 25 },
  { date: 'Aug 2023', portfolio: 35, benchmark: 30 },
  { date: 'Sep 2023', portfolio: 38, benchmark: 32 },
  { date: 'Oct 2023', portfolio: 42, benchmark: 35 },
  { date: 'Nov 2023', portfolio: 45, benchmark: 38 },
  { date: 'Dec 2023', portfolio: 48, benchmark: 40 },
  { date: 'Jan 2024', portfolio: 52, benchmark: 42 },
  { date: 'Feb 2024', portfolio: 55, benchmark: 44 },
  { date: 'Mar 2024', portfolio: 58, benchmark: 46 },
];

export function PerformanceBreakdown({
  data = mockData,
  timeRange = '1Y',
  onTimeRangeChange
}: PerformanceBreakdownProps) {
  const [activeTab, setActiveTab] = useState('1Y');

  const timeRanges = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

  const handleTimeRangeClick = (range: string) => {
    setActiveTab(range);
    if (onTimeRangeChange) {
      onTimeRangeChange(range);
    }
  };

  return (
    <div className="elastics-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Performance Breakdown</h3>
          <p className="text-sm text-gray-500 mt-1">Cumulative Returns</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeClick(range)}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  activeTab === range
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="benchmarkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: any) => [`${value}%`, '']}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="line"
              wrapperStyle={{
                paddingBottom: '20px'
              }}
            />
            <Area
              type="monotone"
              dataKey="portfolio"
              name="Portfolio"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#portfolioGradient)"
            />
            <Area
              type="monotone"
              dataKey="benchmark"
              name="Benchmark"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#benchmarkGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-gray-600">Portfolio</span>
          <span className="font-semibold text-gray-900">+72.4%</span>
          <span className="text-xs text-gray-500">Benchmark: 0.37%</span>
        </div>
      </div>
    </div>
  );
}