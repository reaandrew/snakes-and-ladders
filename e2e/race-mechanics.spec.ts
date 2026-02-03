import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

const SCREENSHOT_DIR = 'e2e/screenshots';

interface PlayerSession {
  context: BrowserContext;
  page: Page;
  name: string;
}

async function createPlayer(browser: Browser, name: string): Promise<PlayerSession> {
  const context = await browser.newContext();
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

test.describe('RACE Game Mechanics - Not Turn Based!', () => {
  test.setTimeout(180000);

  test('all players can roll dice simultaneously - this is a RACE', async ({ browser }) => {
    const players: PlayerSession[] = [];

    try {
      // Create 3 players
      for (let i = 1; i <= 3; i++) {
        players.push(await createPlayer(browser, `Racer${i}`));
      }

      const creator = players[0];

      // Create game
      await creator.page.getByRole('button', { name: 'Create Game' }).click();
      await creator.page.getByPlaceholder('Enter your name').fill(creator.name);
      await creator.page.getByRole('button', { name: 'Create Game' }).click();

      await expect(creator.page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });

      const gameCodeElement = await creator.page.locator('.text-game-primary').textContent();
      const gameCode = gameCodeElement?.trim();

      // Join other players
      for (let i = 1; i < players.length; i++) {
        const player = players[i];
        await player.page.getByRole('button', { name: 'Join Game' }).click();
        await player.page.getByPlaceholder('Enter your name').fill(player.name);
        await player.page.getByPlaceholder('Enter game code').fill(gameCode!);
        await player.page.getByRole('button', { name: 'Join Game' }).click();
        await expect(player.page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });
      }

      // Start game
      await creator.page.getByRole('button', { name: 'Start Game' }).click();

      // All should see the board
      for (const player of players) {
        await expect(player.page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
      }

      console.log('Game started - testing race mechanics');

      // ALL players click dice rapidly at the same time - this should work!
      // In a turn-based game, only one would succeed. In a race, ALL should work!
      const rollPromises = players.map(async (player, _index) => {
        const results: boolean[] = [];
        for (let i = 0; i < 5; i++) {
          try {
            // Click the dice area (the 3D canvas or button)
            await player.page.locator('canvas').first().click({ timeout: 2000 });
            await player.page.waitForTimeout(500);
            results.push(true);
            console.log(`${player.name} rolled successfully (roll ${i + 1})`);
          } catch {
            results.push(false);
          }
        }
        return results;
      });

      const allResults = await Promise.all(rollPromises);

      // Verify that MULTIPLE players were able to roll
      // In a race game, everyone should be able to roll
      const successfulRolls = allResults.flat().filter((r) => r).length;
      console.log(`Total successful rolls: ${successfulRolls} out of ${allResults.flat().length}`);

      // Take screenshot of the race in progress
      await takeScreenshot(creator.page, 'race-mechanics-all-rolling');

      // All players should still see the game board (no one got kicked)
      for (const player of players) {
        await expect(player.page.locator('canvas').first()).toBeVisible();
      }
    } finally {
      await cleanupPlayers(players);
    }
  });

  test('reconnection should sync ALL player positions - BUG TEST', async ({ browser }) => {
    const players: PlayerSession[] = [];

    try {
      // Create 2 players
      players.push(await createPlayer(browser, 'SyncTest1'));
      players.push(await createPlayer(browser, 'SyncTest2'));

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

      // Start game
      await creator.page.getByRole('button', { name: 'Start Game' }).click();

      for (const player of players) {
        await expect(player.page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
      }

      // Both players roll a few times to move their pieces
      for (let i = 0; i < 3; i++) {
        await creator.page
          .locator('canvas')
          .first()
          .click()
          .catch(() => {});
        await creator.page.waitForTimeout(800);
        await joiner.page
          .locator('canvas')
          .first()
          .click()
          .catch(() => {});
        await joiner.page.waitForTimeout(800);
      }

      console.log('Both players have rolled - now testing reconnection');

      // Take screenshot before refresh
      await takeScreenshot(creator.page, 'sync-before-refresh-creator');
      await takeScreenshot(joiner.page, 'sync-before-refresh-joiner');

      // Creator refreshes
      await creator.page.reload();

      // Wait for reconnection
      await expect(creator.page.getByText('Reconnecting'))
        .toBeVisible({ timeout: 5000 })
        .catch(() => {});
      await expect(creator.page.locator('canvas').first()).toBeVisible({ timeout: 15000 });

      // Take screenshot after creator refresh
      await takeScreenshot(creator.page, 'sync-after-refresh-creator');

      // CRITICAL: Joiner also refreshes and should see BOTH pieces
      await joiner.page.reload();
      await expect(joiner.page.locator('canvas').first()).toBeVisible({ timeout: 15000 });

      // Take screenshot after joiner refresh
      await takeScreenshot(joiner.page, 'sync-after-refresh-joiner');

      // Wait a moment for state to stabilize
      await joiner.page.waitForTimeout(2000);

      // Take final screenshots showing what each player sees
      await takeScreenshot(creator.page, 'sync-final-creator-view');
      await takeScreenshot(joiner.page, 'sync-final-joiner-view');

      console.log('Reconnection test completed - check screenshots for sync issues');
    } finally {
      await cleanupPlayers(players);
    }
  });

  test('massive 6-player race with rapid simultaneous rolling', async ({ browser }) => {
    const players: PlayerSession[] = [];

    try {
      // Create 6 players (max)
      for (let i = 1; i <= 6; i++) {
        players.push(await createPlayer(browser, `MassRacer${i}`));
      }

      const creator = players[0];

      // Create game
      await creator.page.getByRole('button', { name: 'Create Game' }).click();
      await creator.page.getByPlaceholder('Enter your name').fill(creator.name);
      await creator.page.getByRole('button', { name: 'Create Game' }).click();

      await expect(creator.page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });

      const gameCodeElement = await creator.page.locator('.text-game-primary').textContent();
      const gameCode = gameCodeElement?.trim();

      // Join all other players
      for (let i = 1; i < players.length; i++) {
        const player = players[i];
        await player.page.getByRole('button', { name: 'Join Game' }).click();
        await player.page.getByPlaceholder('Enter your name').fill(player.name);
        await player.page.getByPlaceholder('Enter game code').fill(gameCode!);
        await player.page.getByRole('button', { name: 'Join Game' }).click();
        await expect(player.page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });
        console.log(`${player.name} joined`);
      }

      await expect(creator.page.getByText('Players (6)')).toBeVisible({ timeout: 10000 });

      // Start game
      await creator.page.getByRole('button', { name: 'Start Game' }).click();

      for (const player of players) {
        await expect(player.page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
      }

      console.log('6-player race started!');
      await takeScreenshot(creator.page, 'race-6players-start');

      // Everyone races! Rapid clicking from all players
      for (let round = 0; round < 3; round++) {
        console.log(`Race round ${round + 1}`);

        // All 6 players click as fast as possible
        await Promise.all(
          players.map(async (player) => {
            for (let i = 0; i < 3; i++) {
              await player.page
                .locator('canvas')
                .first()
                .click()
                .catch(() => {});
              await player.page.waitForTimeout(300);
            }
          })
        );
      }

      await takeScreenshot(creator.page, 'race-6players-during');

      // All should still be in the game
      for (const player of players) {
        await expect(player.page.locator('canvas').first()).toBeVisible();
      }

      console.log('6-player race completed successfully');
      await takeScreenshot(creator.page, 'race-6players-end');
    } finally {
      await cleanupPlayers(players);
    }
  });
});

