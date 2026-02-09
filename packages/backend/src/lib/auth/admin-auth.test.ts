import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { validateAdminAuth } from './admin-auth';

describe('admin-auth', () => {
  describe('validateAdminAuth', () => {
    beforeEach(() => {
      process.env.ADMIN_USERNAME = 'Admin';
      process.env.ADMIN_PASSWORD = 'SuperSecure123@';
    });

    afterEach(() => {
      delete process.env.ADMIN_USERNAME;
      delete process.env.ADMIN_PASSWORD;
    });

    it('returns true for valid credentials', () => {
      const validToken = 'Basic ' + Buffer.from('Admin:SuperSecure123@').toString('base64');
      expect(validateAdminAuth(validToken)).toBe(true);
    });

    it('returns false for undefined header', () => {
      expect(validateAdminAuth(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(validateAdminAuth('')).toBe(false);
    });

    it('returns false for non-Basic auth', () => {
      expect(validateAdminAuth('Bearer token123')).toBe(false);
    });

    it('returns false for wrong username', () => {
      const wrongUser = 'Basic ' + Buffer.from('WrongUser:SuperSecure123@').toString('base64');
      expect(validateAdminAuth(wrongUser)).toBe(false);
    });

    it('returns false for wrong password', () => {
      const wrongPass = 'Basic ' + Buffer.from('Admin:wrongpassword').toString('base64');
      expect(validateAdminAuth(wrongPass)).toBe(false);
    });

    it('returns false for malformed base64', () => {
      expect(validateAdminAuth('Basic not-valid-base64!!!')).toBe(false);
    });

    it('returns false for missing colon in credentials', () => {
      const noColon = 'Basic ' + Buffer.from('AdminSuperSecure123@').toString('base64');
      expect(validateAdminAuth(noColon)).toBe(false);
    });

    it('returns false when env vars are not set', () => {
      delete process.env.ADMIN_USERNAME;
      delete process.env.ADMIN_PASSWORD;
      const validToken = 'Basic ' + Buffer.from('Admin:SuperSecure123@').toString('base64');
      expect(validateAdminAuth(validToken)).toBe(false);
    });
  });
});
