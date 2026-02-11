#!/usr/bin/env node
/**
 * Load test: join an existing game with many agents and roll dice slowly.
 *
 * Usage:
 *   node load-test-join.js --game=ABCD [options]
 *
 * Options:
 *   --game=CODE      Game join code (REQUIRED)
 *   --players=N      Number of agents to spawn (default: 150)
 *   --api=URL        API base URL (default: https://api.snakes.demos.apps.equal.expert)
 *   --min-delay=MS   Minimum delay between rolls in ms (default: 2000)
 *   --max-delay=MS   Maximum delay between rolls in ms (default: 5000)
 *   --batch=N        Players to join concurrently per batch (default: 10)
 *   --join-delay=MS  Delay between join batches in ms (default: 200)
 *
 * Example:
 *   node load-test-join.js --game=ABCD --players=150
 */

const WebSocket = require('ws');
const https = require('https');
const http = require('http');

// Parse CLI args
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value === undefined ? true : value;
  return acc;
}, {});

const GAME_CODE = args.game;
if (!GAME_CODE) {
  console.error('Error: --game=CODE is required');
  process.exit(1);
}

const NUM_PLAYERS = parseInt(args.players) || 150;
const API_URL = args.api || 'https://api.snakes.demos.apps.equal.expert';
const WS_URL = API_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';
const FRONTEND_ORIGIN = API_URL.replace('://api.', '://');
const MIN_ROLL_DELAY = parseInt(args['min-delay']) || 2000;
const MAX_ROLL_DELAY = parseInt(args['max-delay']) || 5000;
const BATCH_SIZE = Math.max(1, parseInt(args.batch) || 10);
const JOIN_DELAY = parseInt(args['join-delay']) || 200;

const players = [];
let gameFinished = false;
let winnerName = null;
let rollCount = 0;

// Bot names
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
  return `Bot_${adj}${noun}${index}`;
}

function randomRollDelay() {
  return MIN_ROLL_DELAY + Math.floor(Math.random() * (MAX_ROLL_DELAY - MIN_ROLL_DELAY));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPlayer(index) {
  return new Promise((resolve, reject) => {
    const name = generateName(index);
    const ws = new WebSocket(WS_URL, { headers: { Origin: FRONTEND_ORIGIN } });
    let timeoutId = null;
    let resolved = false;
    let rollTimeout = null;

    const player = {
      index,
      name,
      ws,
      playerId: null,
      connected: false,
      joined: false,
      rolling: false,
      rolls: 0,
      position: 0,
      stopRolling: () => {
        player.rolling = false;
        if (rollTimeout) {
          clearTimeout(rollTimeout);
          rollTimeout = null;
        }
      },
    };

    function scheduleNextRoll() {
      if (gameFinished || !player.rolling || ws.readyState !== WebSocket.OPEN) {
        player.stopRolling();
        return;
      }
      rollTimeout = setTimeout(() => {
        if (gameFinished || ws.readyState !== WebSocket.OPEN) {
          player.stopRolling();
          return;
        }
        ws.send(
          JSON.stringify({
            action: 'rollDice',
            gameCode: GAME_CODE,
            playerId: player.playerId,
          })
        );
        scheduleNextRoll();
      }, randomRollDelay());
    }

    ws.on('open', () => {
      player.connected = true;
      ws.send(
        JSON.stringify({
          action: 'joinGame',
          gameCode: GAME_CODE,
          playerName: name,
        })
      );
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'joinedGame' && !resolved) {
          resolved = true;
          if (timeoutId) clearTimeout(timeoutId);
          player.joined = true;
          player.playerId = msg.playerId;
          console.log(`  [Join] ${name} joined (ID: ${msg.playerId})`);
          resolve(player);
        }

        if (msg.type === 'gameStarted') {
          console.log(`  [Start] ${name} received gameStarted`);
          player.rolling = true;
          scheduleNextRoll();
        }

        if (msg.type === 'playerMoved') {
          if (msg.playerName === name) {
            rollCount++;
            player.rolls++;
            player.position = msg.newPosition;
            const effectStr = msg.effect
              ? ` (${msg.effect.type}: ${msg.effect.from} -> ${msg.effect.to})`
              : '';
            console.log(
              `  [Roll #${rollCount}] ${name} rolled ${msg.diceRoll}: ` +
                `${msg.previousPosition} -> ${msg.newPosition}${effectStr}`
            );
          }
        }

        if (msg.type === 'gameEnded') {
          gameFinished = true;
          winnerName = msg.winnerName || msg.winnerId;
          player.stopRolling();
        }

        if (msg.type === 'error') {
          if (msg.code === 'GAME_NOT_STARTED' || msg.code === 'GAME_ALREADY_STARTED') return;
          if (msg.code === 'NOT_YOUR_TURN') return;
          console.error(`  [Error] ${name}: ${msg.message}`);
          if (!resolved) {
            resolved = true;
            if (timeoutId) clearTimeout(timeoutId);
            reject(new Error(msg.message));
          }
        }
      } catch {
        // ignore parse errors
      }
    });

    ws.on('error', (err) => {
      console.error(`  [WS Error] ${name}: ${err.message}`);
      if (!resolved) {
        resolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        reject(err);
      }
    });

    ws.on('close', () => {
      player.connected = false;
      player.stopRolling();
    });

    timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`${name}: Timeout waiting for join confirmation`));
        ws.close();
      }
    }, 30000);
  });
}

