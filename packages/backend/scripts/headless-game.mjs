#!/usr/bin/env node
/**
 * Headless multi-player game simulation
 * Runs bot players that race to finish
 */

import WebSocket from 'ws';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const WS_URL = process.env.WS_URL || 'ws://localhost:3001/ws';
const WS_ORIGIN = process.env.WS_ORIGIN || 'https://snakes.techar.ch';
const NUM_PLAYERS = parseInt(process.env.NUM_PLAYERS || '4', 10);
const ROLL_DELAY_MIN = 500;
const ROLL_DELAY_MAX = 1500;

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];

class BotPlayer {
  constructor(name, color) {
    this.name = name;
    this.color = color;
    this.ws = null;
    this.playerId = null;
    this.gameCode = null;
    this.position = 0;
    this.connected = false;
    this.gameStarted = false;
    this.gameEnded = false;
  }

  log(msg) {
    const pos = this.position.toString().padStart(3);
    console.log(`[${this.color.padEnd(6)}] ${this.name.padEnd(8)} (pos ${pos}): ${msg}`);
  }

  connect(gameCode) {
    return new Promise((resolve, reject) => {
      this.gameCode = gameCode;
      this.ws = new WebSocket(WS_URL, { headers: { Origin: WS_ORIGIN } });

      this.ws.on('open', () => {
        this.connected = true;
        this.log('Connected to server');
        // Join game
        this.send({
          action: 'joinGame',
          gameCode: this.gameCode,
          playerName: this.name,
        });
      });

      this.ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        this.handleMessage(msg, resolve);
      });

      this.ws.on('error', (err) => {
        this.log(`WebSocket error: ${err.message}`);
        reject(err);
      });

      this.ws.on('close', () => {
        this.connected = false;
        this.log('Disconnected');
      });
    });
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  handleMessage(msg, resolveConnect) {
    switch (msg.type) {
      case 'joinedGame':
        this.playerId = msg.playerId;
        this.log(`Joined game ${this.gameCode}`);
        if (resolveConnect) resolveConnect();
        break;

      case 'playerJoined':
        if (msg.player.id !== this.playerId) {
          this.log(`${msg.player.name} joined the game`);
        }
        break;

      case 'gameStarted':
        this.gameStarted = true;
        this.log('Game started! Racing to 100!');
        this.startRolling();
        break;

      case 'playerMoved':
        this.handlePlayerMoved(msg);
        break;

      case 'gameEnded':
        this.gameEnded = true;
        if (msg.winnerId === this.playerId) {
          this.log(`*** I WON! ***`);
        } else {
          this.log(`Game over. ${msg.winnerName} won!`);
        }
        break;

      case 'error':
        this.log(`Error: ${msg.message}`);
        break;

      case 'pong':
        break;

      default:
        break;
    }
  }

  handlePlayerMoved(msg) {
    if (msg.playerId === this.playerId) {
      this.position = msg.newPosition;
      let moveDesc = `Rolled ${msg.diceRoll}: ${msg.previousPosition} -> ${msg.newPosition}`;
      if (msg.effect) {
        const emoji = msg.effect.type === 'ladder' ? '🪜' : '🐍';
        moveDesc += ` ${emoji} ${msg.effect.type}: ${msg.effect.from} -> ${msg.effect.to}`;
      }
      this.log(moveDesc);
    }
  }

  startRolling() {
    const roll = () => {
      if (this.gameEnded || !this.connected) return;

      this.send({
        action: 'rollDice',
        gameCode: this.gameCode,
        playerId: this.playerId,
      });

      // Random delay before next roll
      const delay = ROLL_DELAY_MIN + Math.random() * (ROLL_DELAY_MAX - ROLL_DELAY_MIN);
      setTimeout(roll, delay);
    };

    // Start with initial delay
    setTimeout(roll, Math.random() * 500);
  }

  startGame() {
    this.log('Starting game...');
    this.send({
      action: 'startGame',
      gameCode: this.gameCode,
      playerId: this.playerId,
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function createGame(creatorName) {
  const response = await fetch(`${API_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creatorName }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create game: ${response.status}`);
  }

  const data = await response.json();
  return { gameCode: data.game.code, creatorId: data.playerId };
}

async function main() {
  console.log('='.repeat(60));
  console.log('  SNAKES AND LADDERS - Headless Bot Race');
  console.log('='.repeat(60));
  console.log(`Server: ${API_URL}`);
  console.log(`Players: ${NUM_PLAYERS}`);
  console.log('');

  // Create the game
  console.log('Creating game...');
  const { gameCode, creatorId } = await createGame(NAMES[0]);
  console.log(`Game created: ${gameCode}`);
  console.log('');

  // Create bot players
  const bots = [];
  for (let i = 0; i < NUM_PLAYERS; i++) {
    bots.push(new BotPlayer(NAMES[i], COLORS[i]));
  }

  // Connect all bots to the game
  console.log('Connecting players...');
  const connectPromises = bots.map((bot) => bot.connect(gameCode));
  await Promise.all(connectPromises);
  console.log('');

  // First bot (creator) already joined via HTTP, find it and set its playerId
  bots[0].playerId = creatorId;

  // Wait a moment for all connections to stabilize
  await new Promise((r) => setTimeout(r, 500));

  // Start the game (creator starts it)
  console.log('Starting race...');
  console.log('-'.repeat(60));
  bots[0].startGame();

  // Wait for game to end
  await new Promise((resolve) => {
    const checkEnded = setInterval(() => {
      if (bots.some((b) => b.gameEnded)) {
        clearInterval(checkEnded);
        resolve();
      }
    }, 100);
  });

  // Give time for final messages
  await new Promise((r) => setTimeout(r, 1000));

  console.log('-'.repeat(60));
  console.log('');

  // Print final standings
  console.log('Final Standings:');
  const sorted = [...bots].sort((a, b) => b.position - a.position);
  sorted.forEach((bot, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    console.log(`  ${medal} ${bot.name.padEnd(8)} - Position ${bot.position}`);
  });

  // Cleanup
  bots.forEach((b) => b.disconnect());
  console.log('');
  console.log('Game complete!');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
