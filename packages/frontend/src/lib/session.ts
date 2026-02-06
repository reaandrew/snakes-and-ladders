const SESSION_KEY = 'snakes-and-ladders-session';

export interface GameSession {
  gameCode: string;
  playerId: string;
  isCreator: boolean;
  playerName: string;
}

export function saveSession(session: GameSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): GameSession | null {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (data) {
      return JSON.parse(data) as GameSession;
    }
  } catch {
    // Invalid session data
  }
  return null;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