function printStatus() {
  const connected = players.filter((p) => p.connected).length;
  const rolling = players.filter((p) => p.rolling).length;
  console.log(
    `\n--- Status: ${connected}/${players.length} connected, ` +
      `${rolling} rolling, ${rollCount} total rolls ---\n`
  );
}

function disconnectAll() {
  players.forEach((p) => {
    p.stopRolling();
    if (p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.close();
    }
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('Snakes & Ladders - Join Load Test');
  console.log('='.repeat(60));
  console.log(`Game Code:  ${GAME_CODE}`);
  console.log(`API URL:    ${API_URL}`);
  console.log(`Players:    ${NUM_PLAYERS}`);
  console.log(`Roll delay: ${MIN_ROLL_DELAY}-${MAX_ROLL_DELAY}ms`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log('='.repeat(60));

  console.log('\n--- Joining Players ---');
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  for (let batch = 0; batch < NUM_PLAYERS; batch += BATCH_SIZE) {
    const batchEnd = Math.min(batch + BATCH_SIZE, NUM_PLAYERS);
    const promises = [];

    for (let i = batch; i < batchEnd; i++) {
      const promise = createPlayer(i)
        .then((player) => {
          players.push(player);
          successCount++;
        })
        .catch((err) => {
          console.error(`  [Fail] Player ${i}: ${err.message}`);
          failCount++;
        });
      promises.push(promise);
    }

    await Promise.all(promises);

    if (batchEnd < NUM_PLAYERS) {
      await sleep(JOIN_DELAY);
    }

    // Progress update every 50 players
    if (batchEnd % 50 === 0 || batchEnd === NUM_PLAYERS) {
      console.log(`  ... ${successCount}/${NUM_PLAYERS} joined (${failCount} failed)`);
    }
  }

  const joinElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n--- Join Complete ---`);
  console.log(`Joined: ${successCount}/${NUM_PLAYERS} in ${joinElapsed}s`);
  if (failCount > 0) console.log(`Failed: ${failCount}`);

  console.log('\nAll agents joined. They will start rolling once the game host starts the game.');
  console.log('Press Ctrl+C to disconnect all agents.\n');

  // Periodic status updates
  const statusInterval = setInterval(() => {
    if (gameFinished) {
      clearInterval(statusInterval);
      return;
    }
    printStatus();
  }, 10000);

  // Wait for game to finish
  await new Promise((resolve) => {
    const check = setInterval(() => {
      if (gameFinished) {
        clearInterval(check);
        clearInterval(statusInterval);
        resolve();
      }
    }, 1000);

    process.on('SIGINT', () => {
      clearInterval(check);
      clearInterval(statusInterval);
      resolve();
    });
  });

  console.log('\n' + '='.repeat(60));
  if (gameFinished) {
    console.log(`GAME OVER! Winner: ${winnerName}`);
  } else {
    console.log('Disconnecting...');
  }
  console.log(`Total rolls: ${rollCount}`);
  console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log('='.repeat(60));

  disconnectAll();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
