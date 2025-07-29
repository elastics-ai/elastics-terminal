import { test, expect } from '@playwright/test'

test.describe('Analysis Tools Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/analysis')
  })

  test('should use volatility surface viewer', async ({ page }) => {
    // Navigate to volatility surface
    await page.click('text=Volatility Surface')
    
    // Wait for 3D surface to load
    await page.waitForSelector('[data-testid="volatility-surface-3d"]')
    
    // Check controls
    await expect(page.locator('[data-testid="rotation-control"]')).toBeVisible()
    await expect(page.locator('[data-testid="view-mode-toggle"]')).toBeVisible()
    
    // Select asset
    await page.selectOption('[data-testid="asset-selector"]', 'ETH')
    
    // Wait for surface update
    await page.waitForTimeout(1000)
    
    // Toggle to heatmap view
    await page.click('[data-testid="view-mode-toggle"]')
    
    // Verify heatmap is displayed
    await expect(page.locator('[data-testid="volatility-heatmap"]')).toBeVisible()
  })

  test('should analyze volatility skew', async ({ page }) => {
    // Navigate to skew analysis
    await page.click('text=Skew Analysis')
    
    // Wait for skew chart
    await page.waitForSelector('[data-testid="skew-chart"]')
    
    // Select expiry
    await page.selectOption('[data-testid="expiry-selector"]', '30-days')
    
    // Check skew metrics
    await expect(page.locator('[data-testid="25-delta-rr"]')).toBeVisible()
    await expect(page.locator('[data-testid="25-delta-bf"]')).toBeVisible()
    await expect(page.locator('[data-testid="atm-skew"]')).toBeVisible()
    
    // Toggle put-call skew
    await page.click('[data-testid="put-call-toggle"]')
    
    // Verify chart updates
    await expect(page.locator('[data-testid="put-skew-line"]')).toBeVisible()
    await expect(page.locator('[data-testid="call-skew-line"]')).toBeVisible()
  })

  test('should perform options strategy analysis', async ({ page }) => {
    // Navigate to strategy builder
    await page.click('text=Strategy Builder')
    
    // Select strategy template
    await page.click('text=Iron Condor')
    
    // Configure strikes
    await page.fill('[data-testid="short-put-strike"]', '48000')
    await page.fill('[data-testid="long-put-strike"]', '46000')
    await page.fill('[data-testid="short-call-strike"]', '54000')
    await page.fill('[data-testid="long-call-strike"]', '56000')
    
    // Set quantities
    await page.fill('[data-testid="position-size"]', '10')
    
    // Analyze strategy
    await page.click('button:has-text("Analyze Strategy")')
    
    // Check P&L chart
    await expect(page.locator('[data-testid="pnl-chart"]')).toBeVisible()
    
    // Check Greeks
    await expect(page.locator('[data-testid="strategy-delta"]')).toBeVisible()
    await expect(page.locator('[data-testid="strategy-gamma"]')).toBeVisible()
    await expect(page.locator('[data-testid="strategy-vega"]')).toBeVisible()
    await expect(page.locator('[data-testid="strategy-theta"]')).toBeVisible()
    
    // Check breakeven points
    await expect(page.locator('[data-testid="breakeven-points"]')).toBeVisible()
  })

  test('should use correlation matrix', async ({ page }) => {
    // Navigate to correlation analysis
    await page.click('text=Correlations')
    
    // Select assets
    await page.click('[data-testid="asset-selector-multi"]')
    await page.click('text=BTC')
    await page.click('text=ETH')
    await page.click('text=SOL')
    await page.click('text=DOGE')
    
    // Select time period
    await page.selectOption('[data-testid="correlation-period"]', '30d')
    
    // View correlation matrix
    await expect(page.locator('[data-testid="correlation-heatmap"]')).toBeVisible()
    
    // Check correlation values
    const btcEthCorr = await page.locator('[data-testid="corr-BTC-ETH"]').textContent()
    expect(parseFloat(btcEthCorr || '0')).toBeGreaterThan(0.5)
    
    // Toggle to rolling correlation
    await page.click('text=Rolling Correlation')
    
    // Check time series chart
    await expect(page.locator('[data-testid="rolling-correlation-chart"]')).toBeVisible()
  })

  test('should analyze market regime', async ({ page }) => {
    // Navigate to regime analysis
    await page.click('text=Market Regime')
    
    // Wait for regime indicators
    await page.waitForSelector('[data-testid="regime-indicator"]')
    
    // Check current regime
    const regime = await page.locator('[data-testid="current-regime"]').textContent()
    expect(['Trending', 'Mean Reverting', 'High Volatility', 'Low Volatility']).toContain(regime || '')
    
    // View regime history
    await expect(page.locator('[data-testid="regime-timeline"]')).toBeVisible()
    
    // Check regime statistics
    await expect(page.locator('[data-testid="regime-duration"]')).toBeVisible()
    await expect(page.locator('[data-testid="regime-probability"]')).toBeVisible()
  })

  test('should perform backtesting', async ({ page }) => {
    // Navigate to backtesting
    await page.click('text=Backtesting')
    
    // Select strategy
    await page.selectOption('[data-testid="strategy-selector"]', 'volatility-arbitrage')
    
    // Set backtest parameters
    await page.fill('[data-testid="start-date"]', '2023-01-01')
    await page.fill('[data-testid="end-date"]', '2023-12-31')
    await page.fill('[data-testid="initial-capital"]', '100000')
    
    // Configure strategy parameters
    await page.fill('[data-testid="vol-threshold"]', '0.02')
    await page.fill('[data-testid="position-size"]', '0.1')
    
    // Run backtest
    await page.click('button:has-text("Run Backtest")')
    
    // Wait for results
    await page.waitForSelector('[data-testid="backtest-results"]', { timeout: 30000 })
    
    // Check performance metrics
    await expect(page.locator('[data-testid="total-return"]')).toBeVisible()
    await expect(page.locator('[data-testid="sharpe-ratio"]')).toBeVisible()
    await expect(page.locator('[data-testid="max-drawdown"]')).toBeVisible()
    await expect(page.locator('[data-testid="win-rate"]')).toBeVisible()
    
    // View equity curve
    await expect(page.locator('[data-testid="equity-curve"]')).toBeVisible()
    
    // Check trade history
    await page.click('tab:has-text("Trade History")')
    await expect(page.locator('[data-testid="trades-table"]')).toBeVisible()
  })

  test('should generate analysis reports', async ({ page }) => {
    // Navigate to reports
    await page.click('text=Reports')
    
    // Select report type
    await page.selectOption('[data-testid="report-type"]', 'comprehensive-analysis')
    
    // Select assets
    await page.click('[data-testid="report-assets"]')
    await page.click('text=BTC')
    await page.click('text=ETH')
    
    // Set report period
    await page.selectOption('[data-testid="report-period"]', 'last-month')
    
    // Include sections
    await page.check('[data-testid="include-volatility"]')
    await page.check('[data-testid="include-correlations"]')
    await page.check('[data-testid="include-regime"]')
    await page.check('[data-testid="include-recommendations"]')
    
    // Generate report
    await page.click('button:has-text("Generate Report")')
    
    // Wait for report generation
    await page.waitForSelector('[data-testid="report-preview"]', { timeout: 20000 })
    
    // Export report
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export PDF")')
    const download = await downloadPromise
    
    expect(download.suggestedFilename()).toContain('analysis-report')
    expect(download.suggestedFilename()).toContain('.pdf')
  })
})