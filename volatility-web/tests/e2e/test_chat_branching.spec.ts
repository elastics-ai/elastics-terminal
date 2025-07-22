import { test, expect, Page } from '@playwright/test';

// Helper functions
async function waitForAPIResponse(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse(response => 
    typeof urlPattern === 'string' 
      ? response.url().includes(urlPattern)
      : urlPattern.test(response.url())
  );
}

async function createConversationWithMessages(page: Page, messages: string[]) {
  // Navigate to chat page
  await page.goto('/chat');
  await page.waitForLoadState('networkidle');

  // Send messages
  for (const message of messages) {
    await page.fill('[data-testid="chat-input"]', message);
    await page.keyboard.press('Enter');
    
    // Wait for assistant response
    await waitForAPIResponse(page, '/api/chat/send');
    await page.waitForSelector(`text=${message}`, { timeout: 10000 });
  }

  // Wait for conversation to be saved
  await page.waitForTimeout(1000);
  
  // Get conversation ID from URL if redirected
  const url = page.url();
  const match = url.match(/\/chat\/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

test.describe('Chat Branching Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Branch Creation', () => {
    test('should create a branch from a message', async ({ page }) => {
      // Create a conversation with multiple messages
      const conversationId = await createConversationWithMessages(page, [
        'What is my portfolio performance?',
        'Show me my top positions',
        'Analyze AAPL volatility'
      ]);

      expect(conversationId).toBeTruthy();

      // Find the second user message and hover over it
      const secondMessage = page.locator('[data-testid="chat-message"]').filter({ 
        hasText: 'Show me my top positions' 
      });
      await secondMessage.hover();

      // Click the branch button
      const branchButton = secondMessage.locator('button:has-text("Branch")');
      await expect(branchButton).toBeVisible();
      await branchButton.click();

      // Branch creation modal should appear
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal).toContainText('Create Branch');

      // Fill in branch details
      await page.fill('input[placeholder*="Alternative approach"]', 'Risk Analysis Branch');
      await page.fill('textarea[placeholder*="Add notes"]', 'Exploring risk metrics instead of positions');

      // Create the branch
      const branchResponse = waitForAPIResponse(page, '/api/chat/conversations');
      await page.click('button:has-text("Create Branch")');
      await branchResponse;

      // Should navigate to new branch
      await page.waitForURL(/\/chat\/\d+/);
      const newUrl = page.url();
      const newConversationId = parseInt(newUrl.match(/\/chat\/(\d+)/)[1]);
      
      expect(newConversationId).not.toBe(conversationId);

      // Verify branch indicator is shown
      await expect(page.locator('text=This is a branched conversation')).toBeVisible();
      
      // Verify messages up to branch point are copied
      await expect(page.locator('text=What is my portfolio performance?')).toBeVisible();
      await expect(page.locator('text=Show me my top positions')).toBeVisible();
      
      // Original third message should not be present
      await expect(page.locator('text=Analyze AAPL volatility')).not.toBeVisible();
    });

    test('should show branch count on messages with branches', async ({ page }) => {
      // Create a conversation
      const conversationId = await createConversationWithMessages(page, [
        'What are my current positions?',
        'Show risk metrics'
      ]);

      // Create a branch from first message
      const firstMessage = page.locator('[data-testid="chat-message"]').filter({ 
        hasText: 'What are my current positions?' 
      });
      await firstMessage.hover();
      await firstMessage.locator('button:has-text("Branch")').click();

      await page.fill('input[placeholder*="Alternative approach"]', 'Branch 1');
      await page.click('button:has-text("Create Branch")');
      await page.waitForURL(/\/chat\/\d+/);

      // Go back to original conversation
      await page.goto(`/chat/${conversationId}`);
      await page.waitForLoadState('networkidle');

      // Check that branch indicator shows on the message
      await firstMessage.hover();
      await expect(firstMessage.locator('text=/1 branch/')).toBeVisible();
    });

    test('should validate branch creation modal', async ({ page }) => {
      await createConversationWithMessages(page, ['Test message']);

      // Open branch modal
      const message = page.locator('[data-testid="chat-message"]').filter({ 
        hasText: 'Test message' 
      });
      await message.hover();
      await message.locator('button:has-text("Branch")').click();

      // Try to create without title
      const createButton = page.locator('button:has-text("Create Branch")');
      await expect(createButton).toBeDisabled();

      // Add title
      await page.fill('input[placeholder*="Alternative approach"]', 'Valid Branch Title');
      await expect(createButton).toBeEnabled();

      // Cancel should close modal
      await page.click('button:has-text("Cancel")');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });
  });

  test.describe('Branch Navigation', () => {
    test('should navigate between branches using branch switcher', async ({ page }) => {
      // Create main conversation
      const mainConvId = await createConversationWithMessages(page, [
        'Main conversation message 1',
        'Main conversation message 2'
      ]);

      // Create first branch
      const firstMessage = page.locator('[data-testid="chat-message"]').filter({ 
        hasText: 'Main conversation message 1' 
      });
      await firstMessage.hover();
      await firstMessage.locator('button:has-text("Branch")').click();
      await page.fill('input[placeholder*="Alternative approach"]', 'First Branch');
      await page.click('button:has-text("Create Branch")');
      await page.waitForURL(/\/chat\/\d+/);
      const branch1Id = parseInt(page.url().match(/\/chat\/(\d+)/)[1]);

      // Send a message in branch
      await page.fill('[data-testid="chat-input"]', 'Branch 1 specific message');
      await page.keyboard.press('Enter');
      await waitForAPIResponse(page, '/api/chat/send');

      // Create second branch from same point
      await page.goto(`/chat/${mainConvId}`);
      await firstMessage.hover();
      await firstMessage.locator('button:has-text("Branch")').click();
      await page.fill('input[placeholder*="Alternative approach"]', 'Second Branch');
      await page.click('button:has-text("Create Branch")');
      await page.waitForURL(/\/chat\/\d+/);
      const branch2Id = parseInt(page.url().match(/\/chat\/(\d+)/)[1]);

      // Branch switcher should be visible
      const branchSwitcher = page.locator('[data-testid="branch-switcher"]');
      await expect(branchSwitcher).toBeVisible();

      // Click to open dropdown
      await branchSwitcher.click();
      
      // Should see all branches
      await expect(page.locator('text=First Branch')).toBeVisible();
      await expect(page.locator('text=Second Branch')).toBeVisible();

      // Switch to first branch
      await page.click('text=First Branch');
      await page.waitForURL(`/chat/${branch1Id}`);
      
      // Verify branch-specific content
      await expect(page.locator('text=Branch 1 specific message')).toBeVisible();
    });

    test('should show branch breadcrumb navigation', async ({ page }) => {
      // Create nested branches
      const mainConvId = await createConversationWithMessages(page, ['Root message']);

      // Create first level branch
      const rootMessage = page.locator('[data-testid="chat-message"]').filter({ 
        hasText: 'Root message' 
      });
      await rootMessage.hover();
      await rootMessage.locator('button:has-text("Branch")').click();
      await page.fill('input[placeholder*="Alternative approach"]', 'Level 1 Branch');
      await page.click('button:has-text("Create Branch")');
      await page.waitForURL(/\/chat\/\d+/);

      // Send message in first branch
      await page.fill('[data-testid="chat-input"]', 'Level 1 message');
      await page.keyboard.press('Enter');
      await waitForAPIResponse(page, '/api/chat/send');

      // Create second level branch
      const level1Message = page.locator('[data-testid="chat-message"]').filter({ 
        hasText: 'Level 1 message' 
      });
      await level1Message.hover();
      await level1Message.locator('button:has-text("Branch")').click();
      await page.fill('input[placeholder*="Alternative approach"]', 'Level 2 Branch');
      await page.click('button:has-text("Create Branch")');
      await page.waitForURL(/\/chat\/\d+/);

      // Check breadcrumb
      const breadcrumb = page.locator('[data-testid="branch-breadcrumb"]');
      await expect(breadcrumb).toBeVisible();
      await expect(breadcrumb).toContainText('Chat');
      await expect(breadcrumb).toContainText('Level 1 Branch');
      await expect(breadcrumb).toContainText('Level 2 Branch');

      // Navigate using breadcrumb
      await breadcrumb.locator('text=Level 1 Branch').click();
      await expect(page).toHaveURL(/\/chat\/\d+/);
      await expect(page.locator('text=Level 1 message')).toBeVisible();
    });
  });

  test.describe('Branch Tree Visualization', () => {
    test('should display conversation tree in chat history', async ({ page }) => {
      // Create a conversation with branches
      const mainConvId = await createConversationWithMessages(page, [
        'Main conversation',
        'Second message'
      ]);

      // Create multiple branches
      for (let i = 1; i <= 2; i++) {
        await page.goto(`/chat/${mainConvId}`);
        const message = page.locator('[data-testid="chat-message"]').filter({ 
          hasText: 'Main conversation' 
        });
        await message.hover();
        await message.locator('button:has-text("Branch")').click();
        await page.fill('input[placeholder*="Alternative approach"]', `Branch ${i}`);
        await page.click('button:has-text("Create Branch")');
        await page.waitForURL(/\/chat\/\d+/);
      }

      // Navigate to chat history
      await page.goto('/chat-history');
      await page.waitForLoadState('networkidle');

      // Switch to tree view
      await page.click('button:has-text("Tree")');
      
      // Tree should be visible
      const treeView = page.locator('[data-testid="chat-history-tree"]');
      await expect(treeView).toBeVisible();

      // Should show main conversation and branches
      await expect(treeView).toContainText('Main conversation');
      await expect(treeView).toContainText('Branch 1');
      await expect(treeView).toContainText('Branch 2');
    });

    test('should display interactive graph view', async ({ page }) => {
      // Create conversation with branches
      const mainConvId = await createConversationWithMessages(page, ['Root conversation']);

      // Create a branch
      const message = page.locator('[data-testid="chat-message"]').filter({ 
        hasText: 'Root conversation' 
      });
      await message.hover();
      await message.locator('button:has-text("Branch")').click();
      await page.fill('input[placeholder*="Alternative approach"]', 'Graph Branch');
      await page.click('button:has-text("Create Branch")');
      await page.waitForURL(/\/chat\/\d+/);

      // Navigate to chat history
      await page.goto('/chat-history');
      await page.waitForLoadState('networkidle');

      // Switch to graph view
      await page.click('button:has-text("Graph")');

      // Wait for graph to load
      const graphView = page.locator('.react-flow');
      await expect(graphView).toBeVisible();

      // Graph controls should be visible
      await expect(page.locator('.react-flow__controls')).toBeVisible();
      await expect(page.locator('.react-flow__minimap')).toBeVisible();

      // Click on a node to select it
      const node = page.locator('.react-flow__node').first();
      await node.click();

      // Should highlight selected node
      await expect(node).toHaveClass(/ring-2/);
    });
  });

  test.describe('Floating Chat Branch Integration', () => {
    test('should create branch from floating chat', async ({ page }) => {
      // Open floating chat
      await page.click('[data-testid="floating-chat-button"]');
      
      const floatingChat = page.locator('[data-testid="floating-chat"]');
      await expect(floatingChat).toBeVisible();

      // Send a message
      await floatingChat.locator('[data-testid="chat-input"]').fill('Floating chat message');
      await floatingChat.locator('[data-testid="chat-input"]').press('Enter');
      await waitForAPIResponse(page, '/api/chat/send');

      // Save conversation
      await floatingChat.locator('button[aria-label="Chat menu"]').click();
      await page.click('text=Save Conversation');
      
      // Wait for save
      await waitForAPIResponse(page, '/api/chat/conversations');
      await expect(floatingChat).toContainText('Saved');

      // Hover over message and create branch
      const message = floatingChat.locator('[data-testid="chat-message"]').filter({ 
        hasText: 'Floating chat message' 
      });
      await message.hover();
      await message.locator('button:has-text("Branch")').click();

      // Fill branch modal
      await page.fill('input[placeholder*="Alternative approach"]', 'Floating Branch');
      await page.click('button:has-text("Create Branch")');

      // Should navigate to full chat with branch
      await page.waitForURL(/\/chat\/\d+/);
      await expect(page.locator('text=This is a branched conversation')).toBeVisible();
    });

    test('should open branched conversation in floating chat', async ({ page }) => {
      // Create a branched conversation
      const mainConvId = await createConversationWithMessages(page, ['Original message']);
      
      const message = page.locator('[data-testid="chat-message"]').filter({ 
        hasText: 'Original message' 
      });
      await message.hover();
      await message.locator('button:has-text("Branch")').click();
      await page.fill('input[placeholder*="Alternative approach"]', 'Test Branch');
      await page.click('button:has-text("Create Branch")');
      await page.waitForURL(/\/chat\/\d+/);
      const branchId = parseInt(page.url().match(/\/chat\/(\d+)/)[1]);

      // Go to chat history
      await page.goto('/chat-history');
      await page.waitForLoadState('networkidle');

      // Find the branch and open in floating chat
      const branchItem = page.locator('[data-testid="chat-history-item"]').filter({
        hasText: 'Test Branch'
      });
      await branchItem.locator('button[title="Open in floating chat"]').click();

      // Floating chat should open with branch
      const floatingChat = page.locator('[data-testid="floating-chat"]');
      await expect(floatingChat).toBeVisible();
      await expect(floatingChat).toContainText('Original message');
      await expect(floatingChat).toContainText('Test Branch');
    });
  });

  test.describe('Branch Permissions and Edge Cases', () => {
    test('should not allow branching from system messages', async ({ page }) => {
      await page.goto('/chat');
      
      // System message should be present
      const systemMessage = page.locator('[data-testid="chat-message"]').filter({
        hasText: 'How can I help you analyze your portfolio?'
      });
      
      await systemMessage.hover();
      
      // Branch button should not be visible for system messages
      await expect(systemMessage.locator('button:has-text("Branch")')).not.toBeVisible();
    });

    test('should handle branch creation failure gracefully', async ({ page }) => {
      // Create a conversation
      await createConversationWithMessages(page, ['Test message']);

      // Mock API failure
      await page.route('**/api/chat/conversations/*/branch', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' })
        });
      });

      // Try to create branch
      const message = page.locator('[data-testid="chat-message"]').filter({ 
        hasText: 'Test message' 
      });
      await message.hover();
      await message.locator('button:has-text("Branch")').click();
      await page.fill('input[placeholder*="Alternative approach"]', 'Failed Branch');
      await page.click('button:has-text("Create Branch")');

      // Should show error message
      await expect(page.locator('text=Error creating branch')).toBeVisible({ timeout: 5000 });
      
      // Modal should remain open
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    });

    test('should handle concurrent branch creation', async ({ page }) => {
      // Create a conversation
      const convId = await createConversationWithMessages(page, ['Base message']);

      // Open two tabs
      const page2 = await page.context().newPage();
      await page2.goto(`/chat/${convId}`);
      await page2.waitForLoadState('networkidle');

      // Start branch creation in both tabs
      const message1 = page.locator('[data-testid="chat-message"]').filter({ 
        hasText: 'Base message' 
      });
      const message2 = page2.locator('[data-testid="chat-message"]').filter({ 
        hasText: 'Base message' 
      });

      await message1.hover();
      await message1.locator('button:has-text("Branch")').click();
      
      await message2.hover();
      await message2.locator('button:has-text("Branch")').click();

      // Create branches in both tabs
      await page.fill('input[placeholder*="Alternative approach"]', 'Branch A');
      await page2.fill('input[placeholder*="Alternative approach"]', 'Branch B');

      await Promise.all([
        page.click('button:has-text("Create Branch")'),
        page2.click('button:has-text("Create Branch")')
      ]);

      // Both should succeed and navigate to different branches
      await page.waitForURL(/\/chat\/\d+/);
      await page2.waitForURL(/\/chat\/\d+/);

      const url1 = page.url();
      const url2 = page2.url();
      expect(url1).not.toBe(url2);

      await page2.close();
    });
  });
});