#!/usr/bin/env node
/**
 * Load test script to simulate multiple players joining a Snakes & Ladders game.
 *
 * Usage:
 *   node load-test.js [options]
 *
 * Options:
 *   --players=N      Number of bot players to spawn (default: 100)
 *   --game=CODE      Join existing game code (otherwise creates new game)
 *   --api=URL        API base URL (default: https://api.snakes.demos.apps.equal.expert)
 *   --delay=MS       Delay between player joins in ms (default: 100)
 *   --play           Simulate gameplay (bots will roll dice when it's their turn)
 *   --timeout=SEC    Exit after SEC seconds with success/failure code (for CI)
 *
 * Examples:
 *   node load-test.js --players=10                        # Basic test with 10 players
 *   node load-test.js --players=100 --delay=50            # Fast join 100 players
 *   node load-test.js --players=150 --game=ABCD           # Join existing game
 *   node load-test.js --players=100 --play                # Simulate gameplay
 *   node load-test.js --players=10 --timeout=30           # CI mode: exit after 30s
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

function createPlayer(index, gameCode) {
  return new Promise((resolve, reject) => {
    const name = generateName(index);
    const ws = new WebSocket(WS_URL, { headers: { Origin: FRONTEND_ORIGIN } });
    let timeoutId = null;
    let resolved = false;

    const player = {
      index,
      name,
      ws,
      playerId: null,
      connected: false,
      joined: false,
    };

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    ws.on('open', () => {
      player.connected = true;
      // Join the game
      ws.send(
        JSON.stringify({
          action: 'joinGame',
          gameCode: gameCode,
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
          console.log(`[${index}] ${name} joined (ID: ${msg.playerId})`);
          resolve(player);
        }

        if (msg.type === 'yourTurn' && SIMULATE_PLAY) {
          // It's this player's turn, roll the dice
          setTimeout(
            () => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    action: 'rollDice',
                    gameCode: gameCode,
                  })
                );
              }
            },
            500 + Math.random() * 1000
          );
        }

        if (msg.type === 'gameEnded') {
          console.log(`Game ended! Winner: ${msg.winnerName || msg.winnerId}`);
        }

        if (msg.type === 'error') {
          console.error(`[${index}] Error: ${msg.message}`);
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
      console.error(`[${index}] WebSocket error: ${err.message}`);
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(err);
      }
    });

    ws.on('close', () => {
      player.connected = false;
      if (!resolved) {
        console.log(`[${index}] ${name} disconnected before joining`);
      }
    });

    // Timeout for joining
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
  console.log('\nDisconnecting all players...');
  players.forEach((p) => {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.close();
    }
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('Snakes & Ladders Load Test');
  console.log('='.repeat(60));
  console.log(`API URL: ${API_URL}`);
  console.log(`WebSocket URL: ${WS_URL}`);
  console.log(`Players to spawn: ${NUM_PLAYERS}`);
  console.log(`Join delay: ${JOIN_DELAY}ms`);
  console.log(`Simulate play: ${SIMULATE_PLAY}`);
  console.log(`CI timeout: ${TIMEOUT_SEC ? TIMEOUT_SEC + 's' : 'disabled'}`);
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

  console.log(`\nGame Code: ${gameCode}\n`);
  console.log('Starting to spawn players...\n');

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

    // Stagger the connections
    if (i < NUM_PLAYERS - 1) {
      await sleep(JOIN_DELAY);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('Load Test Complete');
  console.log('='.repeat(60));
  console.log(`Game Code: ${gameCode}`);
  console.log(`Total players: ${NUM_PLAYERS}`);
  console.log(`Successful joins: ${successCount}`);
  console.log(`Failed joins: ${failCount}`);
  console.log(`Time elapsed: ${elapsed}s`);
  console.log(`Rate: ${(successCount / elapsed).toFixed(1)} players/sec`);
  console.log('='.repeat(60));

  // CI mode: exit with appropriate code
  if (TIMEOUT_SEC !== null) {
    const success = failCount === 0 && successCount === NUM_PLAYERS;
    console.log(`\nCI Mode: ${success ? 'PASSED' : 'FAILED'}`);

    // Schedule exit after timeout
    setTimeout(() => {
      disconnectAll();
      process.exit(success ? 0 : 1);
    }, TIMEOUT_SEC * 1000);

    console.log(`Waiting ${TIMEOUT_SEC}s before exit...`);
    return;
  }

  if (SIMULATE_PLAY) {
    console.log('\nBots are now playing. Press Ctrl+C to exit.\n');

    // Start the game if we created it and have the creator player
    if (creatorPlayerId) {
      console.log('Starting game...');
      // Find or create a connection as the creator to start the game
      const creatorBot = players.find((p) => p.playerId === creatorPlayerId);
      if (creatorBot && creatorBot.ws.readyState === WebSocket.OPEN) {
        creatorBot.ws.send(
          JSON.stringify({
            action: 'startGame',
            gameCode: gameCode,
          })
        );
      } else {
        // Reconnect as creator to start game
        const startWs = new WebSocket(WS_URL);
        startWs.on('open', () => {
          startWs.send(
            JSON.stringify({
              action: 'rejoinGame',
              gameCode: gameCode,
              playerId: creatorPlayerId,
            })
          );
        });
        startWs.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'gameState' || msg.type === 'joinedGame') {
            startWs.send(
              JSON.stringify({
                action: 'startGame',
                gameCode: gameCode,
              })
            );
          }
        });
      }
    }
  } else {
    console.log('\nPlayers are connected. Press Ctrl+C to disconnect all.\n');
  }

  // Keep the script running
  process.on('SIGINT', () => {
    disconnectAll();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
