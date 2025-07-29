import { test, expect, Page } from '@playwright/test';

// Helper to create a multi-level branch structure
async function createBranchStructure(page: Page) {
  // Create root conversation
  await page.goto('/chat');
  await page.fill('[data-testid="chat-input"]', 'Root: Portfolio analysis');
  await page.keyboard.press('Enter');
  await page.waitForResponse(/\/api\/chat\/send/);
  await page.waitForTimeout(1000);

  // Get root conversation ID
  const rootUrl = page.url();
  const rootId = parseInt(rootUrl.match(/\/chat\/(\d+)/)?.[1] || '0');

  // Create first branch
  const rootMessage = page.locator('[data-testid="chat-message"]').filter({ 
    hasText: 'Root: Portfolio analysis' 
  });
  await rootMessage.hover();
  await rootMessage.locator('button:has-text("Branch")').click();
  await page.fill('input[placeholder*="Alternative approach"]', 'Branch A: Risk Focus');
  await page.click('button:has-text("Create Branch")');
  await page.waitForURL(/\/chat\/\d+/);
  
  // Add message to Branch A
  await page.fill('[data-testid="chat-input"]', 'Branch A: Show risk metrics');
  await page.keyboard.press('Enter');
  await page.waitForResponse(/\/api\/chat\/send/);
  const branchAId = parseInt(page.url().match(/\/chat\/(\d+)/)?.[1] || '0');

  // Create sub-branch from Branch A
  const branchAMessage = page.locator('[data-testid="chat-message"]').filter({ 
    hasText: 'Branch A: Show risk metrics' 
  });
  await branchAMessage.hover();
  await branchAMessage.locator('button:has-text("Branch")').click();
  await page.fill('input[placeholder*="Alternative approach"]', 'Branch A.1: VaR Analysis');
  await page.click('button:has-text("Create Branch")');
  await page.waitForURL(/\/chat\/\d+/);
  const branchA1Id = parseInt(page.url().match(/\/chat\/(\d+)/)?.[1] || '0');

  // Go back to root and create second branch
  await page.goto(`/chat/${rootId}`);
  await rootMessage.hover();
  await rootMessage.locator('button:has-text("Branch")').click();
  await page.fill('input[placeholder*="Alternative approach"]', 'Branch B: Performance Focus');
  await page.click('button:has-text("Create Branch")');
  await page.waitForURL(/\/chat\/\d+/);
  const branchBId = parseInt(page.url().match(/\/chat\/(\d+)/)?.[1] || '0');

  return {
    rootId,
    branchAId,
    branchA1Id,
    branchBId
  };
}

