"use client";

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-background rounded-lg border">
      <div className="text-muted-foreground">Loading volatility surface...</div>
    </div>
  ),
});

interface VolSurfaceData {
  surface: number[][];
  moneyness_grid: number[];
  ttm_grid: number[];
}

interface VolatilitySurfaceProps {
  volSurface: VolSurfaceData;
}

export default function VolatilitySurface({ volSurface }: VolatilitySurfaceProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96 bg-background rounded-lg border">
        <div className="text-muted-foreground">Loading volatility surface...</div>
      </div>
    }>
      <Plot
        data={[
          {
            type: 'surface',
            z: volSurface.surface,
            x: volSurface.moneyness_grid,
            y: volSurface.ttm_grid,
            colorscale: [
              [0, 'hsl(217, 71%, 53%)'],
              [0.5, 'hsl(var(--primary))'],
              [1, 'hsl(28, 100%, 53%)'],
            ],
            contours: {
              z: {
                show: true,
                usecolormap: true,
                highlightcolor: '#42f462',
                project: { z: true },
              },
            },
            hovertemplate: 'Moneyness: %{x:.3f}<br>Time to Maturity: %{y:.3f}<br>IV: %{z:.2%}<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          margin: { l: 0, r: 0, t: 0, b: 0 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          scene: {
            xaxis: {
              title: 'Moneyness (ln(K/S))',
              titlefont: { color: '#c9d1d9' },
              tickfont: { color: '#8b949e' },
              gridcolor: '#30363d',
              zerolinecolor: '#30363d',
            },
            yaxis: {
              title: 'Time to Maturity (years)',
              titlefont: { color: '#c9d1d9' },
              tickfont: { color: '#8b949e' },
              gridcolor: '#30363d',
              zerolinecolor: '#30363d',
            },
            zaxis: {
              title: 'Implied Volatility',
              titlefont: { color: '#c9d1d9' },
              tickfont: { color: '#8b949e' },
              gridcolor: '#30363d',
              zerolinecolor: '#30363d',
            },
            bgcolor: 'transparent',
          },
        }}
        config={{
          displayModeBar: false,
          responsive: true,
        }}
        style={{ width: '100%', height: '400px' }}
      />
    </Suspense>
  );
}