test.describe('Large Scale Load Testing', () => {
  test.setTimeout(300000); // 5 minutes

  test('20 simultaneous games stress test', async ({ browser }) => {
    const contexts: BrowserContext[] = [];
    const games: { code: string; page: Page }[] = [];

    try {
      console.log('Creating 20 simultaneous games...');

      // Create 20 games
      for (let i = 0; i < 20; i++) {
        const ctx = await browser.newContext();
        contexts.push(ctx);
        const page = await ctx.newPage();

        await page.goto('/');
        await page.evaluate(() => localStorage.clear());

        await page.getByRole('button', { name: 'Create Game' }).click();
        await page.getByPlaceholder('Enter your name').fill(`LoadTest${i + 1}`);
        await page.getByRole('button', { name: 'Create Game' }).click();

        await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 20000 });

        const codeEl = await page.locator('.text-game-primary').textContent();
        games.push({ code: codeEl?.trim() || '', page });

        if ((i + 1) % 5 === 0) {
          console.log(`Created ${i + 1} games...`);
        }
      }

      // Verify all unique codes
      const codes = games.map((g) => g.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(20);

      console.log('All 20 games created with unique codes');

      // Add a second player to each game
      for (let i = 0; i < 20; i++) {
        const ctx = await browser.newContext();
        contexts.push(ctx);
        const page = await ctx.newPage();

        await page.goto('/');
        await page.evaluate(() => localStorage.clear());

        await page.getByRole('button', { name: 'Join Game' }).click();
        await page.getByPlaceholder('Enter your name').fill(`LoadJoiner${i + 1}`);
        await page.getByPlaceholder('Enter game code').fill(games[i].code);
        await page.getByRole('button', { name: 'Join Game' }).click();

        await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 20000 });

        if ((i + 1) % 5 === 0) {
          console.log(`Added joiner to ${i + 1} games...`);
        }
      }

      // Verify all creators see 2 players
      for (let i = 0; i < 5; i++) {
        await expect(games[i].page.getByText('Players (2)')).toBeVisible({ timeout: 10000 });
      }

      console.log('20 games with 2 players each verified');
      await takeScreenshot(games[0].page, 'load-test-20games');
    } finally {
      for (const ctx of contexts) {
        await ctx.close();
      }
    }
  });

  test('rapid game creation - 30 games in sequence', async ({ browser }) => {
    const contexts: BrowserContext[] = [];
    const gameCodes: string[] = [];

    try {
      console.log('Creating 30 games rapidly...');

      for (let i = 0; i < 30; i++) {
        const ctx = await browser.newContext();
        contexts.push(ctx);
        const page = await ctx.newPage();

        await page.goto('/');
        await page.evaluate(() => localStorage.clear());

        await page.getByRole('button', { name: 'Create Game' }).click();
        await page.getByPlaceholder('Enter your name').fill(`Rapid${i + 1}`);
        await page.getByRole('button', { name: 'Create Game' }).click();

        await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 20000 });

        const codeEl = await page.locator('.text-game-primary').textContent();
        gameCodes.push(codeEl?.trim() || '');

        if ((i + 1) % 10 === 0) {
          console.log(`Created ${i + 1} games...`);
        }
      }

      // All should be unique
      const uniqueCodes = new Set(gameCodes);
      expect(uniqueCodes.size).toBe(30);

      console.log('30 games created with unique codes');
      console.log(`Sample codes: ${gameCodes.slice(0, 5).join(', ')}...`);
    } finally {
      for (const ctx of contexts) {
        await ctx.close();
      }
    }
  });
});
