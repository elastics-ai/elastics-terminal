import { NextResponse } from 'next/server'

export async function GET() {
  // Mock data sources for now
  const dataSources = [
    {
      id: '1',
      name: 'US Stock Market Data',
      publisher: 'NYSE',
      region: 'Americas',
      version: '2.1.0',
      status: 'active',
      lastUpdated: new Date().toISOString(),
      schema: 'OHLCV',
      availableHistory: '10 years',
      tags: ['equities', 'realtime', 'nyse']
    },
    {
      id: '2',
      name: 'Crypto Options Data',
      publisher: 'Deribit',
      region: 'Global',
      version: '1.5.2',
      status: 'active',
      lastUpdated: new Date().toISOString(),
      schema: 'Options',
      availableHistory: '3 years',
      tags: ['crypto', 'options', 'derivatives']
    },
    {
      id: '3',
      name: 'Prediction Market Data',
      publisher: 'Polymarket',
      region: 'Global',
      version: '3.0.1',
      status: 'active',
      lastUpdated: new Date().toISOString(),
      schema: 'Events',
      availableHistory: '2 years',
      tags: ['prediction', 'events', 'binary']
    },
    {
      id: '4',
      name: 'Election Markets',
      publisher: 'Kalshi',
      region: 'US',
      version: '1.2.0',
      status: 'active',
      lastUpdated: new Date().toISOString(),
      schema: 'Events',
      availableHistory: '1 year',
      tags: ['elections', 'events', 'regulated']
    },
    {
      id: '5',
      name: 'European Stock Data',
      publisher: 'Euronext',
      region: 'Europe',
      version: '2.0.5',
      status: 'inactive',
      lastUpdated: new Date(Date.now() - 86400000).toISOString(),
      schema: 'OHLCV',
      availableHistory: '15 years',
      tags: ['equities', 'europe', 'delayed']
    },
    {
      id: '6',
      name: 'Asian Market Data',
      publisher: 'TSE',
      region: 'Asia',
      version: '1.8.9',
      status: 'deprecated',
      lastUpdated: new Date(Date.now() - 172800000).toISOString(),
      schema: 'OHLCV',
      availableHistory: '20 years',
      tags: ['equities', 'asia', 'japan']
    }
  ]
  
  return NextResponse.json(dataSources)
}