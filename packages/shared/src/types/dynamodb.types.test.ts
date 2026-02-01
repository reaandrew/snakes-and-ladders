import { describe, it, expect } from 'vitest';

import { Keys } from './dynamodb.types.js';

describe('dynamodb.types', () => {
  describe('Keys', () => {
    describe('game', () => {
      it('should generate correct game keys', () => {
        const keys = Keys.game('ABC123');
        expect(keys.PK).toBe('GAME#ABC123');
        expect(keys.SK).toBe('METADATA');
      });
    });

    describe('player', () => {
      it('should generate correct player keys', () => {
        const keys = Keys.player('ABC123', 'player-1');
        expect(keys.PK).toBe('GAME#ABC123');
        expect(keys.SK).toBe('PLAYER#player-1');
      });
    });

    describe('connection', () => {
      it('should generate correct connection keys', () => {
        const keys = Keys.connection('conn-abc');
        expect(keys.PK).toBe('CONNECTION#conn-abc');
        expect(keys.SK).toBe('METADATA');
      });
    });

    describe('gamePlayersPrefix', () => {
      it('should generate correct prefix for querying players', () => {
        const prefix = Keys.gamePlayersPrefix('ABC123');
        expect(prefix.PK).toBe('GAME#ABC123');
        expect(prefix.SK_PREFIX).toBe('PLAYER#');
      });
    });

    describe('move', () => {
      it('should generate correct move keys', () => {
        const keys = Keys.move('ABC123', 'move-001');
        expect(keys.PK).toBe('GAME#ABC123');
        expect(keys.SK).toBe('MOVE#move-001');
      });
    });

    describe('gameMovesPrefix', () => {
      it('should generate correct prefix for querying moves', () => {
        const prefix = Keys.gameMovesPrefix('ABC123');
        expect(prefix.PK).toBe('GAME#ABC123');
        expect(prefix.SK_PREFIX).toBe('MOVE#');
      });
    });
  });
});
