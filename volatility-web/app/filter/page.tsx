"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import VolatilitySurface from '@/components/VolatilitySurface';

interface VolatilityEstimate {
  timestamp: string;
  volatility: number;
  threshold: number;
  price: number;
}

interface VolSurfaceData {
  surface: number[][];
  moneyness_grid: number[];
  ttm_grid: number[];
}

export default function FilterPage() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [volatilityData, setVolatilityData] = useState<VolatilityEstimate[]>([]);
  const [volSurface, setVolSurface] = useState<VolSurfaceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const maxDataPoints = 200;

  const connect = useCallback(() => {
    if (ws?.readyState === WebSocket.OPEN) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const websocket = new WebSocket('ws://localhost:8765');
      
      websocket.onopen = () => {
        setIsConnected(true);
        setIsLoading(false);
        setError(null);
        console.log('Connected to WebSocket');
        
        // Subscribe to events
        websocket.send(JSON.stringify({
          type: 'subscribe',
          events: ['volatility_estimate', 'all_trades', 'vol_surface']
        }));
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'volatility_estimate':
              if (data.data?.volatility && data.data?.timestamp) {
                setVolatilityData((prev) => {
                  const newData = [...prev, data.data as VolatilityEstimate];
                  return newData.slice(-maxDataPoints);
                });
                if (data.data.price) {
                  setCurrentPrice(data.data.price);
                }
              }
              break;
            case 'trade':
              if (data.data?.price) {
                setCurrentPrice(data.data.price);
              }
              break;
            case 'vol_surface':
              if (data.data && data.data.surface && data.data.moneyness_grid && data.data.ttm_grid) {
                setVolSurface(data.data);
              }
              break;
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error occurred');
        setIsLoading(false);
      };
      
      websocket.onclose = () => {
        setIsConnected(false);
        setIsLoading(false);
        setWs(null);
        console.log('Disconnected from WebSocket');
        
        // Auto-reconnect after 3 seconds
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = undefined;
            connect();
          }, 3000);
        }
      };
      
      setWs(websocket);
    } catch (error) {
      console.error('Connection error:', error);
      setError('Failed to connect to WebSocket server');
      setIsLoading(false);
    }
  }, [ws, maxDataPoints]);
  
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [connect, ws]);

  const toggleConnection = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
      ws.close();
    } else {
      connect();
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return '--';
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatVolatility = (value: number) => `${(value * 100).toFixed(2)}%`;

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Volatility Monitor</h1>
        <div className="flex items-center space-x-2">
          {error && (
            <Badge variant="destructive">{error}</Badge>
          )}
          <Badge variant={isConnected ? 'success' : 'destructive'}>
            {isLoading ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Button 
            onClick={toggleConnection}
            disabled={isLoading}
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </Button>
        </div>
      </div>

      <Separator className="mb-4" />

      <div className="text-center mb-6">
        <div className="text-sm text-muted-foreground">BTC-PERPETUAL</div>
        <div className="text-5xl font-extrabold text-primary tabular-nums">
          {formatPrice(currentPrice)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Realized Volatility</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={volatilityData.map(d => ({
                  ...d,
                  timestamp: new Date(d.timestamp).toLocaleTimeString(),
                }))}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="timestamp" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={formatVolatility} />
                <Tooltip
                  formatter={(value: number, name: string) => [formatVolatility(value), name]}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--muted-foreground))' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="volatility"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  name="Volatility"
                />
                <Line
                  type="monotone"
                  dataKey="threshold"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                  name="Threshold"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Implied Volatility Surface</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow">
            {volSurface ? (
              <VolatilitySurface volSurface={volSurface} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {isConnected ? 'Waiting for volatility surface data...' : 'Connect to view data'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
