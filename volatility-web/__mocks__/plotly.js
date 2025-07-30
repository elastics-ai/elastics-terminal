// Mock for plotly.js-dist-min
module.exports = {
  newPlot: jest.fn(() => Promise.resolve()),
  react: jest.fn(() => Promise.resolve()),
  purge: jest.fn(),
  toImage: jest.fn(() => Promise.resolve('data:image/png;base64,mock')),
  downloadImage: jest.fn(() => Promise.resolve()),
  plot: jest.fn(() => Promise.resolve()),
  redraw: jest.fn(() => Promise.resolve()),
  relayout: jest.fn(() => Promise.resolve()),
  restyle: jest.fn(() => Promise.resolve()),
  update: jest.fn(() => Promise.resolve()),
  validate: jest.fn(() => []),
  Plots: {
    resize: jest.fn()
  },
  Config: {
    plotlyServerURL: 'https://plot.ly'
  }
}