'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface OptionData {
  strike: number
  callBid: number
  callAsk: number
  callLast: number
  callVolume: number
  callOI: number
  putBid: number
  putAsk: number
  putLast: number
  putVolume: number
  putOI: number
}

const generateOptionData = (): OptionData[] => {
  const strikes = [0.57, 0.58, 0.59, 0.60, 0.61, 0.62, 0.63, 0.64, 0.65]
  return strikes.map(strike => ({
    strike,
    callBid: Number((Math.random() * 0.1).toFixed(4)),
    callAsk: Number((Math.random() * 0.1 + 0.01).toFixed(4)),
    callLast: Number((Math.random() * 0.1).toFixed(4)),
    callVolume: Math.floor(Math.random() * 1000),
    callOI: Math.floor(Math.random() * 5000),
    putBid: Number((Math.random() * 0.05).toFixed(4)),
    putAsk: Number((Math.random() * 0.05 + 0.01).toFixed(4)),
    putLast: Number((Math.random() * 0.05).toFixed(4)),
    putVolume: Math.floor(Math.random() * 500),
    putOI: Math.floor(Math.random() * 3000),
  }))
}

export function OptionChainTable() {
  const [data] = useState<OptionData[]>(generateOptionData())
  const [expandedStrike, setExpandedStrike] = useState<number | null>(null)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th colSpan={6} className="text-center py-2 font-medium text-gray-700 bg-gray-50">
              CALLS
            </th>
            <th className="py-2 px-4 font-medium text-gray-900 bg-gray-100">
              Strike
            </th>
            <th colSpan={6} className="text-center py-2 font-medium text-gray-700 bg-gray-50">
              PUTS
            </th>
          </tr>
          <tr className="text-xs text-gray-600 border-b">
            <th className="py-2 px-2 text-right font-normal">Bid</th>
            <th className="py-2 px-2 text-right font-normal">Ask</th>
            <th className="py-2 px-2 text-right font-normal">Last</th>
            <th className="py-2 px-2 text-right font-normal">Volume</th>
            <th className="py-2 px-2 text-right font-normal">OI</th>
            <th className="py-2 px-2"></th>
            <th className="py-2 px-4 text-center font-normal bg-gray-100"></th>
            <th className="py-2 px-2"></th>
            <th className="py-2 px-2 text-right font-normal">Bid</th>
            <th className="py-2 px-2 text-right font-normal">Ask</th>
            <th className="py-2 px-2 text-right font-normal">Last</th>
            <th className="py-2 px-2 text-right font-normal">Volume</th>
            <th className="py-2 px-2 text-right font-normal">OI</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const isExpanded = expandedStrike === row.strike
            const isATM = row.strike === 0.60
            
            return (
              <>
                <tr 
                  key={row.strike}
                  className={cn(
                    "border-b hover:bg-gray-50 transition-colors cursor-pointer",
                    isATM && "bg-yellow-50"
                  )}
                  onClick={() => setExpandedStrike(isExpanded ? null : row.strike)}
                >
                  {/* Calls */}
                  <td className="py-2 px-2 text-right text-green-600">{row.callBid.toFixed(4)}</td>
                  <td className="py-2 px-2 text-right text-red-600">{row.callAsk.toFixed(4)}</td>
                  <td className="py-2 px-2 text-right">{row.callLast.toFixed(4)}</td>
                  <td className="py-2 px-2 text-right text-gray-600">{row.callVolume}</td>
                  <td className="py-2 px-2 text-right text-gray-600">{row.callOI.toLocaleString()}</td>
                  <td className="py-2 px-2">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </td>
                  
                  {/* Strike */}
                  <td className={cn(
                    "py-2 px-4 text-center font-medium bg-gray-100",
                    isATM && "bg-yellow-100"
                  )}>
                    {row.strike.toFixed(2)}
                  </td>
                  
                  {/* Puts */}
                  <td className="py-2 px-2">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </td>
                  <td className="py-2 px-2 text-right text-green-600">{row.putBid.toFixed(4)}</td>
                  <td className="py-2 px-2 text-right text-red-600">{row.putAsk.toFixed(4)}</td>
                  <td className="py-2 px-2 text-right">{row.putLast.toFixed(4)}</td>
                  <td className="py-2 px-2 text-right text-gray-600">{row.putVolume}</td>
                  <td className="py-2 px-2 text-right text-gray-600">{row.putOI.toLocaleString()}</td>
                </tr>
                
                {/* Expanded details row */}
                {isExpanded && (
                  <tr className="bg-gray-50">
                    <td colSpan={13} className="p-4">
                      <div className="grid grid-cols-2 gap-6 text-sm">
                        <div>
                          <h4 className="font-medium mb-2">Call Option Details</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-600">IV:</span> {(Math.random() * 0.3 + 0.2).toFixed(2)}%
                            </div>
                            <div>
                              <span className="text-gray-600">Delta:</span> {(Math.random() * 0.5 + 0.3).toFixed(3)}
                            </div>
                            <div>
                              <span className="text-gray-600">Gamma:</span> {(Math.random() * 0.02).toFixed(4)}
                            </div>
                            <div>
                              <span className="text-gray-600">Theta:</span> -{(Math.random() * 0.01).toFixed(4)}
                            </div>
                            <div>
                              <span className="text-gray-600">Vega:</span> {(Math.random() * 0.05).toFixed(4)}
                            </div>
                            <div>
                              <span className="text-gray-600">Rho:</span> {(Math.random() * 0.01).toFixed(4)}
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Put Option Details</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-600">IV:</span> {(Math.random() * 0.3 + 0.2).toFixed(2)}%
                            </div>
                            <div>
                              <span className="text-gray-600">Delta:</span> -{(Math.random() * 0.5 + 0.3).toFixed(3)}
                            </div>
                            <div>
                              <span className="text-gray-600">Gamma:</span> {(Math.random() * 0.02).toFixed(4)}
                            </div>
                            <div>
                              <span className="text-gray-600">Theta:</span> -{(Math.random() * 0.01).toFixed(4)}
                            </div>
                            <div>
                              <span className="text-gray-600">Vega:</span> {(Math.random() * 0.05).toFixed(4)}
                            </div>
                            <div>
                              <span className="text-gray-600">Rho:</span> -{(Math.random() * 0.01).toFixed(4)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
      
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="text-gray-600">
          <span className="font-medium">Total Volume:</span> {data.reduce((sum, row) => sum + row.callVolume + row.putVolume, 0).toLocaleString()}
        </div>
        <div className="text-gray-600">
          <span className="font-medium">Total OI:</span> {data.reduce((sum, row) => sum + row.callOI + row.putOI, 0).toLocaleString()}
        </div>
      </div>
    </div>
  )
}