import { test, expect } from '@playwright/test'

test.describe('Settings and Configuration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/settings')
  })

  test('should configure API connections', async ({ page }) => {
    // Navigate to API settings
    await page.click('text=API Configuration')
    
    // Configure Deribit
    await page.click('[data-testid="deribit-config"]')
    await page.fill('[data-testid="deribit-api-key"]', 'test-api-key')
    await page.fill('[data-testid="deribit-api-secret"]', 'test-api-secret')
    
    // Test connection
    await page.click('[data-testid="test-deribit-connection"]')
    await expect(page.locator('text=Connection successful')).toBeVisible()
    
    // Configure Kalshi
    await page.click('[data-testid="kalshi-config"]')
    await page.fill('[data-testid="kalshi-email"]', 'test@example.com')
    await page.fill('[data-testid="kalshi-password"]', 'password123')
    
    // Save all
    await page.click('button:has-text("Save API Settings")')
    await expect(page.locator('text=Settings saved')).toBeVisible()
  })

  test('should manage notification preferences', async ({ page }) => {
    // Navigate to notifications
    await page.click('text=Notifications')
    
    // Enable email notifications
    await page.check('[data-testid="enable-email-notifications"]')
    await page.fill('[data-testid="notification-email"]', 'alerts@example.com')
    
    // Configure alert types
    await page.check('[data-testid="notify-high-volatility"]')
    await page.check('[data-testid="notify-position-changes"]')
    await page.check('[data-testid="notify-pnl-threshold"]')
    
    // Set PnL threshold
    await page.fill('[data-testid="pnl-threshold-amount"]', '10000')
    
    // Configure webhook
    await page.check('[data-testid="enable-webhook"]')
    await page.fill('[data-testid="webhook-url"]', 'https://example.com/webhook')
    
    // Test webhook
    await page.click('[data-testid="test-webhook"]')
    await expect(page.locator('text=Webhook test sent')).toBeVisible()
    
    // Save preferences
    await page.click('button:has-text("Save Notification Settings")')
  })

  test('should configure risk parameters', async ({ page }) => {
    // Navigate to risk settings
    await page.click('text=Risk Management')
    
    // Set position limits
    await page.fill('[data-testid="max-position-size"]', '1000000')
    await page.fill('[data-testid="max-single-position"]', '100000')
    
    // Configure Greeks limits
    await page.fill('[data-testid="max-delta"]', '1000')
    await page.fill('[data-testid="max-gamma"]', '50')
    await page.fill('[data-testid="max-vega"]', '5000')
    await page.fill('[data-testid="max-theta"]', '-10000')
    
    // Set drawdown limits
    await page.fill('[data-testid="max-daily-drawdown"]', '5')
    await page.fill('[data-testid="max-weekly-drawdown"]', '10')
    
    // Enable auto-liquidation
    await page.check('[data-testid="enable-auto-liquidation"]')
    await page.fill('[data-testid="liquidation-threshold"]', '15')
    
    // Save risk settings
    await page.click('button:has-text("Save Risk Settings")')
    
    // Verify saved
    await expect(page.locator('text=Risk parameters updated')).toBeVisible()
  })

  test('should customize UI preferences', async ({ page }) => {
    // Navigate to UI settings
    await page.click('text=User Interface')
    
    // Change theme
    await page.selectOption('[data-testid="theme-selector"]', 'dark')
    
    // Verify theme changed
    await expect(page.locator('body')).toHaveClass(/dark-theme/)
    
    // Configure chart settings
    await page.selectOption('[data-testid="default-chart-type"]', 'candlestick')
    await page.selectOption('[data-testid="default-timeframe"]', '1h')
    
    // Set number formats
    await page.selectOption('[data-testid="number-format"]', 'comma')
    await page.selectOption('[data-testid="decimal-places"]', '2')
    
    // Configure dashboard layout
    await page.click('text=Dashboard Layout')
    
    // Drag widgets
    const portfolioWidget = page.locator('[data-testid="widget-portfolio"]')
    const targetSlot = page.locator('[data-testid="dashboard-slot-1"]')
    await portfolioWidget.dragTo(targetSlot)
    
    // Save layout
    await page.click('button:has-text("Save Layout")')
  })

  test('should manage data preferences', async ({ page }) => {
    // Navigate to data settings
    await page.click('text=Data & Storage')
    
    // Configure data retention
    await page.selectOption('[data-testid="tick-retention"]', '7days')
    await page.selectOption('[data-testid="candle-retention"]', '1year')
    
    // Set cache settings
    await page.fill('[data-testid="cache-size-mb"]', '500')
    await page.check('[data-testid="enable-aggressive-caching"]')
    
    // Clear cache
    await page.click('button:has-text("Clear Cache")')
    await page.click('button:has-text("Confirm")')
    await expect(page.locator('text=Cache cleared')).toBeVisible()
    
    // Configure data sources priority
    const deribitPriority = page.locator('[data-testid="source-deribit"]')
    const topPosition = page.locator('[data-testid="priority-1"]')
    await deribitPriority.dragTo(topPosition)
    
    // Save data settings
    await page.click('button:has-text("Save Data Settings")')
  })

  test('should export and import settings', async ({ page }) => {
    // Navigate to backup
    await page.click('text=Backup & Restore')
    
    // Export settings
    await page.click('button:has-text("Export Settings")')
    
    // Select what to export
    await page.check('[data-testid="export-api-config"]')
    await page.check('[data-testid="export-risk-params"]')
    await page.check('[data-testid="export-ui-prefs"]')
    
    // Download
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Download")')
    const download = await downloadPromise
    
    expect(download.suggestedFilename()).toContain('elastics-settings')
    expect(download.suggestedFilename()).toContain('.json')
    
    // Import settings
    await page.click('button:has-text("Import Settings")')
    
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./test-fixtures/settings-backup.json')
    
    // Review import
    await expect(page.locator('[data-testid="import-preview"]')).toBeVisible()
    
    // Select what to import
    await page.uncheck('[data-testid="import-api-config"]')
    
    // Confirm import
    await page.click('button:has-text("Import")')
    await expect(page.locator('text=Settings imported')).toBeVisible()
  })

  test('should view system information', async ({ page }) => {
    // Navigate to system info
    await page.click('text=System Info')
    
    // Check version info
    await expect(page.locator('text=Version:')).toBeVisible()
    await expect(page.locator('text=Build:')).toBeVisible()
    
    // View system status
    await expect(page.locator('[data-testid="api-status-deribit"]')).toBeVisible()
    await expect(page.locator('[data-testid="api-status-kalshi"]')).toBeVisible()
    await expect(page.locator('[data-testid="api-status-polymarket"]')).toBeVisible()
    
    // Check resource usage
    await expect(page.locator('[data-testid="memory-usage"]')).toBeVisible()
    await expect(page.locator('[data-testid="storage-usage"]')).toBeVisible()
    
    // View logs
    await page.click('button:has-text("View Logs")')
    await expect(page.locator('[data-testid="system-logs"]')).toBeVisible()
    
    // Filter logs
    await page.selectOption('[data-testid="log-level"]', 'error')
    await page.fill('[data-testid="log-search"]', 'connection')
    
    // Export logs
    await page.click('button:has-text("Export Logs")')
  })
})