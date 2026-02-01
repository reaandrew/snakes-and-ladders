import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

interface AdminAuthContextValue {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const AUTH_TOKEN_KEY = 'admin_auth_token';

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  });

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    const credentials = btoa(`${username}:${password}`);
    const token = `Basic ${credentials}`;

    // Test credentials against the API
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    try {
      const response = await fetch(`${apiUrl}/admin/games`, {
        headers: { Authorization: token },
      });

      if (response.ok) {
        setAuthToken(token);
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        return true;
      }
    } catch {
      // Auth failed
    }

    return false;
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }, []);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      if (!authToken) {
        throw new Error('Not authenticated');
      }

      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: authToken,
        },
      });
    },
    [authToken]
  );

  const value = useMemo(
    () => ({
      isAuthenticated: !!authToken,
      login,
      logout,
      authFetch,
    }),
    [authToken, login, logout, authFetch]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
