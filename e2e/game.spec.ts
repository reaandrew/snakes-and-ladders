import { test, expect } from '@playwright/test';

test.describe('Snakes and Ladders Game', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display home screen with create and join buttons', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Create Game' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Join Game' })).toBeVisible();
  });

  test('should create a game and show waiting room', async ({ page }) => {
    await page.goto('/');

    // Click Create Game
    await page.getByRole('button', { name: 'Create Game' }).click();

    // Fill in player name
    await page.getByPlaceholder('Enter your name').fill('TestCreator');

    // Click Create Game button
    await page.getByRole('button', { name: 'Create Game' }).click();

    // Should show waiting room with game code
    await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Game Code:')).toBeVisible();

    // Should show the creator in the player list
    await expect(page.getByText('TestCreator')).toBeVisible();

    // Should show waiting for players message (not enough to start)
    await expect(page.getByRole('button', { name: 'Waiting for players...' })).toBeVisible();
  });

  test('should persist session and reconnect after page refresh', async ({ page }) => {
    await page.goto('/');

    // Create a game
    await page.getByRole('button', { name: 'Create Game' }).click();
    await page.getByPlaceholder('Enter your name').fill('RefreshTest');
    await page.getByRole('button', { name: 'Create Game' }).click();

    // Wait for waiting room
    await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 10000 });

    // Get the game code
    const gameCodeElement = await page.locator('.text-game-primary').textContent();
    const gameCode = gameCodeElement?.trim();

    // Refresh the page
    await page.reload();

    // Should show reconnecting message
    await expect(page.getByText('Reconnecting to game...')).toBeVisible({ timeout: 5000 });

    // Should return to waiting room with same game code
    await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(gameCode!)).toBeVisible();
    await expect(page.getByText('RefreshTest')).toBeVisible();
  });

  test('should not allow empty player name', async ({ page }) => {
    await page.goto('/');

    // Click Create Game
    await page.getByRole('button', { name: 'Create Game' }).click();

    // Leave name empty and try to create
    const createButton = page.getByRole('button', { name: 'Create Game' });
    await expect(createButton).toBeDisabled();

    // Type spaces only
    await page.getByPlaceholder('Enter your name').fill('   ');
    await expect(createButton).toBeDisabled();

    // Type valid name
    await page.getByPlaceholder('Enter your name').fill('ValidName');
    await expect(createButton).toBeEnabled();
  });

  test('should allow leaving game and returning home', async ({ page }) => {
    await page.goto('/');

    // Create a game
    await page.getByRole('button', { name: 'Create Game' }).click();
    await page.getByPlaceholder('Enter your name').fill('LeaveTest');
    await page.getByRole('button', { name: 'Create Game' }).click();

    // Wait for waiting room
    await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 10000 });

    // Click Leave Game
    await page.getByRole('button', { name: 'Leave Game' }).click();

    // Should return to home screen
    await expect(page.getByRole('button', { name: 'Create Game' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Join Game' })).toBeVisible();
  });

  test('should show join game form', async ({ page }) => {
    await page.goto('/');

    // Click Join Game
    await page.getByRole('button', { name: 'Join Game' }).click();

    // Should show join form
    await expect(page.getByRole('heading', { name: 'Join Game' })).toBeVisible();
    await expect(page.getByPlaceholder('Enter your name')).toBeVisible();
    await expect(page.getByPlaceholder('Enter game code')).toBeVisible();

    // Join button should be disabled without input
    await expect(page.getByRole('button', { name: 'Join Game' })).toBeDisabled();
  });

  test('should show error for invalid game code', async ({ page }) => {
    await page.goto('/');

    // Click Join Game
    await page.getByRole('button', { name: 'Join Game' }).click();

    // Fill in details with invalid code
    await page.getByPlaceholder('Enter your name').fill('JoinTest');
    await page.getByPlaceholder('Enter game code').fill('XXXXXX');

    // Click Join
    await page.getByRole('button', { name: 'Join Game' }).click();

    // Should show error
    await expect(page.getByText('Game not found')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Multiplayer Game Flow', () => {
  test('two players can join and creator can start game', async ({ browser }) => {
    // Create two browser contexts for two players
    const creatorContext = await browser.newContext();
    const joinerContext = await browser.newContext();

    const creatorPage = await creatorContext.newPage();
    const joinerPage = await joinerContext.newPage();

    try {
      // Clear localStorage for both
      await creatorPage.goto('/');
      await creatorPage.evaluate(() => localStorage.clear());
      await creatorPage.reload();

      await joinerPage.goto('/');
      await joinerPage.evaluate(() => localStorage.clear());
      await joinerPage.reload();

      // Creator creates game
      await creatorPage.getByRole('button', { name: 'Create Game' }).click();
      await creatorPage.getByPlaceholder('Enter your name').fill('Creator');
      await creatorPage.getByRole('button', { name: 'Create Game' }).click();

      // Wait for waiting room
      await expect(creatorPage.getByText('Waiting Room')).toBeVisible({ timeout: 10000 });

      // Get the game code
      const gameCodeElement = await creatorPage.locator('.text-game-primary').textContent();
      const gameCode = gameCodeElement?.trim();
      expect(gameCode).toBeTruthy();

      // Joiner joins the game
      await joinerPage.getByRole('button', { name: 'Join Game' }).click();
      await joinerPage.getByPlaceholder('Enter your name').fill('Joiner');
      await joinerPage.getByPlaceholder('Enter game code').fill(gameCode!);
      await joinerPage.getByRole('button', { name: 'Join Game' }).click();

      // Joiner should see waiting room
      await expect(joinerPage.getByText('Waiting Room')).toBeVisible({ timeout: 10000 });
      await expect(joinerPage.getByText('Creator')).toBeVisible();
      await expect(joinerPage.getByText('Joiner')).toBeVisible();

      // Creator should see both players
      await expect(creatorPage.getByText('Creator')).toBeVisible();
      await expect(creatorPage.getByText('Joiner')).toBeVisible({ timeout: 5000 });

      // Creator should now be able to start game
      const startButton = creatorPage.getByRole('button', { name: 'Start Game' });
      await expect(startButton).toBeEnabled({ timeout: 5000 });

      // Joiner should see waiting message
      await expect(joinerPage.getByText('Waiting for host to start the game...')).toBeVisible();

      // Start the game
      await startButton.click();

      // Both should see the game board (look for canvas element which is the board)
      await expect(creatorPage.locator('canvas')).toBeVisible({ timeout: 10000 });
      await expect(joinerPage.locator('canvas')).toBeVisible({ timeout: 10000 });
    } finally {
      await creatorContext.close();
      await joinerContext.close();
    }
  });

  test('player should not see duplicate of themselves', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Create a game
    await page.getByRole('button', { name: 'Create Game' }).click();
    await page.getByPlaceholder('Enter your name').fill('UniquePlayer');
    await page.getByRole('button', { name: 'Create Game' }).click();

    // Wait for waiting room
    await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 10000 });

    // Verify there's exactly 1 player in the list (check the header which shows count)
    await expect(page.getByText('Players (1)')).toBeVisible({ timeout: 5000 });

    // Verify the player name appears exactly once
    const playerNameElements = page.locator('li').filter({ hasText: 'UniquePlayer' });
    await expect(playerNameElements).toHaveCount(1);
  });
});
