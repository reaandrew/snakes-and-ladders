#!/usr/bin/env node
/**
 * Load test script to simulate multiple players joining and playing a Snakes & Ladders game.
 *
 * Usage:
 *   node load-test.js [options]
 *
 * Options:
 *   --players=N      Number of bot players to spawn (default: 100)
 *   --game=CODE      Join existing game code (otherwise creates new game)
 *   --api=URL        API base URL (default: https://api.snakes.demos.apps.equal.expert)
 *   --delay=MS       Delay between player joins in ms (default: 100)
 *   --play           Simulate gameplay (bots roll dice until someone wins)
 *   --timeout=SEC    Exit after SEC seconds with success/failure code (for CI)
 *
 * Examples:
 *   node load-test.js --players=10                        # Basic test with 10 players
 *   node load-test.js --players=100 --delay=50            # Fast join 100 players
 *   node load-test.js --players=150 --game=ABCD           # Join existing game
 *   node load-test.js --players=10 --play --timeout=60    # CI mode: play until winner or 60s
 */

const WebSocket = require('ws');
const https = require('https');
const http = require('http');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value === undefined ? true : value;
  return acc;
}, {});

const NUM_PLAYERS = parseInt(args.players) || 100;
const API_URL = args.api || 'https://api.snakes.demos.apps.equal.expert';
const WS_URL = API_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';
const FRONTEND_ORIGIN = API_URL.replace('://api.', '://');
const JOIN_DELAY = parseInt(args.delay) || 100;
const SIMULATE_PLAY = args.play || false;
const TIMEOUT_SEC = args.timeout ? parseInt(args.timeout) : null;

const players = [];
let gameCode = args.game || null;
let creatorPlayerId = null;
let gameFinished = false;
let winnerName = null;

// Names for bots
const adjectives = [
  'Happy',
  'Speedy',
  'Lucky',
  'Brave',
  'Clever',
  'Swift',
  'Mighty',
  'Noble',
  'Wild',
  'Cool',
  'Fiery',
  'Cosmic',
  'Mystic',
  'Jolly',
  'Zen',
  'Hyper',
  'Super',
  'Mega',
  'Ultra',
  'Epic',
];
const nouns = [
  'Panda',
  'Tiger',
  'Eagle',
  'Shark',
  'Wolf',
  'Bear',
  'Fox',
  'Hawk',
  'Lion',
  'Otter',
  'Dragon',
  'Phoenix',
  'Falcon',
  'Cobra',
  'Panther',
  'Raven',
  'Jaguar',
  'Viper',
  'Lynx',
  'Raptor',
];

function generateName(index) {
  const adj = adjectives[index % adjectives.length];
  const noun = nouns[Math.floor(index / adjectives.length) % nouns.length];
  return `${adj}${noun}${index}`;
}

function httpRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const lib = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function createGame() {
  console.log('Creating new game...');
  const response = await httpRequest(`${API_URL}/games`, 'POST', {
    creatorName: 'LoadTestHost',
  });
  console.log(`Game created: ${response.game.code}`);
  creatorPlayerId = response.playerId;
  return response.game.code;
}

function createPlayer(index, code) {
  return new Promise((resolve, reject) => {
    const name = generateName(index);
    const ws = new WebSocket(WS_URL, { headers: { Origin: FRONTEND_ORIGIN } });
    let timeoutId = null;
    let resolved = false;
    let rollInterval = null;

    const player = {
      index,
      name,
      ws,
      playerId: null,
      connected: false,
      joined: false,
      stopRolling: () => {
        if (rollInterval) {
          clearInterval(rollInterval);
          rollInterval = null;
        }
      },
    };

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    ws.on('open', () => {
      player.connected = true;
      ws.send(
        JSON.stringify({
          action: 'joinGame',
          gameCode: code,
          playerName: name,
        })
      );
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'joinedGame' && !resolved) {
          resolved = true;
          cleanup();
          player.joined = true;
          player.playerId = msg.playerId;
          console.log(`  [Join] ${name} joined (ID: ${msg.playerId})`);
          resolve(player);
        }

        if (msg.type === 'gameStarted') {
          // Start rolling dice on a random interval (race mode)
          rollInterval = setInterval(
            () => {
              if (gameFinished || ws.readyState !== WebSocket.OPEN) {
                player.stopRolling();
                return;
              }
              ws.send(
                JSON.stringify({
                  action: 'rollDice',
                  gameCode: code,
                  playerId: player.playerId,
                })
              );
            },
            200 + Math.floor(Math.random() * 300)
          );
        }

        if (msg.type === 'playerMoved' && msg.playerName === name) {
          const effectStr = msg.effect
            ? ` (${msg.effect.type}: ${msg.effect.from} -> ${msg.effect.to})`
            : '';
          console.log(
            `  [Roll] ${name} rolled ${msg.diceRoll}: ${msg.previousPosition} -> ${msg.newPosition}${effectStr}`
          );
        }

        if (msg.type === 'gameEnded') {
          gameFinished = true;
          winnerName = msg.winnerName || msg.winnerId;
          player.stopRolling();
        }

        if (msg.type === 'error') {
          // Ignore "game has not started" / "game has ended" during play
          if (msg.code === 'GAME_NOT_STARTED' || msg.code === 'GAME_ALREADY_STARTED') {
            return;
          }
          console.error(`  [Error] ${name}: ${msg.message}`);
          if (!resolved) {
            resolved = true;
            cleanup();
            reject(new Error(msg.message));
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    ws.on('error', (err) => {
      console.error(`  [Error] ${name} WebSocket: ${err.message}`);
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(err);
      }
    });

    ws.on('close', () => {
      player.connected = false;
      player.stopRolling();
      if (!resolved) {
        console.log(`  [Disconnect] ${name} disconnected before joining`);
      }
    });

    timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`[${index}] Timeout waiting for join confirmation`));
        ws.close();
      }
    }, 10000);
  });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function disconnectAll() {
  players.forEach((p) => {
    p.stopRolling();
    if (p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.close();
    }
  });
}

