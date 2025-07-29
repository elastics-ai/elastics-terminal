import { NextResponse } from 'next/server'

export async function GET() {
  // Mock modules data
  const modules = [
    {
      id: '1',
      name: 'SSVI Surface',
      description: 'Stochastic Surface Volatility Inspired model for options pricing',
      category: 'function',
      version: '2.0.1',
      status: 'active',
      lastUpdated: new Date().toISOString(),
      author: 'Elastics Team',
      dependencies: ['numpy', 'scipy'],
      tags: ['volatility', 'options', 'pricing']
    },
    {
      id: '2',
      name: 'Contract Matcher',
      description: 'Matches contracts across different markets for arbitrage opportunities',
      category: 'function',
      version: '1.3.0',
      status: 'active',
      lastUpdated: new Date().toISOString(),
      author: 'Elastics Team',
      dependencies: ['pandas', 'requests'],
      tags: ['arbitrage', 'matching', 'contracts']
    },
    {
      id: '3',
      name: 'Implied Volatility',
      description: 'Calculate implied volatility from options prices using Black-Scholes',
      category: 'function',
      version: '1.8.2',
      status: 'active',
      lastUpdated: new Date().toISOString(),
      author: 'Elastics Team',
      dependencies: ['numpy', 'scipy'],
      tags: ['volatility', 'options', 'black-scholes']
    },
    {
      id: '4',
      name: 'Sentiment Analysis',
      description: 'Analyze market sentiment from Twitter and news sources',
      category: 'function',
      version: '2.1.0',
      status: 'active',
      lastUpdated: new Date().toISOString(),
      author: 'AI Team',
      dependencies: ['transformers', 'torch'],
      tags: ['sentiment', 'nlp', 'social-media']
    },
    {
      id: '5',
      name: 'Greek Calculator',
      description: 'Calculate option Greeks (Delta, Gamma, Theta, Vega, Rho)',
      category: 'function',
      version: '1.5.0',
      status: 'active',
      lastUpdated: new Date().toISOString(),
      author: 'Quant Team',
      dependencies: ['numpy', 'scipy'],
      tags: ['greeks', 'options', 'risk']
    },
    {
      id: '6',
      name: 'Kalshi Data',
      description: 'Real-time data feed from Kalshi prediction markets',
      category: 'data',
      version: '1.0.0',
      status: 'active',
      lastUpdated: new Date().toISOString(),
      author: 'Data Team',
      dependencies: ['websocket', 'requests'],
      tags: ['kalshi', 'prediction-markets', 'realtime']
    },
    {
      id: '7',
      name: 'Polymarket Data',
      description: 'Polymarket decentralized prediction market data',
      category: 'data',
      version: '2.0.0',
      status: 'active',
      lastUpdated: new Date().toISOString(),
      author: 'Data Team',
      dependencies: ['web3', 'requests'],
      tags: ['polymarket', 'defi', 'prediction-markets']
    },
    {
      id: '8',
      name: 'Deribit Data',
      description: 'Crypto options and futures data from Deribit',
      category: 'data',
      version: '1.2.0',
      status: 'active',
      lastUpdated: new Date().toISOString(),
      author: 'Data Team',
      dependencies: ['websocket', 'requests'],
      tags: ['deribit', 'crypto', 'options']
    },
    {
      id: '9',
      name: 'Twitter Feed',
      description: 'Real-time Twitter data stream for market sentiment',
      category: 'data',
      version: '1.1.0',
      status: 'inactive',
      lastUpdated: new Date(Date.now() - 86400000).toISOString(),
      author: 'Social Team',
      dependencies: ['tweepy', 'requests'],
      tags: ['twitter', 'social', 'sentiment']
    },
    {
      id: '10',
      name: 'Market Making Strategy',
      description: 'Automated market making strategy for options',
      category: 'strategy',
      version: '3.0.0',
      status: 'active',
      lastUpdated: new Date().toISOString(),
      author: 'Strategy Team',
      dependencies: ['numpy', 'pandas'],
      tags: ['market-making', 'strategy', 'automated']
    },
    {
      id: '11',
      name: 'Hedging System',
      description: 'Dynamic hedging system for portfolio risk management',
      category: 'risk',
      version: '2.5.0',
      status: 'active',
      lastUpdated: new Date().toISOString(),
      author: 'Risk Team',
      dependencies: ['numpy', 'cvxpy'],
      tags: ['hedging', 'risk-management', 'portfolio']
    },
    {
      id: '12',
      name: 'Engine-01',
      description: 'Main execution engine for trading strategies',
      category: 'execution',
      version: '4.0.0',
      status: 'active',
      lastUpdated: new Date().toISOString(),
      author: 'Core Team',
      dependencies: ['asyncio', 'redis'],
      tags: ['execution', 'trading', 'engine']
    },
    {
      id: '13',
      name: 'Backtest Engine',
      description: 'Historical backtesting for strategy validation',
      category: 'execution',
      version: '2.2.0',
      status: 'error',
      lastUpdated: new Date(Date.now() - 172800000).toISOString(),
      author: 'Quant Team',
      dependencies: ['pandas', 'numpy'],
      tags: ['backtesting', 'historical', 'validation']
    }
  ]
  
  return NextResponse.json(modules)
}