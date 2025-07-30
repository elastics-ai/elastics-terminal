// Mock for react-plotly.js
import React from 'react'

const Plot = React.forwardRef((props, ref) => {
  return React.createElement('div', {
    'data-testid': 'plotly-chart',
    'data-plot-type': props.data?.[0]?.type || 'unknown',
    ref
  }, 'Plotly Chart Mock')
})

Plot.displayName = 'Plot'

module.exports = Plot
module.exports.default = Plot