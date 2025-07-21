declare module 'react-plotly.js' {
  import React from 'react';
  
  interface PlotData {
    type?: string;
    x?: unknown[];
    y?: unknown[];
    z?: unknown[][];
    colorscale?: unknown[][];
    contours?: unknown;
    hovertemplate?: string;
    [key: string]: unknown;
  }
  
  interface PlotLayout {
    autosize?: boolean;
    margin?: {
      l?: number;
      r?: number;
      t?: number;
      b?: number;
    };
    paper_bgcolor?: string;
    plot_bgcolor?: string;
    scene?: unknown;
    [key: string]: unknown;
  }
  
  interface PlotConfig {
    displayModeBar?: boolean;
    responsive?: boolean;
    [key: string]: unknown;
  }
  
  interface PlotProps {
    data: PlotData[];
    layout?: PlotLayout;
    config?: PlotConfig;
    style?: React.CSSProperties;
    [key: string]: unknown;
  }
  
  declare const Plot: React.FC<PlotProps>;
  export default Plot;
}
