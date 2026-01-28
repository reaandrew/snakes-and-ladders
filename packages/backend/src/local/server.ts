import { createServer } from 'http';

import {
  DEFAULT_BOARD_CONFIG,
  PLAYER_COLORS,
  type Game,
  type Player,
  type ClientMessage,
  type ServerMessage,
} from '@snakes-and-ladders/shared';
import { nanoid } from 'nanoid';
import { WebSocketServer, WebSocket } from 'ws';

// In-memory storage
const games = new Map<string, Game>();
const players = new Map<string, Player[]>();
const connections = new Map<WebSocket, { gameCode?: string; playerId?: string }>();
const gameConnections = new Map<string, Set<WebSocket>>();

function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function processMove(position: number, diceRoll: number, board: typeof DEFAULT_BOARD_CONFIG) {
  const targetPosition = position + diceRoll;

  if (targetPosition > board.size) {
    return { newPosition: position, effect: undefined, isWinner: false };
  }

  if (targetPosition === board.size) {
    return { newPosition: targetPosition, effect: undefined, isWinner: true };
  }

  const snakeOrLadder = board.snakesAndLadders.find((s) => s.start === targetPosition);
  if (snakeOrLadder) {
    return {
      newPosition: snakeOrLadder.end,
      effect: { type: snakeOrLadder.type, from: targetPosition, to: snakeOrLadder.end },
      isWinner: snakeOrLadder.end === board.size,
    };
  }

  return { newPosition: targetPosition, effect: undefined, isWinner: false };
}

