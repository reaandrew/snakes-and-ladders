import { test, expect } from '@playwright/test';

test.describe('Player Identity', () => {
  test("each player controls their own piece, not the other player's", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      // Clear sessions
      await pageA.goto('/');
      await pageA.evaluate(() => localStorage.clear());
      await pageA.reload();

      await pageB.goto('/');
      await pageB.evaluate(() => localStorage.clear());
      await pageB.reload();

      // Player A creates game
      await pageA.getByRole('button', { name: 'Create Game' }).click();
      await pageA.getByPlaceholder('Enter your name').fill('Alice');
      await pageA.getByRole('button', { name: 'Create Game' }).click();

      await expect(pageA.getByText('Waiting Room')).toBeVisible({ timeout: 10000 });

      // Get game code
      const gameCode = (await pageA.locator('.text-game-primary').textContent())?.trim();
      expect(gameCode).toBeTruthy();

      // Player B joins
      await pageB.getByRole('button', { name: 'Join Game' }).click();
      await pageB.getByPlaceholder('Enter your name').fill('Bob');
      await pageB.getByPlaceholder('Enter game code').fill(gameCode!);
      await pageB.getByRole('button', { name: 'Join Game' }).click();

      await expect(pageB.getByText('Waiting Room')).toBeVisible({ timeout: 10000 });

      // Verify both players see each other
      await expect(pageA.getByText('Bob')).toBeVisible({ timeout: 5000 });
      await expect(pageB.getByText('Alice')).toBeVisible({ timeout: 5000 });

      // Verify "(you)" indicator is correct on EACH page
      // Player A should see "Alice" with "(you)", NOT "Bob" with "(you)"
      const aliceItemOnA = pageA
        .locator('[data-testid="player-list-item"]')
        .filter({ hasText: 'Alice' });
      await expect(aliceItemOnA.getByText('(you)')).toBeVisible();

      const bobItemOnA = pageA
        .locator('[data-testid="player-list-item"]')
        .filter({ hasText: 'Bob' });
      await expect(bobItemOnA.getByText('(you)')).not.toBeVisible();

      // Player B should see "Bob" with "(you)", NOT "Alice" with "(you)"
      const bobItemOnB = pageB
        .locator('[data-testid="player-list-item"]')
        .filter({ hasText: 'Bob' });
      await expect(bobItemOnB.getByText('(you)')).toBeVisible();

      const aliceItemOnB = pageB
        .locator('[data-testid="player-list-item"]')
        .filter({ hasText: 'Alice' });
      await expect(aliceItemOnB.getByText('(you)')).not.toBeVisible();

      // Start game
      const startButton = pageA.getByRole('button', { name: 'Start Game' });
      await expect(startButton).toBeEnabled({ timeout: 5000 });
      await startButton.click();

      // Both should see game board
      await expect(pageA.locator('canvas')).toBeVisible({ timeout: 10000 });
      await expect(pageB.locator('canvas')).toBeVisible({ timeout: 10000 });

      // After game starts, "(you)" identity should still be correct
      // Re-check on game board view (player list is in sidebar on desktop)
      const aliceOnBoardA = pageA
        .locator('[data-testid="player-list-item"]')
        .filter({ hasText: 'Alice' });
      const bobOnBoardA = pageA
        .locator('[data-testid="player-list-item"]')
        .filter({ hasText: 'Bob' });

      // If player list is visible on this viewport, verify identity persists
      if (await aliceOnBoardA.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(aliceOnBoardA.getByText('(you)')).toBeVisible();
        await expect(bobOnBoardA.getByText('(you)')).not.toBeVisible();
      }

      const bobOnBoardB = pageB
        .locator('[data-testid="player-list-item"]')
        .filter({ hasText: 'Bob' });
      const aliceOnBoardB = pageB
        .locator('[data-testid="player-list-item"]')
        .filter({ hasText: 'Alice' });

      if (await bobOnBoardB.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(bobOnBoardB.getByText('(you)')).toBeVisible();
        await expect(aliceOnBoardB.getByText('(you)')).not.toBeVisible();
      }
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test('player identity survives page refresh during game', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      // Clear sessions
      await pageA.goto('/');
      await pageA.evaluate(() => localStorage.clear());
      await pageA.reload();

      await pageB.goto('/');
      await pageB.evaluate(() => localStorage.clear());
      await pageB.reload();

      // Player A creates game
      await pageA.getByRole('button', { name: 'Create Game' }).click();
      await pageA.getByPlaceholder('Enter your name').fill('Alice');
      await pageA.getByRole('button', { name: 'Create Game' }).click();

      await expect(pageA.getByText('Waiting Room')).toBeVisible({ timeout: 10000 });

      const gameCode = (await pageA.locator('.text-game-primary').textContent())?.trim();
      expect(gameCode).toBeTruthy();

      // Player B joins
      await pageB.getByRole('button', { name: 'Join Game' }).click();
      await pageB.getByPlaceholder('Enter your name').fill('Bob');
      await pageB.getByPlaceholder('Enter game code').fill(gameCode!);
      await pageB.getByRole('button', { name: 'Join Game' }).click();

      await expect(pageB.getByText('Waiting Room')).toBeVisible({ timeout: 10000 });

      // Start game
      await expect(pageA.getByRole('button', { name: 'Start Game' })).toBeEnabled({
        timeout: 5000,
      });
      await pageA.getByRole('button', { name: 'Start Game' }).click();

      await expect(pageA.locator('canvas')).toBeVisible({ timeout: 10000 });
      await expect(pageB.locator('canvas')).toBeVisible({ timeout: 10000 });

      // Player B refreshes the page
      await pageB.reload();

      // Should reconnect
      await expect(pageB.getByText('Reconnecting to game...')).toBeVisible({ timeout: 5000 });
      await expect(pageB.locator('canvas')).toBeVisible({ timeout: 15000 });

      // After reconnect, verify identity is still correct
      const bobAfterRefresh = pageB
        .locator('[data-testid="player-list-item"]')
        .filter({ hasText: 'Bob' });
      const aliceAfterRefresh = pageB
        .locator('[data-testid="player-list-item"]')
        .filter({ hasText: 'Alice' });

      if (await bobAfterRefresh.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Bob should still be "(you)" — not swapped to Alice
        await expect(bobAfterRefresh.getByText('(you)')).toBeVisible();
        await expect(aliceAfterRefresh.getByText('(you)')).not.toBeVisible();
      }
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});
