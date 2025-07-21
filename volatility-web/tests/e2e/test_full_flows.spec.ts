import { test, expect, Page } from '@playwright/test';

// Helper to setup initial state
async function setupTestUser(page: Page) {
  // Mock authenticated user
  await page.addInitScript(() => {
    localStorage.setItem('user_id', 'test-user-123');
    localStorage.setItem('session_id', 'test-session-456');
  });
}

// Helper to wait for WebSocket connection
async function waitForWebSocketConnection(page: Page) {
  await page.waitForFunction(() => {
    const wsStatus = document.querySelector('[data-testid="ws-status"]');
    return wsStatus?.getAttribute('data-connected') === 'true';
  }, { timeout: 10000 });
}

test.describe('Full E2E User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUser(page);
  });

  test.describe('Portfolio Analysis Journey', () => {
    test('user views portfolio, asks AI for analysis, and gets contextual response', async ({ page }) => {
      // Step 1: Navigate to dashboard
      await page.goto('/');
      await waitForWebSocketConnection(page);
      
      // Step 2: View portfolio summary
      await page.waitForSelector('[data-testid="total-value-card"]');
      const totalValue = await page.locator('[data-testid="total-value-card"] .value').textContent();
      const totalPnL = await page.locator('[data-testid="total-pnl-card"] .value').textContent();
      
      // Verify portfolio data is loaded
      expect(totalValue).toMatch(/\$[\d,]+\.?\d*/);
      expect(totalPnL).toMatch(/[+-]\$[\d,]+\.?\d*/);
      
      // Step 3: Navigate to chat
      await page.click('text=Chat');
      await expect(page).toHaveURL('/chat');
      
      // Step 4: Ask about portfolio performance
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Analyze my portfolio performance and suggest optimizations');
      await chatInput.press('Enter');
      
      // Step 5: Wait for AI response
      await page.waitForSelector('[data-testid="chat-message"][data-role="assistant"]', { timeout: 15000 });
      
      // Step 6: Verify response contains portfolio context
      const aiResponse = page.locator('[data-testid="chat-message"][data-role="assistant"]').last();
      const responseText = await aiResponse.textContent();
      
      // Response should reference actual portfolio data
      expect(responseText).toMatch(/portfolio|value|performance/i);
      expect(responseText).toMatch(/\$[\d,]+/); // Should mention dollar amounts
      
      // Step 7: Ask follow-up question
      await chatInput.fill('Which position should I consider closing?');
      await chatInput.press('Enter');
      
      // Step 8: Wait for follow-up response
      await page.waitForSelector('[data-testid="chat-message"][data-role="assistant"]:nth-last-child(1)', { timeout: 15000 });
      
      const followUpResponse = await page.locator('[data-testid="chat-message"][data-role="assistant"]').last().textContent();
      expect(followUpResponse).toMatch(/position|close|sell|recommendation/i);
    });
  });

  test.describe('Real-time Monitoring Journey', () => {
    test('user sets up volatility alerts and receives real-time notifications', async ({ page }) => {
      // Step 1: Go to volatility filter
      await page.goto('/filter');
      await waitForWebSocketConnection(page);
      
      // Step 2: Configure alert thresholds
      await page.locator('[data-testid="threshold-input"]').fill('0.75');
      await page.locator('[data-testid="symbol-select"]').selectOption('BTC-USD');
      await page.locator('button:has-text("Set Alert")').click();
      
      // Step 3: Verify alert was created
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
      
      // Step 4: Navigate to dashboard to monitor
      await page.click('text=Dashboard');
      
      // Step 5: Wait for real-time alert
      // In a real scenario, we'd wait for actual market movement
      // For testing, we'll verify the alert component is ready
      const alertsPanel = page.locator('[data-testid="volatility-alerts"]');
      await expect(alertsPanel).toBeVisible();
      
      // Step 6: Simulate receiving an alert via WebSocket
      await page.evaluate(() => {
        // Dispatch custom event to simulate WebSocket message
        window.dispatchEvent(new CustomEvent('ws-message', {
          detail: {
            type: 'threshold_breach',
            data: {
              symbol: 'BTC-USD',
              current_volatility: 0.85,
              threshold: 0.75,
              breach_type: 'above',
              timestamp: new Date().toISOString()
            }
          }
        }));
      });
      
      // Step 7: Verify alert appears in UI
      await page.waitForSelector('[data-testid="alert-item"]');
      const alertItem = page.locator('[data-testid="alert-item"]').first();
      await expect(alertItem).toContainText('BTC-USD');
      await expect(alertItem).toContainText('0.85');
      
      // Step 8: Click alert for details
      await alertItem.click();
      
      // Step 9: Verify alert details modal
      const alertModal = page.locator('[data-testid="alert-details-modal"]');
      await expect(alertModal).toBeVisible();
      await expect(alertModal).toContainText('Volatility Breach Alert');
      await expect(alertModal).toContainText('above threshold');
    });
  });

  test.describe('SQL Analysis Journey', () => {
    test('user creates custom SQL query, saves as module, and schedules execution', async ({ page }) => {
      // Step 1: Navigate to SQL modules
      await page.goto('/modules');
      
      // Step 2: Click create new module
      await page.click('button:has-text("Create Module")');
      
      // Step 3: Fill module details
      const modal = page.locator('[data-testid="create-module-modal"]');
      await modal.locator('[name="name"]').fill('Top Gainers Analysis');
      await modal.locator('[name="description"]').fill('Find top performing positions by percentage gain');
      await modal.locator('[name="category"]').selectOption('portfolio');
      
      // Step 4: Write SQL query
      const queryEditor = modal.locator('[data-testid="query-editor"]');
      await queryEditor.fill(`
        SELECT 
          symbol,
          quantity,
          entry_price,
          current_price,
          (current_price - entry_price) * quantity as total_gain,
          ((current_price - entry_price) / entry_price * 100) as gain_percentage
        FROM positions
        WHERE current_price > entry_price
        ORDER BY gain_percentage DESC
        LIMIT 5
      `);
      
      // Step 5: Test query
      await modal.locator('button:has-text("Test Query")').click();
      
      // Step 6: Wait for test results
      await page.waitForSelector('[data-testid="test-results"]');
      const testResults = modal.locator('[data-testid="test-results"]');
      await expect(testResults).toContainText('Query executed successfully');
      
      // Step 7: Save module
      await modal.locator('button:has-text("Save Module")').click();
      
      // Step 8: Verify module appears in list
      await expect(page.locator('[data-testid="module-card"]:has-text("Top Gainers Analysis")')).toBeVisible();
      
      // Step 9: Execute the module
      const moduleCard = page.locator('[data-testid="module-card"]:has-text("Top Gainers Analysis")');
      await moduleCard.click();
      
      const detailsModal = page.locator('[data-testid="module-details"]');
      await detailsModal.locator('button:has-text("Execute")').click();
      
      // Step 10: View results
      await page.waitForSelector('[data-testid="query-results"]');
      const resultsTable = detailsModal.locator('[data-testid="results-table"]');
      await expect(resultsTable).toBeVisible();
      
      // Verify results contain expected columns
      await expect(resultsTable).toContainText('symbol');
      await expect(resultsTable).toContainText('gain_percentage');
      
      // Step 11: Favorite the module
      await detailsModal.locator('[data-testid="favorite-btn"]').click();
      await expect(detailsModal.locator('[data-testid="favorite-btn"]')).toHaveAttribute('data-favorited', 'true');
    });
  });

  test.describe('Chat Branching Journey', () => {
    test('user explores different analysis paths through conversation branching', async ({ page }) => {
      // Step 1: Start new chat conversation
      await page.goto('/chat');
      await waitForWebSocketConnection(page);
      
      // Step 2: Initial question about market analysis
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Compare crypto vs stock performance in my portfolio');
      await chatInput.press('Enter');
      
      // Step 3: Wait for initial response
      await page.waitForSelector('[data-testid="chat-message"][data-role="assistant"]');
      
      // Step 4: Create branch for crypto deep dive
      const firstResponse = page.locator('[data-testid="chat-message"][data-role="assistant"]').first();
      await firstResponse.hover();
      await firstResponse.locator('[data-testid="branch-message"]').click();
      
      // Step 5: Name the branch
      const branchModal = page.locator('[data-testid="branch-modal"]');
      await branchModal.locator('input').fill('Crypto Analysis Branch');
      await branchModal.locator('button:has-text("Create")').click();
      
      // Step 6: Continue in crypto branch
      await chatInput.fill('What are the volatility patterns for my crypto holdings?');
      await chatInput.press('Enter');
      
      await page.waitForSelector('[data-testid="chat-message"][data-role="assistant"]:nth-last-child(1)');
      
      // Step 7: Switch back to main branch
      await page.locator('[data-testid="branch-switcher"]').click();
      await page.locator('[data-testid="branch-option"]:has-text("Main")').click();
      
      // Step 8: Create stock analysis branch
      await firstResponse.hover();
      await firstResponse.locator('[data-testid="branch-message"]').click();
      
      await branchModal.locator('input').fill('Stock Analysis Branch');
      await branchModal.locator('button:has-text("Create")').click();
      
      // Step 9: Ask about stocks
      await chatInput.fill('Which stocks have the best dividend yield?');
      await chatInput.press('Enter');
      
      await page.waitForSelector('[data-testid="chat-message"][data-role="assistant"]:nth-last-child(1)');
      
      // Step 10: View branch tree
      await page.locator('[data-testid="view-tree-btn"]').click();
      
      const treeModal = page.locator('[data-testid="conversation-tree"]');
      await expect(treeModal).toBeVisible();
      
      // Verify branches are shown
      await expect(treeModal).toContainText('Crypto Analysis Branch');
      await expect(treeModal).toContainText('Stock Analysis Branch');
      
      // Step 11: Navigate between branches using tree
      await treeModal.locator('[data-testid="tree-node"]:has-text("Crypto Analysis")').click();
      
      // Verify we're back in crypto branch
      await expect(page.locator('[data-testid="branch-indicator"]')).toContainText('Crypto Analysis Branch');
    });
  });

  test.describe('Cross-Feature Integration Journey', () => {
    test('user receives alert, investigates via SQL, discusses with AI, and makes decision', async ({ page }) => {
      // Step 1: Start on dashboard
      await page.goto('/');
      await waitForWebSocketConnection(page);
      
      // Step 2: Simulate volatility alert
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ws-message', {
          detail: {
            type: 'threshold_breach',
            data: {
              symbol: 'ETH-USD',
              current_volatility: 0.92,
              threshold: 0.80,
              breach_type: 'above',
              timestamp: new Date().toISOString()
            }
          }
        }));
      });
      
      // Step 3: Click on alert notification
      await page.waitForSelector('[data-testid="alert-notification"]');
      await page.locator('[data-testid="alert-notification"]').click();
      
      // Step 4: Navigate to SQL modules to investigate
      await page.click('text=Modules');
      
      // Step 5: Search for volatility-related module
      await page.locator('[data-testid="module-search"]').fill('volatility');
      await page.waitForTimeout(500); // Debounce
      
      // Step 6: Execute volatility analysis module
      const volModule = page.locator('[data-testid="module-card"]:has-text("Volatility")').first();
      await volModule.click();
      
      await page.locator('[data-testid="module-details"] button:has-text("Execute")').click();
      await page.waitForSelector('[data-testid="query-results"]');
      
      // Step 7: Copy relevant data from results
      const resultsText = await page.locator('[data-testid="query-results"]').textContent();
      
      // Step 8: Go to chat to discuss findings
      await page.click('text=Chat');
      
      // Step 9: Ask AI about the situation
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill(`ETH volatility spiked to 0.92. Based on historical patterns and my current position, should I reduce exposure?`);
      await chatInput.press('Enter');
      
      // Step 10: Wait for AI recommendation
      await page.waitForSelector('[data-testid="chat-message"][data-role="assistant"]:last-child', { timeout: 15000 });
      
      const aiRecommendation = await page.locator('[data-testid="chat-message"][data-role="assistant"]').last().textContent();
      expect(aiRecommendation).toMatch(/volatility|risk|position|recommendation/i);
      
      // Step 11: Follow up with specific action
      await chatInput.fill('Calculate the impact if I reduce my ETH position by 50%');
      await chatInput.press('Enter');
      
      await page.waitForSelector('[data-testid="chat-message"][data-role="assistant"]:nth-last-child(1)', { timeout: 15000 });
      
      // Step 12: View updated portfolio projections
      const projectionResponse = await page.locator('[data-testid="chat-message"][data-role="assistant"]').last().textContent();
      expect(projectionResponse).toMatch(/\$[\d,]+/); // Should show dollar amounts
      expect(projectionResponse).toMatch(/50%|half|reduce/i);
    });
  });

  test.describe('Performance Under Load', () => {
    test('system handles multiple concurrent operations', async ({ page }) => {
      // Step 1: Open multiple features simultaneously
      await page.goto('/');
      await waitForWebSocketConnection(page);
      
      // Step 2: Start multiple async operations
      const operations = [
        // Load portfolio data
        page.waitForResponse(resp => resp.url().includes('/api/portfolio/summary')),
        // Load volatility alerts
        page.waitForResponse(resp => resp.url().includes('/api/volatility/alerts')),
        // Load chat suggestions
        page.waitForResponse(resp => resp.url().includes('/api/chat/suggestions')),
        // Load SQL modules
        page.waitForResponse(resp => resp.url().includes('/api/modules')),
      ];
      
      // Navigate to trigger all loads
      await Promise.all([
        page.reload(), // Trigger all dashboard loads
        ...operations
      ]);
      
      // Step 3: Open chat in new tab
      const chatPage = await page.context().newPage();
      await chatPage.goto('/chat');
      
      // Step 4: Send multiple messages rapidly
      const messages = [
        'What is my total P&L?',
        'Show me volatility trends',
        'Which positions are risky?',
        'Analyze my portfolio diversity'
      ];
      
      for (const msg of messages) {
        await chatPage.locator('[data-testid="chat-input"]').fill(msg);
        await chatPage.locator('[data-testid="chat-input"]').press('Enter');
        await chatPage.waitForTimeout(100); // Small delay between messages
      }
      
      // Step 5: Execute SQL queries while chat is processing
      const modulesPage = await page.context().newPage();
      await modulesPage.goto('/modules');
      
      // Execute multiple modules
      const moduleCards = modulesPage.locator('[data-testid="module-card"]');
      const moduleCount = await moduleCards.count();
      
      for (let i = 0; i < Math.min(3, moduleCount); i++) {
        await moduleCards.nth(i).click();
        await modulesPage.locator('[data-testid="module-details"] button:has-text("Execute")').click();
        await modulesPage.locator('[data-testid="close-modal"]').click();
        await modulesPage.waitForTimeout(100);
      }
      
      // Step 6: Verify all operations complete successfully
      // Check chat responses
      await chatPage.bringToFront();
      const chatMessages = chatPage.locator('[data-testid="chat-message"][data-role="assistant"]');
      await expect(chatMessages).toHaveCount(4, { timeout: 30000 });
      
      // Check main dashboard still responsive
      await page.bringToFront();
      await page.locator('[data-testid="refresh-portfolio"]').click();
      await page.waitForResponse(resp => resp.url().includes('/api/portfolio/summary'));
      
      // Verify no error states
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
      await expect(chatPage.locator('[data-testid="error-message"]')).not.toBeVisible();
      await expect(modulesPage.locator('[data-testid="error-message"]')).not.toBeVisible();
      
      // Close additional pages
      await chatPage.close();
      await modulesPage.close();
    });
  });

  test.describe('Data Consistency Journey', () => {
    test('ensures data consistency across UI, API, and WebSocket updates', async ({ page }) => {
      // Step 1: Load initial portfolio state
      await page.goto('/');
      await waitForWebSocketConnection(page);
      
      // Capture initial values
      const initialValue = await page.locator('[data-testid="total-value-card"] .value').textContent();
      const initialPnL = await page.locator('[data-testid="total-pnl-card"] .value').textContent();
      
      // Step 2: Simulate a trade via WebSocket
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ws-message', {
          detail: {
            type: 'all_trades',
            data: {
              symbol: 'BTC-USD',
              side: 'buy',
              quantity: 0.1,
              price: 48500,
              timestamp: new Date().toISOString()
            }
          }
        }));
      });
      
      // Step 3: Wait for UI update
      await page.waitForTimeout(1000);
      
      // Step 4: Verify portfolio values updated
      const updatedValue = await page.locator('[data-testid="total-value-card"] .value').textContent();
      expect(updatedValue).not.toBe(initialValue);
      
      // Step 5: Navigate to chat and verify context
      await page.click('text=Chat');
      await page.locator('[data-testid="chat-input"]').fill('What was my last trade?');
      await page.locator('[data-testid="chat-input"]').press('Enter');
      
      await page.waitForSelector('[data-testid="chat-message"][data-role="assistant"]');
      const response = await page.locator('[data-testid="chat-message"][data-role="assistant"]').last().textContent();
      
      // Should mention the recent BTC trade
      expect(response).toMatch(/BTC|bitcoin/i);
      expect(response).toMatch(/0\.1|48500|buy/i);
      
      // Step 6: Check SQL query reflects updated data
      await page.click('text=Modules');
      
      // Find and execute recent trades module
      const tradesModule = page.locator('[data-testid="module-card"]:has-text("Recent Trades")');
      await tradesModule.click();
      await page.locator('button:has-text("Execute")').click();
      
      await page.waitForSelector('[data-testid="results-table"]');
      const resultsTable = page.locator('[data-testid="results-table"]');
      
      // Verify the trade appears in results
      await expect(resultsTable).toContainText('BTC-USD');
      await expect(resultsTable).toContainText('0.1');
      
      // Step 7: Return to dashboard and verify consistency
      await page.click('text=Dashboard');
      
      // Force refresh to get latest from API
      await page.locator('[data-testid="refresh-portfolio"]').click();
      await page.waitForResponse(resp => resp.url().includes('/api/portfolio/summary'));
      
      // Final value should match WebSocket-updated value
      const finalValue = await page.locator('[data-testid="total-value-card"] .value').textContent();
      expect(finalValue).toBe(updatedValue);
    });
  });
});