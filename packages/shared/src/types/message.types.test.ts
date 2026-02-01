import { describe, it, expect } from 'vitest';

import { ErrorCodes } from './message.types.js';

describe('message.types', () => {
  describe('ErrorCodes', () => {
    it('should have GAME_NOT_FOUND error code', () => {
      expect(ErrorCodes.GAME_NOT_FOUND).toBe('GAME_NOT_FOUND');
    });

    it('should have GAME_FULL error code', () => {
      expect(ErrorCodes.GAME_FULL).toBe('GAME_FULL');
    });

    it('should have GAME_ALREADY_STARTED error code', () => {
      expect(ErrorCodes.GAME_ALREADY_STARTED).toBe('GAME_ALREADY_STARTED');
    });

    it('should have GAME_NOT_STARTED error code', () => {
      expect(ErrorCodes.GAME_NOT_STARTED).toBe('GAME_NOT_STARTED');
    });

    it('should have NOT_GAME_CREATOR error code', () => {
      expect(ErrorCodes.NOT_GAME_CREATOR).toBe('NOT_GAME_CREATOR');
    });

    it('should have PLAYER_NOT_FOUND error code', () => {
      expect(ErrorCodes.PLAYER_NOT_FOUND).toBe('PLAYER_NOT_FOUND');
    });

    it('should have INVALID_MESSAGE error code', () => {
      expect(ErrorCodes.INVALID_MESSAGE).toBe('INVALID_MESSAGE');
    });

    it('should have INTERNAL_ERROR error code', () => {
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });

    it('should have exactly 8 error codes', () => {
      expect(Object.keys(ErrorCodes)).toHaveLength(8);
    });
  });
});
