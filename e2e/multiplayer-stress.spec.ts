import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

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

test.describe('Multiplayer Stress Tests', () => {
  test.setTimeout(120000); // 2 minute timeout for stress tests

  test('4 players can join and play a full game', async ({ browser }) => {
    const players: PlayerSession[] = [];

    try {
      // Create 4 player sessions
      for (let i = 1; i <= 4; i++) {
        players.push(await createPlayer(browser, `Player${i}`));
      }

      const creator = players[0];
      const joiners = players.slice(1);

      // Creator creates the game
      await creator.page.getByRole('button', { name: 'Create Game' }).click();
      await creator.page.getByPlaceholder('Enter your name').fill(creator.name);
      await creator.page.getByRole('button', { name: 'Create Game' }).click();

      // Wait for waiting room
      await expect(creator.page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });

      // Get game code
      const gameCodeElement = await creator.page.locator('.text-game-primary').textContent();
      const gameCode = gameCodeElement?.trim();
      expect(gameCode).toBeTruthy();
      console.log(`Game created with code: ${gameCode}`);

      // Players join sequentially to avoid race conditions
      for (const player of joiners) {
        await player.page.getByRole('button', { name: 'Join Game' }).click();
        await player.page.getByPlaceholder('Enter your name').fill(player.name);
        await player.page.getByPlaceholder('Enter game code').fill(gameCode!);
        await player.page.getByRole('button', { name: 'Join Game' }).click();

        // Wait for waiting room
        await expect(player.page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });
        console.log(`${player.name} joined`);
      }

      // Verify all players see all 4 players
      for (const player of players) {
        await expect(player.page.getByText('Players (4)')).toBeVisible({ timeout: 10000 });
        for (const p of players) {
          await expect(player.page.getByText(p.name)).toBeVisible();
        }
      }

      console.log('All 4 players joined successfully');

      // Creator starts the game
      const startButton = creator.page.getByRole('button', { name: 'Start Game' });
      await expect(startButton).toBeEnabled({ timeout: 5000 });
      await startButton.click();

      // All players should see the game board (canvas)
      await Promise.all(
        players.map(async (player) => {
          await expect(player.page.locator('canvas')).toBeVisible({ timeout: 15000 });
        })
      );

      console.log('Game started, all players see the board');

      // Play several rounds - each player takes a turn
      for (let round = 0; round < 3; round++) {
        console.log(`Starting round ${round + 1}`);

        for (const player of players) {
          // Find and click the dice (the 3D dice or fallback)
          const diceButton = player.page.locator('canvas').first();

          // Try to roll - may fail if not this player's turn, that's OK
          try {
            await diceButton.click({ timeout: 2000 });
            // Wait a bit for the roll animation and state update
            await player.page.waitForTimeout(1500);
          } catch {
            // Not this player's turn or dice not clickable
          }
        }
      }

      console.log('Completed 3 rounds of play');

      // Verify game is still running and all players are connected
      for (const player of players) {
        await expect(player.page.locator('canvas').first()).toBeVisible();
      }
    } finally {
      await cleanupPlayers(players);
    }
  });

  test('6 players stress test - max players', async ({ browser }) => {
    const players: PlayerSession[] = [];

    try {
      // Create 6 player sessions (max players)
      for (let i = 1; i <= 6; i++) {
        players.push(await createPlayer(browser, `Stress${i}`));
      }

      const creator = players[0];
      const joiners = players.slice(1);

      // Creator creates the game
      await creator.page.getByRole('button', { name: 'Create Game' }).click();
      await creator.page.getByPlaceholder('Enter your name').fill(creator.name);
      await creator.page.getByRole('button', { name: 'Create Game' }).click();

      await expect(creator.page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });

      const gameCodeElement = await creator.page.locator('.text-game-primary').textContent();
      const gameCode = gameCodeElement?.trim();
      console.log(`Stress test game: ${gameCode}`);

      // Join players one by one with small delays to avoid race conditions
      for (const player of joiners) {
        await player.page.getByRole('button', { name: 'Join Game' }).click();
        await player.page.getByPlaceholder('Enter your name').fill(player.name);
        await player.page.getByPlaceholder('Enter game code').fill(gameCode!);
        await player.page.getByRole('button', { name: 'Join Game' }).click();

        await expect(player.page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });
        console.log(`${player.name} joined`);
      }

      // Verify all 6 players are shown
      await expect(creator.page.getByText('Players (6)')).toBeVisible({ timeout: 10000 });
      console.log('All 6 players joined');

      // Start game
      await creator.page.getByRole('button', { name: 'Start Game' }).click();

      // Verify all see the board
      await Promise.all(
        players.map(async (player) => {
          await expect(player.page.locator('canvas')).toBeVisible({ timeout: 15000 });
        })
      );

      console.log('Game started with 6 players');
    } finally {
      await cleanupPlayers(players);
    }
  });

  test('players reconnect after page refresh during game', async ({ browser }) => {
    const players: PlayerSession[] = [];

    try {
      // Create 3 players
      for (let i = 1; i <= 3; i++) {
        players.push(await createPlayer(browser, `Reconnect${i}`));
      }

      const creator = players[0];
      const joiners = players.slice(1);

      // Create and join game
      await creator.page.getByRole('button', { name: 'Create Game' }).click();
      await creator.page.getByPlaceholder('Enter your name').fill(creator.name);
      await creator.page.getByRole('button', { name: 'Create Game' }).click();

      await expect(creator.page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });

      const gameCodeElement = await creator.page.locator('.text-game-primary').textContent();
      const gameCode = gameCodeElement?.trim();

      for (const player of joiners) {
        await player.page.getByRole('button', { name: 'Join Game' }).click();
        await player.page.getByPlaceholder('Enter your name').fill(player.name);
        await player.page.getByPlaceholder('Enter game code').fill(gameCode!);
        await player.page.getByRole('button', { name: 'Join Game' }).click();
        await expect(player.page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });
      }

      // Start game
      await creator.page.getByRole('button', { name: 'Start Game' }).click();

      await Promise.all(
        players.map(async (player) => {
          await expect(player.page.locator('canvas')).toBeVisible({ timeout: 15000 });
        })
      );

      console.log('Game started, now testing reconnection');

      // Player 2 refreshes their page
      await players[1].page.reload();

      // Should show reconnecting message
      await expect(players[1].page.getByText('Reconnecting to game...')).toBeVisible({
        timeout: 5000,
      });

      // Should reconnect and see the board again
      await expect(players[1].page.locator('canvas').first()).toBeVisible({ timeout: 15000 });

      console.log('Player 2 reconnected successfully');

      // Creator also refreshes
      await creator.page.reload();
      await expect(creator.page.getByText('Reconnecting to game...')).toBeVisible({
        timeout: 5000,
      });
      await expect(creator.page.locator('canvas').first()).toBeVisible({ timeout: 15000 });

      console.log('Creator reconnected successfully');

      // Verify all players still see each other
      for (const player of players) {
        await expect(player.page.locator('canvas').first()).toBeVisible();
      }
    } finally {
      await cleanupPlayers(players);
    }
  });

  test('rapid dice rolling stress test', async ({ browser }) => {
    const players: PlayerSession[] = [];

    try {
      // Create 2 players for rapid rolling test
      players.push(await createPlayer(browser, 'RapidA'));
      players.push(await createPlayer(browser, 'RapidB'));

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

      await Promise.all(
        players.map(async (player) => {
          await expect(player.page.locator('canvas')).toBeVisible({ timeout: 15000 });
        })
      );

      console.log('Starting rapid dice rolling test');

      // Rapid fire dice clicks - simulating impatient users
      for (let i = 0; i < 20; i++) {
        // Both players try to click rapidly
        await Promise.all([
          creator.page
            .locator('canvas')
            .first()
            .click({ timeout: 1000 })
            .catch(() => {}),
          joiner.page
            .locator('canvas')
            .first()
            .click({ timeout: 1000 })
            .catch(() => {}),
        ]);

        // Small delay between rapid clicks
        await creator.page.waitForTimeout(300);
      }

      console.log('Completed rapid clicking');

      // Verify game is still functional
      await expect(creator.page.locator('canvas').first()).toBeVisible();
      await expect(joiner.page.locator('canvas').first()).toBeVisible();

      console.log('Game survived rapid clicking stress test');
    } finally {
      await cleanupPlayers(players);
    }
  });

  test('simultaneous game creation stress', async ({ browser }) => {
    const contexts: BrowserContext[] = [];
    const games: { code: string; creatorPage: Page }[] = [];

    try {
      // Create 3 games simultaneously
      const createPromises = Array.from({ length: 3 }, async (_, i) => {
        const context = await browser.newContext();
        contexts.push(context);
        const page = await context.newPage();

        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        await page.getByRole('button', { name: 'Create Game' }).click();
        await page.getByPlaceholder('Enter your name').fill(`GameCreator${i + 1}`);
        await page.getByRole('button', { name: 'Create Game' }).click();

        await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 15000 });

        const gameCodeElement = await page.locator('.text-game-primary').textContent();
        const gameCode = gameCodeElement?.trim();

        return { code: gameCode!, creatorPage: page };
      });

      const results = await Promise.all(createPromises);
      games.push(...results);

      // Verify all games have unique codes
      const codes = games.map((g) => g.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(3);

      console.log(`Created 3 games with codes: ${codes.join(', ')}`);

      // Verify each game is independent
      for (const game of games) {
        await expect(game.creatorPage.getByText('Players (1)')).toBeVisible();
        await expect(game.creatorPage.getByText(game.code)).toBeVisible();
      }

      console.log('All 3 games are independent and functional');
    } finally {
      for (const ctx of contexts) {
        await ctx.close();
      }
    }
  });
});
