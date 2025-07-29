import { test, expect } from '@playwright/test'

test.describe('Market Analysis Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/market')
  })

  test('should display market overview with key metrics', async ({ page }) => {
    // Wait for market data to load
    await page.waitForSelector('[data-testid="market-overview"]')
    
    // Check key metrics
    await expect(page.locator('text=BTC/USD')).toBeVisible()
    await expect(page.locator('text=ETH/USD')).toBeVisible()
    await expect(page.locator('[data-testid="price-display"]').first()).toBeVisible()
    
    // Check market sentiment indicators
    await expect(page.locator('[data-testid="fear-greed-index"]')).toBeVisible()
    await expect(page.locator('[data-testid="market-breadth"]')).toBeVisible()
  })

  test('should filter markets by asset class', async ({ page }) => {
    // Wait for markets table
    await page.waitForSelector('[data-testid="markets-table"]')
    
    // Filter by crypto
    await page.click('button:has-text("Crypto")')
    
    // Verify filtered results
    const cryptoMarkets = page.locator('[data-testid="market-row"]:has-text("BTC")')
    await expect(cryptoMarkets.first()).toBeVisible()
    
    // Filter by options
    await page.click('button:has-text("Options")')
    
    // Verify options are shown
    const optionMarkets = page.locator('[data-testid="market-row"]:has-text("Call")')
    await expect(optionMarkets.first()).toBeVisible()
  })

  test('should search for specific markets', async ({ page }) => {
    // Search for BTC markets
    await page.fill('[placeholder="Search markets..."]', 'BTC')
    
    // Check search results
    const searchResults = page.locator('[data-testid="market-row"]')
    const count = await searchResults.count()
    
    for (let i = 0; i < count; i++) {
      await expect(searchResults.nth(i)).toContainText('BTC')
    }
  })

  test('should view detailed market analysis', async ({ page }) => {
    // Click on a market
    await page.click('[data-testid="market-row"]:has-text("BTC-PERPETUAL")')
    
    // Wait for detail view
    await page.waitForSelector('[data-testid="market-detail"]')
    
    // Check analysis components
    await expect(page.locator('[data-testid="price-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="volume-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="orderbook"]')).toBeVisible()
    await expect(page.locator('[data-testid="recent-trades"]')).toBeVisible()
  })

  test('should compare multiple markets', async ({ page }) => {
    // Select first market for comparison
    await page.click('[data-testid="compare-checkbox"]:nth-of-type(1)')
    
    // Select second market
    await page.click('[data-testid="compare-checkbox"]:nth-of-type(2)')
    
    // Click compare button
    await page.click('button:has-text("Compare Selected")')
    
    // Check comparison view
    await expect(page.locator('[data-testid="comparison-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="correlation-matrix"]')).toBeVisible()
    await expect(page.locator('[data-testid="performance-table"]')).toBeVisible()
  })

  test('should set price alerts', async ({ page }) => {
    // Open alert dialog
    await page.click('[data-testid="market-row"]:first-child button[aria-label="Set alert"]')
    
    // Configure alert
    await page.fill('[data-testid="alert-price"]', '55000')
    await page.selectOption('[data-testid="alert-condition"]', 'above')
    
    // Set notification method
    await page.check('[data-testid="alert-email"]')
    
    // Save alert
    await page.click('button:has-text("Create Alert")')
    
    // Verify alert created
    await expect(page.locator('text=Alert created successfully')).toBeVisible()
  })

  test('should view volatility analysis', async ({ page }) => {
    // Navigate to volatility tab
    await page.click('text=Volatility Analysis')
    
    // Wait for volatility data
    await page.waitForSelector('[data-testid="volatility-surface"]')
    
    // Check volatility components
    await expect(page.locator('[data-testid="iv-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="hv-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="volatility-smile"]')).toBeVisible()
    await expect(page.locator('[data-testid="term-structure"]')).toBeVisible()
  })

  test('should export market data', async ({ page }) => {
    // Select markets to export
    await page.click('[data-testid="select-all-markets"]')
    
    // Open export menu
    await page.click('button:has-text("Export")')
    
    // Select export format
    await page.click('text=Export as Excel')
    
    // Configure export options
    await page.check('[data-testid="export-prices"]')
    await page.check('[data-testid="export-volume"]')
    await page.check('[data-testid="export-volatility"]')
    
    // Download
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Download")')
    const download = await downloadPromise
    
    // Verify download
    expect(download.suggestedFilename()).toContain('market-data')
    expect(download.suggestedFilename()).toContain('.xlsx')
  })
})