function broadcast(gameCode: string, message: ServerMessage, exclude?: WebSocket) {
  const conns = gameConnections.get(gameCode);
  if (!conns) return;

  const data = JSON.stringify(message);
  for (const ws of conns) {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function sendTo(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// HTTP Server for REST endpoints
const httpServer = createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  // POST /games - Create game
  if (req.method === 'POST' && url.pathname === '/games') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { creatorName } = JSON.parse(body) as { creatorName?: string };
        if (!creatorName?.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Creator name is required' }));
          return;
        }

        const gameCode = generateGameCode();
        const playerId = nanoid();
        const now = new Date().toISOString();

        const game: Game = {
          code: gameCode,
          status: 'waiting',
          creatorId: playerId,
          board: DEFAULT_BOARD_CONFIG,
          createdAt: now,
          updatedAt: now,
        };

        const player: Player = {
          id: playerId,
          gameCode,
          name: creatorName.trim(),
          color: PLAYER_COLORS[0],
          position: 0,
          isConnected: false,
          joinedAt: now,
        };

        games.set(gameCode, game);
        players.set(gameCode, [player]);
        gameConnections.set(gameCode, new Set());

        console.log(`[HTTP] Game created: ${gameCode} by ${creatorName}`);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ game, playerId }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // GET /games/:code - Get game
  const gameMatch = url.pathname.match(/^\/games\/([A-Z0-9]+)$/);
  if (req.method === 'GET' && gameMatch) {
    const code = gameMatch[1];
    const game = games.get(code);

    if (!game) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Game not found' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ game, players: players.get(code) || [] }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  connections.set(ws, {});

  ws.on('message', (rawData) => {
    try {
      let dataStr: string;
      if (Buffer.isBuffer(rawData)) {
        dataStr = rawData.toString('utf8');
      } else if (Array.isArray(rawData)) {
        dataStr = Buffer.concat(rawData).toString('utf8');
      } else {
        dataStr = Buffer.from(new Uint8Array(rawData)).toString('utf8');
      }
      const message = JSON.parse(dataStr) as ClientMessage;
      handleMessage(ws, message);
    } catch (err) {
      console.error('[WS] Invalid message:', err);
    }
  });

  ws.on('close', () => {
    const conn = connections.get(ws);
    if (conn?.gameCode && conn?.playerId) {
      const gamePlayers = players.get(conn.gameCode);
      const player = gamePlayers?.find((p) => p.id === conn.playerId);

      if (player) {
        player.isConnected = false;
        broadcast(conn.gameCode, {
          type: 'playerLeft',
          playerId: conn.playerId,
          playerName: player.name,
        });
        console.log(`[WS] Player left: ${player.name} from ${conn.gameCode}`);
      }

      gameConnections.get(conn.gameCode)?.delete(ws);
    }
    connections.delete(ws);
    console.log('[WS] Client disconnected');
  });
});

function handleMessage(ws: WebSocket, message: ClientMessage) {
  switch (message.action) {
    case 'ping':
      sendTo(ws, { type: 'pong' });
      break;

    case 'joinGame':
      handleJoinGame(ws, message.gameCode, message.playerName);
      break;

    case 'startGame':
      handleStartGame(ws, message.gameCode, message.playerId);
      break;

    case 'rollDice':
      handleRollDice(ws, message.gameCode, message.playerId);
      break;

    default:
      sendTo(ws, { type: 'error', code: 'INVALID_MESSAGE', message: 'Unknown action' });
  }
}

function handleJoinGame(ws: WebSocket, gameCode: string, playerName: string) {
  const game = games.get(gameCode);
  if (!game) {
    sendTo(ws, { type: 'error', code: 'GAME_NOT_FOUND', message: 'Game not found' });
    return;
  }

  if (game.status !== 'waiting') {
    sendTo(ws, {
      type: 'error',
      code: 'GAME_ALREADY_STARTED',
      message: 'Game has already started',
    });
    return;
  }

  const gamePlayers = players.get(gameCode) || [];

  // Check if this is an existing player reconnecting
  let player = gamePlayers.find((p) => p.name === playerName);
  let isNewPlayer = false;

  if (!player) {
    if (gamePlayers.length >= PLAYER_COLORS.length) {
      sendTo(ws, { type: 'error', code: 'GAME_FULL', message: 'Game is full' });
      return;
    }

    // Create new player
    player = {
      id: nanoid(),
      gameCode,
      name: playerName,
      color: PLAYER_COLORS[gamePlayers.length],
      position: 0,
      isConnected: true,
      joinedAt: new Date().toISOString(),
    };
    gamePlayers.push(player);
    players.set(gameCode, gamePlayers);
    isNewPlayer = true;
  } else {
    player.isConnected = true;
  }

  // Link connection to game
  connections.set(ws, { gameCode, playerId: player.id });
  gameConnections.get(gameCode)?.add(ws);

  console.log(`[WS] Player joined: ${playerName} -> ${gameCode} (new: ${isNewPlayer})`);

  // Send joined confirmation
  sendTo(ws, {
    type: 'joinedGame',
    playerId: player.id,
    game,
    players: gamePlayers,
  });

  // Notify others if new player
  if (isNewPlayer) {
    broadcast(gameCode, { type: 'playerJoined', player }, ws);
  }
}

function handleStartGame(ws: WebSocket, gameCode: string, playerId: string) {
  const game = games.get(gameCode);
  if (!game) {
    sendTo(ws, { type: 'error', code: 'GAME_NOT_FOUND', message: 'Game not found' });
    return;
  }

  if (game.creatorId !== playerId) {
    sendTo(ws, {
      type: 'error',
      code: 'NOT_GAME_CREATOR',
      message: 'Only the creator can start the game',
    });
    return;
  }

  if (game.status !== 'waiting') {
    sendTo(ws, {
      type: 'error',
      code: 'GAME_ALREADY_STARTED',
      message: 'Game has already started',
    });
    return;
  }

  game.status = 'playing';
  game.updatedAt = new Date().toISOString();

  // Set all players to position 1
  const gamePlayers = players.get(gameCode) || [];
  gamePlayers.forEach((p) => (p.position = 1));

  console.log(`[WS] Game started: ${gameCode}`);

  broadcast(gameCode, { type: 'gameStarted', game });
}

function handleRollDice(ws: WebSocket, gameCode: string, playerId: string) {
  const game = games.get(gameCode);
  if (!game) {
    sendTo(ws, { type: 'error', code: 'GAME_NOT_FOUND', message: 'Game not found' });
    return;
  }

  if (game.status !== 'playing') {
    sendTo(ws, { type: 'error', code: 'GAME_NOT_STARTED', message: 'Game has not started' });
    return;
  }

  const gamePlayers = players.get(gameCode) || [];
  const player = gamePlayers.find((p) => p.id === playerId);

  if (!player) {
    sendTo(ws, { type: 'error', code: 'PLAYER_NOT_FOUND', message: 'Player not found' });
    return;
  }

  const dice = rollDice();
  const previousPosition = player.position;
  const result = processMove(previousPosition, dice, game.board);

  player.position = result.newPosition;

  console.log(`[WS] ${player.name} rolled ${dice}: ${previousPosition} -> ${result.newPosition}`);

  broadcast(gameCode, {
    type: 'playerMoved',
    playerId,
    playerName: player.name,
    diceRoll: dice,
    previousPosition,
    newPosition: result.newPosition,
    effect: result.effect as { type: 'snake' | 'ladder'; from: number; to: number } | undefined,
  });

  if (result.isWinner) {
    game.status = 'finished';
    game.winnerId = playerId;
    console.log(`[WS] Game ended! Winner: ${player.name}`);
    broadcast(gameCode, { type: 'gameEnded', winnerId: playerId, winnerName: player.name });
  }
}

// Handle upgrade for WebSocket
httpServer.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

const HTTP_PORT = 3001;
const WS_PORT = 3001; // Same port - WS upgrades from HTTP

httpServer.listen(HTTP_PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         Snakes & Ladders Local Development Server          ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  HTTP API:    http://localhost:${HTTP_PORT}                      ║
║  WebSocket:   ws://localhost:${WS_PORT}                          ║
║                                                            ║
║  Endpoints:                                                ║
║    POST /games          - Create a new game                ║
║    GET  /games/:code    - Get game state                   ║
║                                                            ║
║  WebSocket Actions:                                        ║
║    joinGame, startGame, rollDice, ping                     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
