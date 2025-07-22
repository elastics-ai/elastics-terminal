'use client'

import { AppLayout } from "@/components/layout/app-layout"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  TrendingUp, 
  TrendingDown, 
  MoreHorizontal,
  Download,
  Filter,
  Plus
} from "lucide-react"
import { useState } from "react"
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Area, AreaChart, Cell, PieChart, Pie
} from 'recharts'

// Risk metrics data for heatmap
const riskData = [
  { name: 'So Risk Calls', values: [20, 15, 35, 40, 25, 45, 30, 20, 15] },
  { name: 'So Risk Puts', values: [15, 25, 30, 35, 40, 30, 25, 35, 20] },
  { name: 'Rates', values: [10, 20, 25, 30, 35, 25, 20, 30, 25] },
  { name: 'Exotics', values: [30, 25, 20, 25, 30, 35, 40, 35, 30] },
  { name: 'Aggregate', values: [25, 21, 28, 33, 32, 34, 29, 30, 23] }
]

const timeColumns = ['06h', '81h', 'Monday', '30D', '90D', 'y1', 'Thursday', 'Friday', '5Y']

// Factor Returns data
const factorReturnsData = Array.from({length: 100}, (_, i) => ({
  date: `2023-${String(Math.floor(i/8) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
  value: Math.sin(i * 0.1) * 20 + Math.random() * 10 + 50,
  lower: Math.sin(i * 0.1) * 20 + Math.random() * 5 + 40,
  upper: Math.sin(i * 0.1) * 20 + Math.random() * 5 + 60
}))

// Aggregate Kurtosis data
const kurtosisData = [
  { name: 'Daily', value: 45000 },
  { name: 'Options', value: 32000 },
  { name: 'Delta', value: 28000 },
  { name: 'Theta', value: 24000 }
]

// Statistics table data
const statisticsData = [
  { metric: 'BTC Momentum (ln)', active: 86.8, health: 88.68, totalReturns: 12.64, exposure: '$300k', volatility: '52.5%', voladj: 11.88, riskRanking: 'AA+', beta: 0.4, add: true },
  { metric: 'Prediction Market Vol', active: 7.8, health: 52.34, totalReturns: 822.44, exposure: '8.1%', volatility: '84.20%', voladj: '-9.8%', riskRanking: 'B', beta: 0.54, add: false },
  { metric: 'Macro Global Predictor', active: 100.0, health: 85.72, totalReturns: 2.24, exposure: '9.9%', volatility: '86.51%', voladj: '84.6%', riskRanking: 'CCC', beta: 0.22, add: true },
  { metric: 'Ethereum Event Tax', active: 86.8, health: 11.5, totalReturns: 534.01, exposure: '5.2%', volatility: '41.100', voladj: '3.4%', riskRanking: 'BB-', beta: 0.65, add: false },
  { metric: 'Crypto Sentiment 15', active: 100.0, health: 64.44, totalReturns: 939.44, exposure: '0.8%', volatility: '67.500', voladj: '100%', riskRanking: 'BB-', beta: 0.89, add: false },
  { metric: 'Volatility Mean (dip)', active: 100.0, health: 66.2, totalReturns: -3.83, exposure: '10.2%', volatility: '24.04%', voladj: '-22.2%', riskRanking: 'B+', beta: 1.26, add: true }
]

// Heatmap color function
function getHeatmapColor(value: number): string {
  if (value < 10) return 'bg-blue-100'
  if (value < 20) return 'bg-blue-200'
  if (value < 30) return 'bg-blue-300'
  if (value < 40) return 'bg-blue-400'
  return 'bg-blue-500'
}

export default function ElasticsPage() {
  const [selectedStrategy, setSelectedStrategy] = useState('Factor Returns')
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('06:11:43 UTC')

  return (
    <AppLayout>
      <div className="flex-1 p-6 overflow-y-auto bg-background">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Elastics</h1>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-orange-100 text-orange-600">
                Critical: 3
              </Badge>
              <Badge variant="secondary" className="bg-amber-100 text-amber-600">
                Warning: 2
              </Badge>
              <Badge variant="secondary" className="bg-blue-100 text-blue-600">
                Info: 6
              </Badge>
              <span className="text-sm text-muted-foreground">09:11:43 UTC</span>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Risk Section - Left Column */}
            <div className="col-span-3 space-y-6">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Risk</h3>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Risk Breakdown */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Risk Breakdown</span>
                    <Select defaultValue="global">
                      <SelectTrigger className="w-24 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global State Sample</SelectItem>
                        <SelectItem value="local">Local</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Risk Heatmap */}
                <div className="space-y-2">
                  <div className="grid grid-cols-10 gap-0.5 text-xs">
                    <div></div>
                    {timeColumns.map((time) => (
                      <div key={time} className="text-center text-muted-foreground">
                        {time}
                      </div>
                    ))}
                  </div>
                  {riskData.map((row, rowIndex) => (
                    <div key={row.name} className="grid grid-cols-10 gap-0.5">
                      <div className="text-xs text-right pr-2 py-1">{row.name}</div>
                      {row.values.map((value, colIndex) => (
                        <div
                          key={colIndex}
                          className={`h-6 rounded-sm ${getHeatmapColor(value)}`}
                          title={`${value}%`}
                        />
                      ))}
                    </div>
                  ))}
                </div>

                {/* Options/Greeks */}
                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Optiors/Greeks</span>
                    <span className="text-xs text-muted-foreground">ACTIVE</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>BTC Management Delta: <span className="font-medium">Yes</span></div>
                    <div>S1: <span className="font-medium">1.6</span></div>
                    <div>Prediction Market Vol: <span className="font-medium">Yes</span></div>
                    <div>S1: <span className="font-medium">7.8</span></div>
                    <div>Mean Trading Bots: <span className="font-medium">Yes</span></div>
                    <div>S1: <span className="font-medium">10.2</span></div>
                    <div>Ethereum Event Tax: <span className="font-medium">Yes</span></div>
                    <div>S1: <span className="font-medium">6.5</span></div>
                    <div>Crypto Sentiment 15: <span className="font-medium">Yes</span></div>
                    <div>S1: <span className="font-medium">11.5</span></div>
                  </div>
                </div>
              </Card>

              {/* Aggregate Kurtosis */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Aggregate Kurtosis (USD Notional)</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kurtosisData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Factor Returns - Middle Column */}
            <div className="col-span-5">
              <Card className="p-4 h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <h3 className="font-semibold">Factor Returns</h3>
                    <span className="text-sm text-muted-foreground">USD 100.71 02.56%</span>
                    <Badge className="bg-green-100 text-green-700">Stacked +</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="1D">
                      <SelectTrigger className="w-16 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1D">1D</SelectItem>
                        <SelectItem value="1W">1W</SelectItem>
                        <SelectItem value="1M">1M</SelectItem>
                        <SelectItem value="1Y">1Y</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={factorReturnsData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorBounds" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" hide />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="upper" stroke="none" fill="url(#colorBounds)" />
                      <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" />
                      <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cool RFV6 Threshold</span>
                    <div className="font-semibold">86%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max Daily Draw</span>
                    <div className="font-semibold text-red-600">-6.09%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max Sharpe</span>
                    <div className="font-semibold text-green-600">8.45%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max Drawdowen</span>
                    <div className="font-semibold text-red-600">-1.8%</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Additional Metrics */}
            <div className="col-span-4 space-y-6">
              {/* Top Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Max Realized Gain (Today)</span>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">8.09%</div>
                  <div className="text-xs text-muted-foreground">CryptoQuant</div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Realized Loss Factor</span>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="text-2xl font-bold text-red-600">-1.8%</div>
                  <div className="text-xs text-muted-foreground">Ethereum Event Tax</div>
                </Card>
              </div>

              {/* Additional Charts */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Max Strategy</h3>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={factorReturnsData.slice(0, 30)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-4">Max Average</h3>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={factorReturnsData.slice(0, 30)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip />
                      <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>

          {/* Statistics Table */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold">Statistics</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">ACTIVE</Button>
                  <Button variant="outline" size="sm">HEALTH</Button>
                  <Button variant="outline" size="sm">TOTAL RETURNS</Button>
                  <Button variant="outline" size="sm">EXPOSURE</Button>
                  <Button variant="outline" size="sm">VOLATILITY</Button>
                  <Button variant="outline" size="sm">VOL-ADJ</Button>
                  <Button variant="outline" size="sm">RISK RANKING</Button>
                  <Button variant="outline" size="sm">BETA</Button>
                  <Button variant="outline" size="sm">ALPHA</Button>
                  <Button variant="outline" size="sm">RENC</Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm">Strategy</th>
                    <th className="text-center py-3 px-4 font-medium text-sm">Active</th>
                    <th className="text-center py-3 px-4 font-medium text-sm">Health</th>
                    <th className="text-center py-3 px-4 font-medium text-sm">Total Returns</th>
                    <th className="text-center py-3 px-4 font-medium text-sm">Exposure</th>
                    <th className="text-center py-3 px-4 font-medium text-sm">Volatility</th>
                    <th className="text-center py-3 px-4 font-medium text-sm">Vol-Adj</th>
                    <th className="text-center py-3 px-4 font-medium text-sm">Risk Ranking</th>
                    <th className="text-center py-3 px-4 font-medium text-sm">Beta</th>
                    <th className="text-center py-3 px-4 font-medium text-sm">Add</th>
                  </tr>
                </thead>
                <tbody>
                  {statisticsData.map((row, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">{row.metric}</td>
                      <td className="py-3 px-4 text-sm text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.active > 90 ? 'bg-green-100 text-green-700' : 
                          row.active > 50 ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-red-100 text-red-700'
                        }`}>
                          {row.active}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-center">{row.health}%</td>
                      <td className={`py-3 px-4 text-sm text-center font-medium ${
                        row.totalReturns >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {row.totalReturns >= 0 ? '+' : ''}{row.totalReturns}%
                      </td>
                      <td className="py-3 px-4 text-sm text-center">{row.exposure}</td>
                      <td className="py-3 px-4 text-sm text-center">{row.volatility}</td>
                      <td className={`py-3 px-4 text-sm text-center ${
                        typeof row.voladj === 'string' && row.voladj.includes('-') ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {row.voladj}
                      </td>
                      <td className="py-3 px-4 text-sm text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          row.riskRanking.startsWith('A') ? 'bg-green-100 text-green-700' : 
                          row.riskRanking.startsWith('B') ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-red-100 text-red-700'
                        }`}>
                          {row.riskRanking}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-center">{row.beta}</td>
                      <td className="py-3 px-4 text-sm text-center">
                        <Button 
                          variant={row.add ? "default" : "outline"} 
                          size="sm"
                          className="h-6 px-2"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Suggested sentiment to reduce portfolio risk by 20%
              </p>
              <Button variant="link" className="text-primary">
                Custom Health Model
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}