import { test, expect } from '@playwright/test'

test.describe('Portfolio Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000')
    
    // Wait for app to load
    await page.waitForSelector('[data-testid="app-layout"]')
  })

  test('should display portfolio overview with key metrics', async ({ page }) => {
    // Navigate to portfolio
    await page.click('text=Portfolio')
    
    // Wait for portfolio data to load
    await page.waitForSelector('[data-testid="portfolio-overview"]')
    
    // Check key metrics are displayed
    await expect(page.locator('text=Total Value')).toBeVisible()
    await expect(page.locator('text=/\\$[0-9,]+/')).toBeVisible()
    await expect(page.locator('text=Today\'s P&L')).toBeVisible()
    
    // Check for performance chart
    await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible()
  })

  test('should filter and search positions', async ({ page }) => {
    await page.goto('http://localhost:3000/portfolio')
    
    // Wait for positions table
    await page.waitForSelector('[data-testid="positions-table"]')
    
    // Search for BTC positions
    await page.fill('[placeholder="Search positions..."]', 'BTC')
    
    // Check filtered results
    const btcPositions = page.locator('[data-testid="position-row"]:has-text("BTC")')
    await expect(btcPositions).toHaveCount(await btcPositions.count())
    
    // Clear search
    await page.fill('[placeholder="Search positions..."]', '')
    
    // Filter by position type
    await page.selectOption('[data-testid="position-type-filter"]', 'options')
    
    // Verify only options are shown
    const optionPositions = page.locator('[data-testid="position-row"]:has-text("Option")')
    await expect(optionPositions.first()).toBeVisible()
  })

  test('should navigate to enhanced analytics', async ({ page }) => {
    await page.goto('http://localhost:3000/portfolio')
    
    // Click on enhanced analytics link
    await page.click('text=Enhanced Analytics')
    
    // Wait for enhanced page to load
    await expect(page).toHaveURL(/.*\/portfolio\/enhanced/)
    
    // Check for advanced charts
    await expect(page.locator('[data-testid="greeks-radar-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="correlation-heatmap"]')).toBeVisible()
    await expect(page.locator('[data-testid="risk-metrics"]')).toBeVisible()
  })

  test('should execute AI trade suggestion', async ({ page }) => {
    await page.goto('http://localhost:3000/portfolio')
    
    // Wait for AI suggestions
    await page.waitForSelector('[data-testid="ai-suggestions"]')
    
    // Click on first suggestion
    const firstSuggestion = page.locator('[data-testid="ai-suggestion-card"]').first()
    await firstSuggestion.click()
    
    // Review suggestion details
    await expect(page.locator('[data-testid="suggestion-modal"]')).toBeVisible()
    await expect(page.locator('text=Confidence Score')).toBeVisible()
    
    // Click execute
    await page.click('button:has-text("Execute Trade")')
    
    // Confirm execution
    await page.click('button:has-text("Confirm")')
    
    // Check for success message
    await expect(page.locator('text=Trade executed successfully')).toBeVisible()
  })

  test('should export portfolio data', async ({ page }) => {
    await page.goto('http://localhost:3000/portfolio')
    
    // Click export button
    await page.click('button:has-text("Export")')
    
    // Select CSV format
    await page.click('text=Export as CSV')
    
    // Wait for download
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Download")')
    const download = await downloadPromise
    
    // Verify download
    expect(download.suggestedFilename()).toContain('portfolio')
    expect(download.suggestedFilename()).toContain('.csv')
  })
})