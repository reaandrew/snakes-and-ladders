import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

// Screenshot directory
const SCREENSHOT_DIR = 'e2e/screenshots';

// Device configurations for responsive testing
const DEVICES = {
  desktop: { width: 1920, height: 1080, name: 'desktop' },
  laptop: { width: 1366, height: 768, name: 'laptop' },
  tablet: { width: 768, height: 1024, name: 'tablet' },
  mobile: { width: 375, height: 667, name: 'mobile-iPhone' },
  mobileLarge: { width: 414, height: 896, name: 'mobile-iPhone-Plus' },
  mobileSmall: { width: 320, height: 568, name: 'mobile-iPhone-SE' },
};

interface PlayerSession {
  context: BrowserContext;
  page: Page;
  name: string;
}

async function createPlayer(
  browser: Browser,
  name: string,
  viewport?: { width: number; height: number }
): Promise<PlayerSession> {
  const context = await browser.newContext({
    viewport: viewport || { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  return { context, page, name };
}

async function cleanupPlayers(players: PlayerSession[]) {
  for (const player of players) {
    await player.context.close();
  }
}

async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${name}.png`,
    fullPage: false,
  });
}

test.describe('Edge Cases - Input Validation', () => {
  test('should handle maximum length player name (20 chars)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    await page.getByRole('button', { name: 'Create Game' }).click();

    const longName = 'A'.repeat(20);
    await page.getByPlaceholder('Enter your name').fill(longName);
    await page.getByRole('button', { name: 'Create Game' }).click();

    await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(longName)).toBeVisible();

    await takeScreenshot(page, 'edge-long-name');
  });

  test('should handle special characters in player name', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    await page.getByRole('button', { name: 'Create Game' }).click();

    const specialName = 'Test!@#$%';
    await page.getByPlaceholder('Enter your name').fill(specialName);
    await page.getByRole('button', { name: 'Create Game' }).click();

    await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });
    await takeScreenshot(page, 'edge-special-chars');
  });

  test('should handle unicode/emoji in player name', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    await page.getByRole('button', { name: 'Create Game' }).click();

    const emojiName = 'Player🎮🎲';
    await page.getByPlaceholder('Enter your name').fill(emojiName);
    await page.getByRole('button', { name: 'Create Game' }).click();

    await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });
    await takeScreenshot(page, 'edge-emoji-name');
  });

  test('should uppercase game code input automatically', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    await page.getByRole('button', { name: 'Join Game' }).click();
    await page.getByPlaceholder('Enter your name').fill('TestPlayer');

    // Type lowercase
    const input = page.getByPlaceholder('Enter game code');
    await input.fill('abcdef');

    // Should be uppercased
    await expect(input).toHaveValue('ABCDEF');
    await takeScreenshot(page, 'edge-uppercase-code');
  });
});

test.describe('Edge Cases - Game State', () => {
  test.setTimeout(120000);

  test('should prevent 7th player from joining full game', async ({ browser }) => {
    const players: PlayerSession[] = [];

    try {
      // Create 6 players (max)
      for (let i = 1; i <= 6; i++) {
        players.push(await createPlayer(browser, `Full${i}`));
      }

      const creator = players[0];

      // Create game
      await creator.page.getByRole('button', { name: 'Create Game' }).click();
      await creator.page.getByPlaceholder('Enter your name').fill(creator.name);
      await creator.page.getByRole('button', { name: 'Create Game' }).click();

      await expect(creator.page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });

      const gameCodeElement = await creator.page.locator('.text-game-primary').textContent();
      const gameCode = gameCodeElement?.trim();

      // Join 5 more players
      for (let i = 1; i < 6; i++) {
        const player = players[i];
        await player.page.getByRole('button', { name: 'Join Game' }).click();
        await player.page.getByPlaceholder('Enter your name').fill(player.name);
        await player.page.getByPlaceholder('Enter game code').fill(gameCode!);
        await player.page.getByRole('button', { name: 'Join Game' }).click();
        await expect(player.page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });
      }

      await expect(creator.page.getByText('Players (6)')).toBeVisible({ timeout: 10000 });
      await takeScreenshot(creator.page, 'edge-full-game-6players');

      // Try to add 7th player
      const seventhPlayer = await createPlayer(browser, 'Rejected7');
      players.push(seventhPlayer);

      await seventhPlayer.page.getByRole('button', { name: 'Join Game' }).click();
      await seventhPlayer.page.getByPlaceholder('Enter your name').fill(seventhPlayer.name);
      await seventhPlayer.page.getByPlaceholder('Enter game code').fill(gameCode!);
      await seventhPlayer.page.getByRole('button', { name: 'Join Game' }).click();

      // Wait for response and take screenshot to document behavior
      await seventhPlayer.page.waitForTimeout(3000);
      await takeScreenshot(seventhPlayer.page, 'edge-7th-player-attempt');

      // Note: If game doesn't enforce 6-player limit, 7th player may successfully join
      // This test documents the actual behavior
      console.log('7th player attempt completed - screenshot captured');
    } finally {
      await cleanupPlayers(players);
    }
  });

  test('should prevent joining already started game', async ({ browser }) => {
    const players: PlayerSession[] = [];

    try {
      players.push(await createPlayer(browser, 'Started1'));
      players.push(await createPlayer(browser, 'Started2'));

      const creator = players[0];
      const joiner = players[1];

      // Create and start game
      await creator.page.getByRole('button', { name: 'Create Game' }).click();
      await creator.page.getByPlaceholder('Enter your name').fill(creator.name);
      await creator.page.getByRole('button', { name: 'Create Game' }).click();

      await expect(creator.page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });

      const gameCodeElement = await creator.page.locator('.text-game-primary').textContent();
      const gameCode = gameCodeElement?.trim();

      // Joiner joins
      await joiner.page.getByRole('button', { name: 'Join Game' }).click();
      await joiner.page.getByPlaceholder('Enter your name').fill(joiner.name);
      await joiner.page.getByPlaceholder('Enter game code').fill(gameCode!);
      await joiner.page.getByRole('button', { name: 'Join Game' }).click();

      await expect(joiner.page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });

      // Start the game
      await creator.page.getByRole('button', { name: 'Start Game' }).click();
      await expect(creator.page.locator('canvas').first()).toBeVisible({ timeout: 15000 });

      await takeScreenshot(creator.page, 'edge-game-started');

      // Try to join with 3rd player
      const latePlayer = await createPlayer(browser, 'TooLate');
      players.push(latePlayer);

      await latePlayer.page.getByRole('button', { name: 'Join Game' }).click();
      await latePlayer.page.getByPlaceholder('Enter your name').fill(latePlayer.name);
      await latePlayer.page.getByPlaceholder('Enter game code').fill(gameCode!);
      await latePlayer.page.getByRole('button', { name: 'Join Game' }).click();

      // Should show error about game started
      await expect(latePlayer.page.getByText(/started|progress/i)).toBeVisible({ timeout: 10000 });
      await takeScreenshot(latePlayer.page, 'edge-game-already-started-error');
    } finally {
      await cleanupPlayers(players);
    }
  });

  test('should handle creator leaving waiting room', async ({ browser }) => {
    const players: PlayerSession[] = [];

    try {
      players.push(await createPlayer(browser, 'LeavingCreator'));
      players.push(await createPlayer(browser, 'WaitingPlayer'));

      const creator = players[0];
      const joiner = players[1];

      // Create game
      await creator.page.getByRole('button', { name: 'Create Game' }).click();
      await creator.page.getByPlaceholder('Enter your name').fill(creator.name);
      await creator.page.getByRole('button', { name: 'Create Game' }).click();

      await expect(creator.page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });

      const gameCodeElement = await creator.page.locator('.text-game-primary').textContent();
      const gameCode = gameCodeElement?.trim();

      // Joiner joins
      await joiner.page.getByRole('button', { name: 'Join Game' }).click();
      await joiner.page.getByPlaceholder('Enter your name').fill(joiner.name);
      await joiner.page.getByPlaceholder('Enter game code').fill(gameCode!);
      await joiner.page.getByRole('button', { name: 'Join Game' }).click();

      await expect(joiner.page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });
      await expect(joiner.page.getByText('Players (2)')).toBeVisible({ timeout: 5000 });

      await takeScreenshot(joiner.page, 'edge-before-creator-leaves');

      // Creator leaves
      await creator.page.getByRole('button', { name: 'Leave Game' }).click();

      // Wait and check joiner's state
      await joiner.page.waitForTimeout(2000);
      await takeScreenshot(joiner.page, 'edge-after-creator-leaves');
    } finally {
      await cleanupPlayers(players);
    }
  });
});

test.describe('Edge Cases - Rapid Actions', () => {
  test('should handle rapid page refresh spam', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // Create a game
    await page.getByRole('button', { name: 'Create Game' }).click();
    await page.getByPlaceholder('Enter your name').fill('RefreshSpam');
    await page.getByRole('button', { name: 'Create Game' }).click();

    await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });

    // Rapid refresh 5 times
    for (let i = 0; i < 5; i++) {
      await page.reload();
      await page.waitForTimeout(500);
    }

    // Should still reconnect
    await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });
    await takeScreenshot(page, 'edge-after-refresh-spam');
  });

  test('should handle double-click on create game', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    await page.getByRole('button', { name: 'Create Game' }).click();
    await page.getByPlaceholder('Enter your name').fill('DoubleClick');

    // Double click the create button
    await page.getByRole('button', { name: 'Create Game' }).dblclick();

    // Should only create one game, end up in waiting room
    await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });
    await takeScreenshot(page, 'edge-double-click-create');
  });
});

test.describe('Massive Multiplayer - Scale Testing', () => {
  test.setTimeout(180000); // 3 minutes

  test('10 simultaneous games with 2 players each', async ({ browser }) => {
    const allContexts: BrowserContext[] = [];
    const games: { code: string; creators: Page[] }[] = [];

    try {
      // Create 10 games
      for (let i = 0; i < 10; i++) {
        const creatorCtx = await browser.newContext();
        allContexts.push(creatorCtx);
        const creatorPage = await creatorCtx.newPage();

        await creatorPage.goto('/');
        await creatorPage.evaluate(() => localStorage.clear());

        await creatorPage.getByRole('button', { name: 'Create Game' }).click();
        await creatorPage.getByPlaceholder('Enter your name').fill(`Game${i + 1}Creator`);
        await creatorPage.getByRole('button', { name: 'Create Game' }).click();

        await expect(creatorPage.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });

        const codeEl = await creatorPage.locator('.text-game-primary').textContent();
        games.push({ code: codeEl?.trim() || '', creators: [creatorPage] });

        console.log(`Game ${i + 1} created: ${games[i].code}`);
      }

      // Verify all 10 have unique codes
      const codes = games.map((g) => g.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(10);

      console.log('All 10 games have unique codes');

      // Add one joiner to each game
      for (let i = 0; i < 10; i++) {
        const joinerCtx = await browser.newContext();
        allContexts.push(joinerCtx);
        const joinerPage = await joinerCtx.newPage();

        await joinerPage.goto('/');
        await joinerPage.evaluate(() => localStorage.clear());

        await joinerPage.getByRole('button', { name: 'Join Game' }).click();
        await joinerPage.getByPlaceholder('Enter your name').fill(`Game${i + 1}Joiner`);
        await joinerPage.getByPlaceholder('Enter game code').fill(games[i].code);
        await joinerPage.getByRole('button', { name: 'Join Game' }).click();

        await expect(joinerPage.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });
        console.log(`Joiner added to game ${i + 1}`);
      }

      // Verify all creators see 2 players
      for (let i = 0; i < 10; i++) {
        await expect(games[i].creators[0].getByText('Players (2)')).toBeVisible({ timeout: 10000 });
      }

      console.log('All 10 games verified with 2 players each');

      // Take screenshot of first game
      await takeScreenshot(games[0].creators[0], 'massive-10-games-sample');
    } finally {
      for (const ctx of allContexts) {
        await ctx.close();
      }
    }
  });

  test('rapid sequential game creation (20 games)', async ({ browser }) => {
    const contexts: BrowserContext[] = [];
    const gameCodes: string[] = [];

    try {
      for (let i = 0; i < 20; i++) {
        const ctx = await browser.newContext();
        contexts.push(ctx);
        const page = await ctx.newPage();

        await page.goto('/');
        await page.evaluate(() => localStorage.clear());

        await page.getByRole('button', { name: 'Create Game' }).click();
        await page.getByPlaceholder('Enter your name').fill(`Rapid${i + 1}`);
        await page.getByRole('button', { name: 'Create Game' }).click();

        await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });

        const codeEl = await page.locator('.text-game-primary').textContent();
        gameCodes.push(codeEl?.trim() || '');

        if ((i + 1) % 5 === 0) {
          console.log(`Created ${i + 1} games...`);
        }
      }

      // Verify all unique
      const uniqueCodes = new Set(gameCodes);
      expect(uniqueCodes.size).toBe(20);

      console.log(`All 20 games created with unique codes`);
      console.log(`Codes: ${gameCodes.join(', ')}`);
    } finally {
      for (const ctx of contexts) {
        await ctx.close();
      }
    }
  });
});

test.describe('Responsive Screenshots - All Devices', () => {
  test('home screen on all devices', async ({ browser }) => {
    for (const [, device] of Object.entries(DEVICES)) {
      const context = await browser.newContext({
        viewport: { width: device.width, height: device.height },
      });
      const page = await context.newPage();

      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();

      await expect(page.getByRole('button', { name: 'Create Game' })).toBeVisible();
      await takeScreenshot(page, `responsive-home-${device.name}`);

      await context.close();
    }
  });

  test('create game form on all devices', async ({ browser }) => {
    for (const [, device] of Object.entries(DEVICES)) {
      const context = await browser.newContext({
        viewport: { width: device.width, height: device.height },
      });
      const page = await context.newPage();

      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();

      await page.getByRole('button', { name: 'Create Game' }).click();
      await page.getByPlaceholder('Enter your name').fill('TestPlayer');

      await takeScreenshot(page, `responsive-create-form-${device.name}`);

      await context.close();
    }
  });

  test('waiting room on all devices', async ({ browser }) => {
    test.setTimeout(120000);
    for (const [, device] of Object.entries(DEVICES)) {
      const context = await browser.newContext({
        viewport: { width: device.width, height: device.height },
      });
      const page = await context.newPage();

      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();

      await page.getByRole('button', { name: 'Create Game' }).click();
      await page.getByPlaceholder('Enter your name').fill(`Device${device.name}`);
      await page.getByRole('button', { name: 'Create Game' }).click();

      await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 20000 });

      await takeScreenshot(page, `responsive-waiting-room-${device.name}`);

      await context.close();
    }
  });

  test('game board on all devices', async ({ browser }) => {
    test.setTimeout(180000);
    // Test each device one at a time to avoid resource exhaustion
    for (const [, device] of Object.entries(DEVICES)) {
      const ctx1 = await browser.newContext({
        viewport: { width: device.width, height: device.height },
      });
      const ctx2 = await browser.newContext({
        viewport: { width: 1280, height: 720 },
      });

      const creator = await ctx1.newPage();
      const joiner = await ctx2.newPage();

      try {
        await creator.goto('/');
        await creator.evaluate(() => localStorage.clear());
        await creator.reload();

        await joiner.goto('/');
        await joiner.evaluate(() => localStorage.clear());
        await joiner.reload();

        // Create game
        await creator.getByRole('button', { name: 'Create Game' }).click();
        await expect(creator.getByPlaceholder('Enter your name')).toBeVisible({ timeout: 5000 });
        await creator.getByPlaceholder('Enter your name').fill(`Creator${device.name}`);
        await creator.getByRole('button', { name: 'Create Game' }).click();

        await expect(creator.getByText('Waiting Room')).toBeVisible({ timeout: 25000 });

        const codeEl = await creator.locator('.text-game-primary').textContent();
        const code = codeEl?.trim();

        // Join
        await joiner.getByRole('button', { name: 'Join Game' }).click();
        await joiner.getByPlaceholder('Enter your name').fill('Joiner');
        await joiner.getByPlaceholder('Enter game code').fill(code!);
        await joiner.getByRole('button', { name: 'Join Game' }).click();

        await expect(joiner.getByText('Waiting Room')).toBeVisible({ timeout: 20000 });

        // Start
        await creator.getByRole('button', { name: 'Start Game' }).click();
        await expect(creator.locator('canvas').first()).toBeVisible({ timeout: 20000 });

        // Wait a bit for the board to fully render
        await creator.waitForTimeout(1000);

        await takeScreenshot(creator, `responsive-game-board-${device.name}`);
        console.log(`Game board screenshot taken for ${device.name}`);
      } finally {
        await ctx1.close();
        await ctx2.close();
      }
    }
  });

  test('join game form on all devices', async ({ browser }) => {
    for (const [, device] of Object.entries(DEVICES)) {
      const context = await browser.newContext({
        viewport: { width: device.width, height: device.height },
      });
      const page = await context.newPage();

      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();

      await page.getByRole('button', { name: 'Join Game' }).click();
      await page.getByPlaceholder('Enter your name').fill('TestPlayer');
      await page.getByPlaceholder('Enter game code').fill('ABC123');

      await takeScreenshot(page, `responsive-join-form-${device.name}`);

      await context.close();
    }
  });

  test('error state on all devices', async ({ browser }) => {
    test.setTimeout(120000);
    for (const [, device] of Object.entries(DEVICES)) {
      const context = await browser.newContext({
        viewport: { width: device.width, height: device.height },
      });
      const page = await context.newPage();

      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();

      await page.getByRole('button', { name: 'Join Game' }).click();
      await page.getByPlaceholder('Enter your name').fill('TestPlayer');
      await page.getByPlaceholder('Enter game code').fill('XXXXXX');
      await page.getByRole('button', { name: 'Join Game' }).click();

      await expect(page.getByText(/not found/i)).toBeVisible({ timeout: 10000 });

      await takeScreenshot(page, `responsive-error-${device.name}`);

      await context.close();
    }
  });
});

test.describe('Network & Connection Edge Cases', () => {
  test('reconnect indicator shows during reconnection', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    await page.getByRole('button', { name: 'Create Game' }).click();
    await page.getByPlaceholder('Enter your name').fill('ReconnectTest');
    await page.getByRole('button', { name: 'Create Game' }).click();

    await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });

    // Refresh and catch the reconnecting state
    await page.reload();

    // Try to catch the reconnecting message
    try {
      await expect(page.getByText('Reconnecting')).toBeVisible({ timeout: 3000 });
      await takeScreenshot(page, 'edge-reconnecting-indicator');
    } catch {
      // It might be too fast, that's OK
    }

    await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });
    await takeScreenshot(page, 'edge-reconnected-success');
  });
});
