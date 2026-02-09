import { describe, it, expect, beforeEach } from 'vitest';

import { saveSession, loadSession, clearSession, type GameSession } from './session';

const mockSession: GameSession = {
  gameCode: 'ABC123',
  playerId: 'player-1',
  isCreator: true,
  playerName: 'TestPlayer',
};

describe('session', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveSession', () => {
    it('stores session JSON in localStorage', () => {
      saveSession(mockSession);
      const stored = localStorage.getItem('snakes-and-ladders-session');
      expect(stored).toBe(JSON.stringify(mockSession));
    });
  });

  describe('loadSession', () => {
    it('returns null when no session exists', () => {
      expect(loadSession()).toBeNull();
    });

    it('returns session when previously saved', () => {
      saveSession(mockSession);
      const loaded = loadSession();
      expect(loaded).toEqual(mockSession);
    });

    it('returns null for invalid JSON', () => {
      localStorage.setItem('snakes-and-ladders-session', '{invalid json');
      expect(loadSession()).toBeNull();
    });
  });

  describe('clearSession', () => {
    it('removes session from localStorage', () => {
      saveSession(mockSession);
      expect(loadSession()).not.toBeNull();
      clearSession();
      expect(loadSession()).toBeNull();
    });

    it('does not throw when no session exists', () => {
      expect(() => clearSession()).not.toThrow();
    });
  });
});
