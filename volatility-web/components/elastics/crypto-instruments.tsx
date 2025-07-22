import React from 'react';
import { TrendingUp } from 'lucide-react';

interface CryptoInstrument {
  id: string;
  name: string;
  type: string;
  percentage: string;
  trend: 'up' | 'down';
}

interface CryptoInstrumentsProps {
  instruments?: CryptoInstrument[];
}

const mockInstruments: CryptoInstrument[] = [
  { id: '1', name: 'Spot Crypto', type: 'BTC', percentage: '40%', trend: 'up' },
  { id: '2', name: 'Perpetual Futures', type: 'ETH', percentage: '30%', trend: 'up' },
  { id: '3', name: 'Futures', type: 'FUTURE', percentage: '20%', trend: 'down' },
];

export function CryptoInstruments({ instruments = mockInstruments }: CryptoInstrumentsProps) {
  return (
    <div className="elastics-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Crypto - Instrument Types</h3>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">X</span>
          </div>
          <span className="text-sm font-medium text-gray-600">X.com</span>
        </div>
      </div>

      <div className="space-y-4">
        {instruments.map((instrument) => (
          <div key={instrument.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                instrument.type === 'BTC' ? 'bg-orange-100' :
                instrument.type === 'ETH' ? 'bg-blue-100' :
                'bg-gray-100'
              }`}>
                <span className={`text-sm font-bold ${
                  instrument.type === 'BTC' ? 'text-orange-600' :
                  instrument.type === 'ETH' ? 'text-blue-600' :
                  'text-gray-600'
                }`}>
                  {instrument.type}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">{instrument.name}</h4>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-gray-900">{instrument.percentage}</span>
              <TrendingUp className={`w-4 h-4 ${
                instrument.trend === 'up' ? 'text-green-500' : 'text-red-500 rotate-180'
              }`} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-3">
          Volatility platform's <span className="font-medium">funding negative</span>, funding rates can be volatile, presenting opportunities.
        </p>
        <div className="text-xs text-gray-600">
          <span className="font-medium text-gray-900">US ZY</span> yield just broke above 5% again.
        </div>
      </div>
    </div>
  );
}