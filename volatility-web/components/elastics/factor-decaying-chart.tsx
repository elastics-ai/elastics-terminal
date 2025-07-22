'use client'

import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export function FactorDecayingChart() {
  const chartData = useMemo(() => {
    // Generate dates for x-axis
    const dates = []
    const startDate = new Date('2023-01-01')
    for (let i = 0; i < 365; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      dates.push(date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }))
    }

    // Generate factor data with realistic trends
    const generateFactorData = (baseValue: number, volatility: number, trend: number) => {
      let value = baseValue
      return dates.map((_, i) => {
        value += (Math.random() - 0.5) * volatility + trend
        value = Math.max(0, Math.min(100, value)) // Keep within 0-100%
        return value
      })
    }

    return {
      labels: dates.filter((_, i) => i % 30 === 0), // Show monthly labels
      datasets: [
        {
          label: 'Credit (BNN) Threshold',
          data: generateFactorData(55, 0.5, -0.01).filter((_, i) => i % 30 === 0),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: '+1',
          tension: 0.4,
        },
        {
          label: 'Max Daily Loss',
          data: generateFactorData(45, 0.8, -0.02).filter((_, i) => i % 30 === 0),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: '+1',
          tension: 0.4,
        },
        {
          label: 'Minimal Profit Factor',
          data: generateFactorData(30, 0.6, -0.015).filter((_, i) => i % 30 === 0),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: 'end',
          tension: 0.4,
        }
      ]
    }
  }, [])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 10
          }
        }
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 10
          },
          callback: function(value: any) {
            return value + '%'
          }
        }
      }
    }
  }

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="text-sm font-medium mb-4">Factor Decaying</div>
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}