function startGame() {
  return new Promise((resolve, reject) => {
    console.log('\nConnecting as creator to start game...');
    const ws = new WebSocket(WS_URL, { headers: { Origin: FRONTEND_ORIGIN } });

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          action: 'rejoinGame',
          gameCode: gameCode,
          playerId: creatorPlayerId,
        })
      );
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'joinedGame') {
        console.log('Starting game...');
        ws.send(
          JSON.stringify({
            action: 'startGame',
            gameCode: gameCode,
            playerId: creatorPlayerId,
          })
        );
      }
      if (msg.type === 'gameStarted') {
        ws.close();
        resolve();
      }
      if (msg.type === 'error') {
        ws.close();
        reject(new Error(msg.message));
      }
    });

    ws.on('error', (err) => reject(err));

    setTimeout(() => {
      ws.close();
      reject(new Error('Timeout starting game'));
    }, 10000);
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('Snakes & Ladders Load Test');
  console.log('='.repeat(60));
  console.log(`API URL: ${API_URL}`);
  console.log(`WebSocket URL: ${WS_URL}`);
  console.log(`Players: ${NUM_PLAYERS}`);
  console.log(`Play game: ${SIMULATE_PLAY}`);
  console.log(`Timeout: ${TIMEOUT_SEC ? TIMEOUT_SEC + 's' : 'none'}`);
  console.log('='.repeat(60));

  // Create or use existing game
  try {
    if (!gameCode) {
      gameCode = await createGame();
    } else {
      console.log(`Using existing game: ${gameCode}`);
    }
  } catch (err) {
    console.error(`Failed to create game: ${err.message}`);
    process.exit(1);
  }

  console.log(`\nGame Code: ${gameCode}`);
  console.log('\n--- Joining Players ---');

  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < NUM_PLAYERS; i++) {
    try {
      const player = await createPlayer(i, gameCode);
      players.push(player);
      successCount++;
    } catch (err) {
      console.error(`Failed to create player ${i}: ${err.message}`);
      failCount++;
    }

    if (i < NUM_PLAYERS - 1) {
      await sleep(JOIN_DELAY);
    }
  }

  const joinElapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n--- Join Summary ---`);
  console.log(`Joined: ${successCount}/${NUM_PLAYERS} in ${joinElapsed}s`);

  if (failCount > 0) {
    console.log(`Failed: ${failCount}`);
  }

  // If --play flag, start game and wait for winner
  if (SIMULATE_PLAY && successCount > 0) {
    await startGame();

    console.log('\n--- Game In Progress ---');

    // Wait for game to finish or timeout
    const gameStart = Date.now();
    const maxWait = (TIMEOUT_SEC || 120) * 1000;

    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (gameFinished || Date.now() - gameStart > maxWait) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
    });

    console.log('\n' + '='.repeat(60));
    if (gameFinished) {
      console.log(`WINNER: ${winnerName}`);
    } else {
      console.log('Game did not finish within timeout');
    }
    console.log('='.repeat(60));

    disconnectAll();
    process.exit(gameFinished ? 0 : 1);
    return;
  }

  // Non-play CI mode: just check joins succeeded
  if (TIMEOUT_SEC !== null) {
    const success = failCount === 0 && successCount === NUM_PLAYERS;
    console.log(`\nCI Result: ${success ? 'PASSED' : 'FAILED'}`);
    disconnectAll();
    process.exit(success ? 0 : 1);
    return;
  }

  console.log('\nPlayers are connected. Press Ctrl+C to disconnect all.\n');
  process.on('SIGINT', () => {
    disconnectAll();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
