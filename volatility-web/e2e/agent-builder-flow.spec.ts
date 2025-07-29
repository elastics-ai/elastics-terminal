import { test, expect } from '@playwright/test'

test.describe('Agent Builder Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/agent-builder')
  })

  test('should create a volatility monitoring agent', async ({ page }) => {
    // Wait for agent builder to load
    await page.waitForSelector('[data-testid="flow-canvas"]')
    
    // Drag data source node
    const dataSourceNode = page.locator('[data-testid="node-data-source"]')
    const canvas = page.locator('[data-testid="flow-canvas"]')
    
    await dataSourceNode.dragTo(canvas, {
      targetPosition: { x: 200, y: 100 }
    })
    
    // Configure data source
    await page.click('[data-testid="node-1"]')
    await page.selectOption('[data-testid="source-selector"]', 'deribit')
    await page.selectOption('[data-testid="data-type"]', 'volatility')
    await page.fill('[data-testid="refresh-rate"]', '5')
    await page.click('button:has-text("Save")')
    
    // Add filter node
    const filterNode = page.locator('[data-testid="node-filter"]')
    await filterNode.dragTo(canvas, {
      targetPosition: { x: 400, y: 100 }
    })
    
    // Connect nodes
    const sourceOutput = page.locator('[data-testid="node-1-output"]')
    const filterInput = page.locator('[data-testid="node-2-input"]')
    await sourceOutput.dragTo(filterInput)
    
    // Configure filter
    await page.click('[data-testid="node-2"]')
    await page.selectOption('[data-testid="condition"]', 'greater_than')
    await page.fill('[data-testid="threshold"]', '0.025')
    await page.click('button:has-text("Save")')
    
    // Add alert node
    const alertNode = page.locator('[data-testid="node-alert"]')
    await alertNode.dragTo(canvas, {
      targetPosition: { x: 600, y: 100 }
    })
    
    // Connect filter to alert
    const filterOutput = page.locator('[data-testid="node-2-output"]')
    const alertInput = page.locator('[data-testid="node-3-input"]')
    await filterOutput.dragTo(alertInput)
    
    // Configure alert
    await page.click('[data-testid="node-3"]')
    await page.fill('[data-testid="alert-message"]', 'High volatility detected: {value}')
    await page.check('[data-testid="alert-email"]')
    await page.check('[data-testid="alert-webhook"]')
    await page.click('button:has-text("Save")')
    
    // Save agent
    await page.click('button:has-text("Save Agent")')
    await page.fill('[data-testid="agent-name"]', 'Volatility Monitor')
    await page.fill('[data-testid="agent-description"]', 'Monitors volatility and alerts on spikes')
    await page.click('button:has-text("Create")')
    
    // Verify success
    await expect(page.locator('text=Agent created successfully')).toBeVisible()
  })

  test('should load and modify template', async ({ page }) => {
    // Open templates
    await page.click('button:has-text("Templates")')
    
    // Select arbitrage template
    await page.click('[data-testid="template-arbitrage-bot"]')
    
    // Wait for template to load
    await page.waitForSelector('[data-testid="node-1"]')
    
    // Verify template nodes
    await expect(page.locator('[data-testid="node-1"]:has-text("Deribit Price")')).toBeVisible()
    await expect(page.locator('[data-testid="node-2"]:has-text("Kalshi Price")')).toBeVisible()
    await expect(page.locator('[data-testid="node-3"]:has-text("Price Comparison")')).toBeVisible()
    
    // Modify threshold
    await page.click('[data-testid="node-3"]')
    await page.fill('[data-testid="threshold"]', '0.005')
    await page.click('button:has-text("Save")')
    
    // Add execution node
    const executionNode = page.locator('[data-testid="node-execution"]')
    const canvas = page.locator('[data-testid="flow-canvas"]')
    await executionNode.dragTo(canvas, {
      targetPosition: { x: 800, y: 200 }
    })
    
    // Connect and configure
    const comparisonOutput = page.locator('[data-testid="node-3-output"]')
    const executionInput = page.locator('[data-testid="node-4-input"]')
    await comparisonOutput.dragTo(executionInput)
    
    // Save modified template
    await page.click('button:has-text("Save Agent")')
    await page.fill('[data-testid="agent-name"]', 'Enhanced Arbitrage Bot')
    await page.click('button:has-text("Create")')
  })

  test('should test agent flow', async ({ page }) => {
    // Create simple flow
    // ... (abbreviated for brevity)
    
    // Click test button
    await page.click('button:has-text("Test Agent")')
    
    // Configure test data
    await page.fill('[data-testid="test-data-input"]', JSON.stringify({
      volatility: 0.03,
      price: 52000,
      timestamp: Date.now()
    }))
    
    // Run test
    await page.click('button:has-text("Run Test")')
    
    // Wait for results
    await page.waitForSelector('[data-testid="test-results"]')
    
    // Check node execution status
    await expect(page.locator('[data-testid="node-1-status"]:has-text("✓")')).toBeVisible()
    await expect(page.locator('[data-testid="node-2-status"]:has-text("✓")')).toBeVisible()
    await expect(page.locator('[data-testid="node-3-status"]:has-text("✓")')).toBeVisible()
    
    // View execution logs
    await page.click('text=View Logs')
    await expect(page.locator('[data-testid="execution-logs"]')).toBeVisible()
  })

  test('should manage agent library', async ({ page }) => {
    // Navigate to library
    await page.click('text=My Agents')
    
    // Wait for agents list
    await page.waitForSelector('[data-testid="agents-list"]')
    
    // Search for agent
    await page.fill('[placeholder="Search agents..."]', 'volatility')
    
    // Click on agent
    await page.click('[data-testid="agent-card"]:has-text("Volatility Monitor")')
    
    // View agent details
    await expect(page.locator('[data-testid="agent-details"]')).toBeVisible()
    await expect(page.locator('text=Status: Active')).toBeVisible()
    await expect(page.locator('text=Last Run:')).toBeVisible()
    
    // Edit agent
    await page.click('button:has-text("Edit")')
    
    // Make changes
    await page.click('[data-testid="node-2"]')
    await page.fill('[data-testid="threshold"]', '0.03')
    await page.click('button:has-text("Save")')
    
    // Update agent
    await page.click('button:has-text("Update Agent")')
    
    // Verify update
    await expect(page.locator('text=Agent updated successfully')).toBeVisible()
  })

  test('should schedule agent execution', async ({ page }) => {
    // Open agent
    await page.click('text=My Agents')
    await page.click('[data-testid="agent-card"]:first-child')
    
    // Open scheduling
    await page.click('button:has-text("Schedule")')
    
    // Configure schedule
    await page.selectOption('[data-testid="schedule-type"]', 'interval')
    await page.fill('[data-testid="interval-minutes"]', '15')
    
    // Set active hours
    await page.check('[data-testid="active-hours"]')
    await page.fill('[data-testid="start-hour"]', '09:00')
    await page.fill('[data-testid="end-hour"]', '17:00')
    
    // Enable
    await page.click('button:has-text("Enable Schedule")')
    
    // Verify scheduled
    await expect(page.locator('text=Schedule enabled')).toBeVisible()
    await expect(page.locator('text=Next run:')).toBeVisible()
  })

  test('should view agent execution history', async ({ page }) => {
    // Open agent
    await page.click('text=My Agents')
    await page.click('[data-testid="agent-card"]:first-child')
    
    // Navigate to history
    await page.click('tab:has-text("Execution History")')
    
    // Check history table
    await expect(page.locator('[data-testid="execution-history-table"]')).toBeVisible()
    
    // Filter by status
    await page.selectOption('[data-testid="status-filter"]', 'success')
    
    // View execution details
    await page.click('[data-testid="execution-row"]:first-child')
    
    // Check execution details
    await expect(page.locator('[data-testid="execution-detail"]')).toBeVisible()
    await expect(page.locator('text=Input Data')).toBeVisible()
    await expect(page.locator('text=Output Data')).toBeVisible()
    await expect(page.locator('text=Execution Time')).toBeVisible()
    
    // View node trace
    await page.click('text=Node Trace')
    await expect(page.locator('[data-testid="node-trace-timeline"]')).toBeVisible()
  })

  test('should export and import agents', async ({ page }) => {
    // Open agent
    await page.click('text=My Agents')
    await page.click('[data-testid="agent-card"]:first-child')
    
    // Export agent
    await page.click('button:has-text("Export")')
    
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Download JSON")')
    const download = await downloadPromise
    
    expect(download.suggestedFilename()).toContain('agent')
    expect(download.suggestedFilename()).toContain('.json')
    
    // Import agent
    await page.click('button:has-text("Import Agent")')
    
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./test-fixtures/sample-agent.json')
    
    // Review import
    await expect(page.locator('[data-testid="import-preview"]')).toBeVisible()
    
    // Confirm import
    await page.click('button:has-text("Import")')
    
    // Verify imported
    await expect(page.locator('text=Agent imported successfully')).toBeVisible()
  })
})