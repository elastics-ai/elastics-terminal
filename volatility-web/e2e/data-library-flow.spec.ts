import { test, expect } from '@playwright/test'

test.describe('Data Library Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/data-library/modules')
  })

  test('should manage data modules', async ({ page }) => {
    // Wait for modules to load
    await page.waitForSelector('[data-testid="module-card"]')
    
    // Search for volatility scanner
    await page.fill('[placeholder="Search modules..."]', 'volatility')
    
    // Click on module
    await page.click('[data-testid="module-card"]:has-text("Volatility Scanner")')
    
    // Check module details panel
    await expect(page.locator('[data-testid="module-config"]')).toBeVisible()
    
    // Toggle module status
    const statusToggle = page.locator('[data-testid="module-status-toggle"]')
    await statusToggle.click()
    
    // Verify status changed
    await expect(page.locator('text=Module paused')).toBeVisible()
  })

  test('should browse and subscribe to datasets', async ({ page }) => {
    // Navigate to catalog
    await page.click('text=Catalog')
    
    // Wait for datasets
    await page.waitForSelector('[data-testid="dataset-card"]')
    
    // Filter by category
    await page.click('button:has-text("Options")')
    
    // Click on a dataset
    await page.click('[data-testid="dataset-card"]:has-text("BTC Options Chain")')
    
    // View dataset details
    await expect(page.locator('[data-testid="dataset-modal"]')).toBeVisible()
    await expect(page.locator('text=Schema')).toBeVisible()
    await expect(page.locator('text=Sample Data')).toBeVisible()
    
    // Subscribe to dataset
    await page.click('button:has-text("Subscribe")')
    
    // Confirm subscription
    await page.click('button:has-text("Confirm")')
    
    // Check success
    await expect(page.locator('text=Successfully subscribed')).toBeVisible()
  })

  test('should use contract screener', async ({ page }) => {
    // Navigate to contracts
    await page.click('text=Contracts')
    
    // Wait for screener to load
    await page.waitForSelector('[data-testid="contract-screener"]')
    
    // Set filters
    await page.selectOption('[data-testid="asset-filter"]', 'BTC')
    await page.selectOption('[data-testid="type-filter"]', 'call')
    
    // Set IV range
    await page.fill('[data-testid="iv-min"]', '60')
    await page.fill('[data-testid="iv-max"]', '80')
    
    // Apply filters
    await page.click('button:has-text("Apply Filters")')
    
    // Check results
    await expect(page.locator('[data-testid="contract-row"]')).toHaveCount(
      await page.locator('[data-testid="contract-row"]').count()
    )
    
    // Sort by volume
    await page.click('th:has-text("Volume")')
    
    // Verify sorting
    const firstVolume = await page.locator('[data-testid="contract-volume"]').first().textContent()
    const lastVolume = await page.locator('[data-testid="contract-volume"]').last().textContent()
    expect(Number(firstVolume?.replace(/,/g, ''))).toBeGreaterThan(
      Number(lastVolume?.replace(/,/g, ''))
    )
  })

  test('should view and configure bookkeeper', async ({ page }) => {
    // Navigate to bookkeeper
    await page.click('a:has-text("Bookkeeper")')
    
    // Wait for page load
    await page.waitForSelector('[data-testid="greeks-limits-table"]')
    
    // Check Greeks limits
    await expect(page.locator('text=Delta')).toBeVisible()
    await expect(page.locator('text=Gamma')).toBeVisible()
    await expect(page.locator('text=Vega')).toBeVisible()
    
    // View suggested trades
    await expect(page.locator('[data-testid="suggested-trades"]')).toBeVisible()
    
    // Approve a trade
    const approveButton = page.locator('[data-testid="approve-trade"]').first()
    await approveButton.click()
    
    // Execute rebalancing
    await page.click('button:has-text("Execute Rebalancing")')
    
    // Confirm
    await page.click('button:has-text("Confirm")')
    
    // Check execution status
    await expect(page.locator('text=Rebalancing in progress')).toBeVisible()
  })
})