import { test, expect, Page } from '@playwright/test';

// Helper functions
async function waitForAPIResponse(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse(response => 
    typeof urlPattern === 'string' 
      ? response.url().includes(urlPattern)
      : urlPattern.test(response.url())
  );
}

test.describe('UI Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Navigation', () => {
    test('should navigate between main pages', async ({ page }) => {
      // Check dashboard is loaded
      await expect(page).toHaveTitle(/Volatility Terminal/);
      
      // Navigate to Filter page
      await page.click('text=Filter');
      await expect(page).toHaveURL('/filter');
      await expect(page.locator('h1')).toContainText('Volatility Filter');
      
      // Navigate to Chat page
      await page.click('text=Chat');
      await expect(page).toHaveURL('/chat');
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      
      // Navigate to Modules page
      await page.click('text=Modules');
      await expect(page).toHaveURL('/modules');
      await expect(page.locator('h1')).toContainText('SQL Modules');
      
      // Navigate to Settings page
      await page.click('text=Settings');
      await expect(page).toHaveURL('/settings');
      await expect(page.locator('h1')).toContainText('Settings');
    });
  });

  test.describe('Dashboard', () => {
    test('should display portfolio summary', async ({ page }) => {
      // Wait for portfolio data to load
      const portfolioResponse = waitForAPIResponse(page, '/api/portfolio/summary');
      await page.goto('/');
      await portfolioResponse;
      
      // Check portfolio value cards
      await expect(page.locator('[data-testid="total-value-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-pnl-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="positions-count-card"]')).toBeVisible();
      
      // Verify values are displayed
      const totalValue = await page.locator('[data-testid="total-value-card"] .value').textContent();
      expect(totalValue).toMatch(/\$[\d,]+\.?\d*/);
    });

    test('should display real-time updates via WebSocket', async ({ page }) => {
      await page.goto('/');
      
      // Check WebSocket connection indicator
      await expect(page.locator('[data-testid="ws-status"]')).toHaveAttribute('data-connected', 'true');
      
      // Wait for real-time data
      await page.waitForTimeout(2000);
      
      // Verify real-time components are receiving updates
      await expect(page.locator('[data-testid="volatility-alerts"]')).toBeVisible();
      await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
    });

    test('should display news feed', async ({ page }) => {
      const newsResponse = waitForAPIResponse(page, '/api/news');
      await page.goto('/');
      await newsResponse;
      
      // Check news feed is loaded
      await expect(page.locator('[data-testid="news-feed"]')).toBeVisible();
      
      // Verify news items
      const newsItems = page.locator('[data-testid="news-item"]');
      await expect(newsItems).toHaveCount(3);
      
      // Check first news item structure
      const firstItem = newsItems.first();
      await expect(firstItem.locator('.news-title')).toBeVisible();
      await expect(firstItem.locator('.news-source')).toBeVisible();
      await expect(firstItem.locator('.news-time')).toBeVisible();
    });
  });

  test.describe('Chat Interface', () => {
    test('should send and receive messages', async ({ page }) => {
      await page.goto('/chat');
      
      // Type a message
      const input = page.locator('[data-testid="chat-input"]');
      await input.fill('What is my current portfolio performance?');
      
      // Send message
      const sendResponse = waitForAPIResponse(page, '/api/chat/send');
      await input.press('Enter');
      await sendResponse;
      
      // Check user message appears
      const userMessage = page.locator('[data-testid="chat-message"][data-role="user"]').last();
      await expect(userMessage).toContainText('What is my current portfolio performance?');
      
      // Check AI response appears
      const aiMessage = page.locator('[data-testid="chat-message"][data-role="assistant"]').last();
      await expect(aiMessage).toBeVisible();
      await expect(aiMessage).toContainText(/portfolio|performance|value/i);
    });

    test('should display suggested questions', async ({ page }) => {
      const suggestionsResponse = waitForAPIResponse(page, '/api/chat/suggestions');
      await page.goto('/chat');
      await suggestionsResponse;
      
      // Check suggestions are displayed
      const suggestions = page.locator('[data-testid="chat-suggestion"]');
      await expect(suggestions).toHaveCount(4);
      
      // Click a suggestion
      await suggestions.first().click();
      
      // Verify it populates the input
      const input = page.locator('[data-testid="chat-input"]');
      await expect(input).toHaveValue(/.+/);
    });

    test('should handle conversation branching', async ({ page }) => {
      await page.goto('/chat');
      
      // Send initial message
      const input = page.locator('[data-testid="chat-input"]');
      await input.fill('Analyze my BTC position');
      await input.press('Enter');
      
      // Wait for response
      await page.waitForSelector('[data-testid="chat-message"][data-role="assistant"]');
      
      // Click branch button on the message
      const branchBtn = page.locator('[data-testid="branch-message"]').first();
      await branchBtn.click();
      
      // Fill branch name
      const branchModal = page.locator('[data-testid="branch-modal"]');
      await expect(branchModal).toBeVisible();
      await branchModal.locator('input').fill('BTC Deep Dive');
      await branchModal.locator('button:has-text("Create")').click();
      
      // Verify branch was created
      await expect(page.locator('[data-testid="branch-indicator"]')).toBeVisible();
    });

    test('should navigate conversation history', async ({ page }) => {
      await page.goto('/chat-history');
      
      // Wait for conversations to load
      const conversationsResponse = waitForAPIResponse(page, '/api/chat/conversations');
      await conversationsResponse;
      
      // Check conversations are displayed
      const conversations = page.locator('[data-testid="conversation-item"]');
      await expect(conversations).toHaveCount(3);
      
      // Click on a conversation
      await conversations.first().click();
      
      // Verify navigation to chat with conversation loaded
      await expect(page).toHaveURL(/\/chat\/conv\d+/);
      await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(4);
    });
  });

  test.describe('Volatility Filter', () => {
    test('should display volatility surface', async ({ page }) => {
      const volResponse = waitForAPIResponse(page, '/api/volatility/surface/latest');
      await page.goto('/filter');
      await volResponse;
      
      // Check 3D surface is rendered
      await expect(page.locator('[data-testid="volatility-surface"]')).toBeVisible();
      
      // Check controls
      await expect(page.locator('[data-testid="symbol-select"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeframe-select"]')).toBeVisible();
    });

    test('should filter and display alerts', async ({ page }) => {
      await page.goto('/filter');
      
      // Wait for alerts to load
      const alertsResponse = waitForAPIResponse(page, '/api/volatility/alerts');
      await alertsResponse;
      
      // Check alerts table
      const alertsTable = page.locator('[data-testid="alerts-table"]');
      await expect(alertsTable).toBeVisible();
      
      // Verify alert rows
      const alertRows = alertsTable.locator('tbody tr');
      expect(await alertRows.count()).toBeGreaterThan(0);
      
      // Filter by symbol
      await page.locator('[data-testid="symbol-filter"]').selectOption('BTC-USD');
      
      // Verify filtered results
      const filteredRows = alertsTable.locator('tbody tr');
      for (const row of await filteredRows.all()) {
        await expect(row).toContainText('BTC-USD');
      }
    });
  });

  test.describe('SQL Modules', () => {
    test('should display and execute SQL modules', async ({ page }) => {
      await page.goto('/modules');
      
      // Wait for modules to load
      const modulesResponse = waitForAPIResponse(page, '/api/modules');
      await modulesResponse;
      
      // Check modules grid
      const moduleCards = page.locator('[data-testid="module-card"]');
      await expect(moduleCards).toHaveCount(4);
      
      // Click on a module
      await moduleCards.first().click();
      
      // Check module details modal
      const modal = page.locator('[data-testid="module-details"]');
      await expect(modal).toBeVisible();
      await expect(modal.locator('[data-testid="module-query"]')).toBeVisible();
      
      // Execute module
      const executeResponse = waitForAPIResponse(page, /\/api\/modules\/\d+\/execute/);
      await modal.locator('button:has-text("Execute")').click();
      await executeResponse;
      
      // Check results are displayed
      await expect(modal.locator('[data-testid="query-results"]')).toBeVisible();
      await expect(modal.locator('[data-testid="results-table"]')).toBeVisible();
    });

    test('should search and filter modules', async ({ page }) => {
      await page.goto('/modules');
      await page.waitForLoadState('networkidle');
      
      // Search for modules
      const searchInput = page.locator('[data-testid="module-search"]');
      await searchInput.fill('portfolio');
      
      // Wait for filtered results
      await page.waitForTimeout(500); // Debounce delay
      
      // Verify filtered modules
      const moduleCards = page.locator('[data-testid="module-card"]');
      const count = await moduleCards.count();
      expect(count).toBeGreaterThan(0);
      
      // All visible modules should contain 'portfolio'
      for (const card of await moduleCards.all()) {
        const text = await card.textContent();
        expect(text?.toLowerCase()).toContain('portfolio');
      }
    });

    test('should favorite/unfavorite modules', async ({ page }) => {
      await page.goto('/modules');
      await page.waitForLoadState('networkidle');
      
      // Find a non-favorited module
      const moduleCard = page.locator('[data-testid="module-card"]').first();
      const favoriteBtn = moduleCard.locator('[data-testid="favorite-btn"]');
      
      // Check initial state
      const initialFavorited = await favoriteBtn.getAttribute('data-favorited');
      
      // Toggle favorite
      await favoriteBtn.click();
      
      // Wait for update
      await page.waitForTimeout(500);
      
      // Verify state changed
      const newFavorited = await favoriteBtn.getAttribute('data-favorited');
      expect(newFavorited).not.toBe(initialFavorited);
    });
  });

  test.describe('Polymarket Integration', () => {
    test('should display market data', async ({ page }) => {
      const marketsResponse = waitForAPIResponse(page, '/api/polymarket/markets');
      await page.goto('/polymarket');
      await marketsResponse;
      
      // Check markets table
      await expect(page.locator('[data-testid="markets-table"]')).toBeVisible();
      
      // Verify market rows
      const marketRows = page.locator('[data-testid="market-row"]');
      expect(await marketRows.count()).toBeGreaterThan(0);
      
      // Check market details
      const firstMarket = marketRows.first();
      await expect(firstMarket.locator('[data-testid="market-name"]')).toBeVisible();
      await expect(firstMarket.locator('[data-testid="market-volume"]')).toBeVisible();
      await expect(firstMarket.locator('[data-testid="market-odds"]')).toBeVisible();
    });

    test('should search markets', async ({ page }) => {
      await page.goto('/polymarket');
      await page.waitForLoadState('networkidle');
      
      // Search for markets
      const searchInput = page.locator('[data-testid="market-search"]');
      await searchInput.fill('bitcoin');
      
      // Wait for search results
      const searchResponse = waitForAPIResponse(page, '/api/polymarket/markets?search=bitcoin');
      await searchInput.press('Enter');
      await searchResponse;
      
      // Verify filtered results
      const marketRows = page.locator('[data-testid="market-row"]');
      for (const row of await marketRows.all()) {
        const text = await row.textContent();
        expect(text?.toLowerCase()).toContain('bitcoin');
      }
    });
  });

  test.describe('Settings', () => {
    test('should update user preferences', async ({ page }) => {
      await page.goto('/settings');
      
      // Toggle theme
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      await themeToggle.click();
      
      // Verify theme changed
      const htmlElement = page.locator('html');
      const theme = await htmlElement.getAttribute('data-theme');
      expect(theme).toBe('dark');
      
      // Update notification preferences
      const notifToggle = page.locator('[data-testid="notifications-toggle"]');
      await notifToggle.click();
      
      // Save settings
      await page.locator('button:has-text("Save")').click();
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Intercept API call and return error
      await page.route('**/api/portfolio/summary', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      await page.goto('/');
      
      // Check error message is displayed
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/error|failed/i);
    });

    test('should handle WebSocket disconnection', async ({ page }) => {
      await page.goto('/');
      
      // Wait for initial connection
      await expect(page.locator('[data-testid="ws-status"]')).toHaveAttribute('data-connected', 'true');
      
      // Simulate WebSocket disconnection
      await page.evaluate(() => {
        // Close all WebSocket connections
        const sockets = (window as any).__websockets || [];
        sockets.forEach((ws: WebSocket) => ws.close());
      });
      
      // Check disconnection indicator
      await expect(page.locator('[data-testid="ws-status"]')).toHaveAttribute('data-connected', 'false');
      
      // Verify reconnection attempt
      await page.waitForTimeout(3000);
      await expect(page.locator('[data-testid="ws-status"]')).toHaveAttribute('data-connected', 'true');
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      // Check mobile menu
      const menuButton = page.locator('[data-testid="mobile-menu-btn"]');
      await expect(menuButton).toBeVisible();
      
      // Open mobile menu
      await menuButton.click();
      
      // Check navigation items
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
      
      // Navigate to chat
      await page.locator('[data-testid="mobile-nav"] text=Chat').click();
      await expect(page).toHaveURL('/chat');
      
      // Check chat interface adapts to mobile
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      const chatWidth = await page.locator('[data-testid="chat-interface"]').boundingBox();
      expect(chatWidth?.width).toBeLessThanOrEqual(375);
    });

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      
      // Check layout adapts
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      
      // Verify grid layout
      const portfolioCards = page.locator('[data-testid="portfolio-card"]');
      const firstCard = await portfolioCards.first().boundingBox();
      const secondCard = await portfolioCards.nth(1).boundingBox();
      
      // Cards should be in a row on tablet
      expect(firstCard?.y).toBe(secondCard?.y);
    });
  });
});