test.describe('Advanced Branch Features', () => {
  test.describe('Complex Branch Navigation', () => {
    test('should handle deep branch hierarchies', async ({ page }) => {
      const { rootId, branchAId, branchA1Id, branchBId } = await createBranchStructure(page);

      // Navigate to deepest branch
      await page.goto(`/chat/${branchA1Id}`);
      await page.waitForLoadState('networkidle');

      // Breadcrumb should show full path
      const breadcrumb = page.locator('[data-testid="branch-breadcrumb"]');
      await expect(breadcrumb).toBeVisible();
      await expect(breadcrumb).toContainText('Chat');
      await expect(breadcrumb).toContainText('Branch A: Risk Focus');
      await expect(breadcrumb).toContainText('Branch A.1: VaR Analysis');

      // Branch level indicator should show correct depth
      await expect(breadcrumb).toContainText('Branch level: 2');

      // Navigate up the hierarchy using breadcrumb
      await breadcrumb.locator('text=Branch A: Risk Focus').click();
      await expect(page).toHaveURL(`/chat/${branchAId}`);
      
      // Verify correct messages are shown
      await expect(page.locator('text=Root: Portfolio analysis')).toBeVisible();
      await expect(page.locator('text=Branch A: Show risk metrics')).toBeVisible();
      await expect(page.locator('text=Branch A.1: VaR Analysis')).not.toBeVisible();
    });

    test('should maintain conversation context when switching branches', async ({ page }) => {
      const { rootId, branchAId, branchBId } = await createBranchStructure(page);

      // Add unique message to Branch B
      await page.goto(`/chat/${branchBId}`);
      await page.fill('[data-testid="chat-input"]', 'Branch B: Unique performance metric');
      await page.keyboard.press('Enter');
      await page.waitForResponse(/\/api\/chat\/send/);

      // Switch to Branch A using switcher
      const branchSwitcher = page.locator('[data-testid="branch-switcher"]');
      await branchSwitcher.click();
      await page.click('text=Branch A: Risk Focus');
      await page.waitForURL(`/chat/${branchAId}`);

      // Branch B's unique message should not be visible
      await expect(page.locator('text=Branch B: Unique performance metric')).not.toBeVisible();
      
      // Branch A's messages should be visible
      await expect(page.locator('text=Branch A: Show risk metrics')).toBeVisible();

      // Switch back to Branch B
      await branchSwitcher.click();
      await page.click('text=Branch B: Performance Focus');
      await page.waitForURL(`/chat/${branchBId}`);

      // Branch B's unique message should be visible again
      await expect(page.locator('text=Branch B: Unique performance metric')).toBeVisible();
    });
  });

  test.describe('Branch Search and Filtering', () => {
    test('should search across all branches in chat history', async ({ page }) => {
      await createBranchStructure(page);

      // Go to chat history
      await page.goto('/chat-history');
      await page.waitForLoadState('networkidle');

      // Search for "Risk"
      await page.fill('[data-testid="chat-search-input"]', 'Risk');
      await page.waitForTimeout(500); // Debounce

      // Should find Branch A
      await expect(page.locator('text=Branch A: Risk Focus')).toBeVisible();
      
      // Should not show Branch B
      await expect(page.locator('text=Branch B: Performance Focus')).not.toBeVisible();

      // Clear search and search for "Performance"
      await page.fill('[data-testid="chat-search-input"]', 'Performance');
      await page.waitForTimeout(500);

      // Should find Branch B
      await expect(page.locator('text=Branch B: Performance Focus')).toBeVisible();
      
      // Should not show Branch A
      await expect(page.locator('text=Branch A: Risk Focus')).not.toBeVisible();
    });

    test('should filter branches by date in tree view', async ({ page }) => {
      await createBranchStructure(page);

      // Go to chat history
      await page.goto('/chat-history');
      await page.waitForLoadState('networkidle');

      // Switch to tree view
      await page.click('button:has-text("Tree")');

      // All branches should be visible initially
      const treeView = page.locator('[data-testid="chat-history-tree"]');
      await expect(treeView).toContainText('Branch A: Risk Focus');
      await expect(treeView).toContainText('Branch B: Performance Focus');
      await expect(treeView).toContainText('Branch A.1: VaR Analysis');

      // Note: Add date filter controls to the UI and test them here
      // This is a placeholder for when date filtering is implemented
    });
  });

  test.describe('Branch Merge and Compare', () => {
    test('should compare messages between branches', async ({ page }) => {
      const { branchAId, branchBId } = await createBranchStructure(page);

      // Add similar questions to both branches
      await page.goto(`/chat/${branchAId}`);
      await page.fill('[data-testid="chat-input"]', 'What is the Sharpe ratio?');
      await page.keyboard.press('Enter');
      await page.waitForResponse(/\/api\/chat\/send/);

      await page.goto(`/chat/${branchBId}`);
      await page.fill('[data-testid="chat-input"]', 'What is the Sharpe ratio?');
      await page.keyboard.press('Enter');
      await page.waitForResponse(/\/api\/chat\/send/);

      // Go to chat history and open in graph view
      await page.goto('/chat-history');
      await page.click('button:has-text("Graph")');

      // Both branches should show they have the same question
      // This tests the visual representation of similar content across branches
      const graphNodes = page.locator('.react-flow__node');
      expect(await graphNodes.count()).toBeGreaterThan(2);
    });
  });

  test.describe('Branch Export and Import', () => {
    test('should export branch conversation', async ({ page }) => {
      const { branchAId } = await createBranchStructure(page);

      // Navigate to branch
      await page.goto(`/chat/${branchAId}`);
      
      // Open conversation menu (if implemented)
      // await page.click('[data-testid="conversation-menu"]');
      // await page.click('text=Export Conversation');

      // Verify export functionality when implemented
      // This is a placeholder for export feature testing
    });
  });

  test.describe('Branch Performance and Limits', () => {
    test('should handle branches with many messages', async ({ page }) => {
      // Create conversation
      await page.goto('/chat');
      await page.fill('[data-testid="chat-input"]', 'Start conversation');
      await page.keyboard.press('Enter');
      await page.waitForResponse(/\/api\/chat\/send/);
      await page.waitForTimeout(1000);

      // Send multiple messages
      for (let i = 1; i <= 5; i++) {
        await page.fill('[data-testid="chat-input"]', `Message ${i}`);
        await page.keyboard.press('Enter');
        await page.waitForResponse(/\/api\/chat\/send/);
      }

      // Create branch from middle message
      const middleMessage = page.locator('[data-testid="chat-message"]').filter({ 
        hasText: 'Message 3' 
      });
      await middleMessage.hover();
      await middleMessage.locator('button:has-text("Branch")').click();
      await page.fill('input[placeholder*="Alternative approach"]', 'Heavy Branch');
      await page.click('button:has-text("Create Branch")');
      await page.waitForURL(/\/chat\/\d+/);

      // Verify only messages up to branch point are copied
      await expect(page.locator('text=Message 1')).toBeVisible();
      await expect(page.locator('text=Message 2')).toBeVisible();
      await expect(page.locator('text=Message 3')).toBeVisible();
      await expect(page.locator('text=Message 4')).not.toBeVisible();
      await expect(page.locator('text=Message 5')).not.toBeVisible();

      // Add more messages to branch
      for (let i = 1; i <= 5; i++) {
        await page.fill('[data-testid="chat-input"]', `Branch message ${i}`);
        await page.keyboard.press('Enter');
        await page.waitForResponse(/\/api\/chat\/send/);
      }

      // Verify scrolling and performance
      const chatContainer = page.locator('[data-testid="chat-messages-container"]');
      await chatContainer.evaluate(node => node.scrollTop = node.scrollHeight);
      
      // Latest message should be visible
      await expect(page.locator('text=Branch message 5')).toBeVisible();
    });

    test('should limit branch creation depth', async ({ page, context }) => {
      // This test checks if there's a limit on how deep branches can go
      // Currently testing up to 5 levels deep
      
      await page.goto('/chat');
      let currentUrl = '';
      
      // Create nested branches
      for (let level = 0; level < 5; level++) {
        await page.fill('[data-testid="chat-input"]', `Level ${level} message`);
        await page.keyboard.press('Enter');
        await page.waitForResponse(/\/api\/chat\/send/);
        await page.waitForTimeout(1000);

        if (level < 4) { // Create branch for first 4 levels
          const message = page.locator('[data-testid="chat-message"]').filter({ 
            hasText: `Level ${level} message` 
          });
          await message.hover();
          await message.locator('button:has-text("Branch")').click();
          await page.fill('input[placeholder*="Alternative approach"]', `Level ${level + 1} Branch`);
          await page.click('button:has-text("Create Branch")');
          await page.waitForURL(/\/chat\/\d+/);
          currentUrl = page.url();
        }
      }

      // Verify we can still interact at deep levels
      await expect(page.locator('text=Level 4 message')).toBeVisible();
      
      // Breadcrumb should handle deep nesting
      const breadcrumb = page.locator('[data-testid="branch-breadcrumb"]');
      await expect(breadcrumb).toContainText('Branch level: 4');
    });
  });

  test.describe('Branch Collaboration Features', () => {
    test('should show real-time updates when branches are created', async ({ page, context }) => {
      // Create initial conversation
      await page.goto('/chat');
      await page.fill('[data-testid="chat-input"]', 'Collaboration test');
      await page.keyboard.press('Enter');
      await page.waitForResponse(/\/api\/chat\/send/);
      await page.waitForTimeout(1000);
      const convId = parseInt(page.url().match(/\/chat\/(\d+)/)?.[1] || '0');

      // Open second browser tab
      const page2 = await context.newPage();
      await page2.goto(`/chat/${convId}`);

      // Create branch in first tab
      const message = page.locator('[data-testid="chat-message"]').filter({ 
        hasText: 'Collaboration test' 
      });
      await message.hover();
      await message.locator('button:has-text("Branch")').click();
      await page.fill('input[placeholder*="Alternative approach"]', 'New Branch from Tab 1');
      await page.click('button:has-text("Create Branch")');
      await page.waitForURL(/\/chat\/\d+/);

      // Go back to original conversation
      await page.goto(`/chat/${convId}`);

      // Check if branch indicator updates in second tab
      // Note: This requires WebSocket or polling implementation
      await page2.reload(); // Simulate update check
      const message2 = page2.locator('[data-testid="chat-message"]').filter({ 
        hasText: 'Collaboration test' 
      });
      await message2.hover();
      await expect(message2.locator('text=/1 branch/')).toBeVisible();

      await page2.close();
    });
  });

  test.describe('Branch Analytics', () => {
    test('should show branch statistics in tree view', async ({ page }) => {
      const structure = await createBranchStructure(page);

      // Go to chat history
      await page.goto('/chat-history');
      await page.waitForLoadState('networkidle');

      // Switch to graph view
      await page.click('button:has-text("Graph")');

      // Nodes should show message counts
      const nodes = page.locator('.react-flow__node');
      
      // Verify each node shows statistics
      for (let i = 0; i < await nodes.count(); i++) {
        const node = nodes.nth(i);
        await expect(node.locator('text=/\d+ messages/')).toBeVisible();
      }

      // Hover over node for detailed stats (if implemented)
      await nodes.first().hover();
      // await expect(page.locator('[data-testid="node-tooltip"]')).toBeVisible();
    });
  });
});