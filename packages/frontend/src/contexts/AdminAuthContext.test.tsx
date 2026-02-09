import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { AdminAuthProvider, useAdminAuth } from './AdminAuthContext';

describe('AdminAuthContext', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('useAdminAuth', () => {
    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useAdminAuth());
      }).toThrow('useAdminAuth must be used within an AdminAuthProvider');
    });

    it('starts unauthenticated when no token in sessionStorage', () => {
      const { result } = renderHook(() => useAdminAuth(), {
        wrapper: AdminAuthProvider,
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('starts authenticated when token exists in sessionStorage', () => {
      sessionStorage.setItem('admin_auth_token', 'Basic dGVzdDp0ZXN0');

      const { result } = renderHook(() => useAdminAuth(), {
        wrapper: AdminAuthProvider,
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    describe('login', () => {
      it('returns true and stores token on successful login', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true });

        const { result } = renderHook(() => useAdminAuth(), {
          wrapper: AdminAuthProvider,
        });

        let success: boolean = false;
        await act(async () => {
          success = await result.current.login('Admin', 'SuperSecure123@');
        });

        expect(success).toBe(true);
        expect(result.current.isAuthenticated).toBe(true);
        expect(sessionStorage.getItem('admin_auth_token')).toBe(
          'Basic QWRtaW46U3VwZXJTZWN1cmUxMjNA'
        );
      });

      it('returns false on failed login', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

        const { result } = renderHook(() => useAdminAuth(), {
          wrapper: AdminAuthProvider,
        });

        let success: boolean = true;
        await act(async () => {
          success = await result.current.login('Admin', 'wrong');
        });

        expect(success).toBe(false);
        expect(result.current.isAuthenticated).toBe(false);
      });

      it('returns false on network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => useAdminAuth(), {
          wrapper: AdminAuthProvider,
        });

        let success: boolean = true;
        await act(async () => {
          success = await result.current.login('Admin', 'test');
        });

        expect(success).toBe(false);
      });
    });

    describe('logout', () => {
      it('clears authentication state and sessionStorage', () => {
        sessionStorage.setItem('admin_auth_token', 'Basic dGVzdDp0ZXN0');

        const { result } = renderHook(() => useAdminAuth(), {
          wrapper: AdminAuthProvider,
        });

        expect(result.current.isAuthenticated).toBe(true);

        act(() => {
          result.current.logout();
        });

        expect(result.current.isAuthenticated).toBe(false);
        expect(sessionStorage.getItem('admin_auth_token')).toBeNull();
      });
    });

    describe('authFetch', () => {
      it('adds authorization header to requests', async () => {
        sessionStorage.setItem('admin_auth_token', 'Basic dGVzdDp0ZXN0');
        mockFetch.mockResolvedValueOnce({ ok: true });

        const { result } = renderHook(() => useAdminAuth(), {
          wrapper: AdminAuthProvider,
        });

        await act(async () => {
          await result.current.authFetch('http://localhost:3001/admin/games');
        });

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/admin/games', {
          headers: {
            Authorization: 'Basic dGVzdDp0ZXN0',
          },
        });
      });

      it('throws error when not authenticated', async () => {
        const { result } = renderHook(() => useAdminAuth(), {
          wrapper: AdminAuthProvider,
        });

        await expect(result.current.authFetch('http://localhost:3001/admin/games')).rejects.toThrow(
          'Not authenticated'
        );
      });

      it('merges custom headers with auth header', async () => {
        sessionStorage.setItem('admin_auth_token', 'Basic dGVzdDp0ZXN0');
        mockFetch.mockResolvedValueOnce({ ok: true });

        const { result } = renderHook(() => useAdminAuth(), {
          wrapper: AdminAuthProvider,
        });

        await act(async () => {
          await result.current.authFetch('http://localhost:3001/admin/games', {
            headers: { 'Content-Type': 'application/json' },
          });
        });

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/admin/games', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Basic dGVzdDp0ZXN0',
          },
        });
      });
    });
  });
});
