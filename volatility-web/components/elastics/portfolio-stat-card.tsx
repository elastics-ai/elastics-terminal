import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

interface PortfolioStatCardProps {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  isPercentage?: boolean;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  badgeText?: string;
  badgeColor?: 'success' | 'warning' | 'danger';
}

export function PortfolioStatCard({
  title,
  value,
  change,
  changeLabel,
  isPercentage = false,
  icon,
  trend = 'neutral',
  badgeText,
  badgeColor = 'success'
}: PortfolioStatCardProps) {
  const isPositive = change >= 0;
  const trendIcon = isPositive ? (
    <ArrowUpRight className="w-4 h-4" />
  ) : (
    <ArrowDownRight className="w-4 h-4" />
  );

  const getBadgeColorClass = () => {
    switch (badgeColor) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-orange-100 text-orange-800';
      case 'danger':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="elastics-stat-card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      
      <div className="flex items-baseline justify-between">
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        {badgeText && (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBadgeColorClass()}`}>
            {badgeText}
          </span>
        )}
      </div>
      
      <div className="mt-2 flex items-center">
        <div className={`flex items-center text-sm font-medium ${
          isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          {trendIcon}
          <span>{Math.abs(change)}{isPercentage ? '%' : ''}</span>
        </div>
        <span className="ml-2 text-sm text-gray-500">{changeLabel}</span>
      </div>
    </div>
  );
}