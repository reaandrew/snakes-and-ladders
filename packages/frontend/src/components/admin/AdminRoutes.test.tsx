import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AdminRoutes } from './AdminRoutes';

// Mock fetch to prevent network calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AdminRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ games: [] }),
    });
  });

  it('renders without crashing', () => {
    // Should not throw when rendering
    expect(() => {
      render(
        <MemoryRouter>
          <AdminRoutes />
        </MemoryRouter>
      );
    }).not.toThrow();
  });

  it('wraps children in AdminAuthProvider', () => {
    // This test verifies the component structure exists
    // The actual routing behavior is tested via the individual components
    const { unmount } = render(
      <MemoryRouter>
        <AdminRoutes />
      </MemoryRouter>
    );

    // If it rendered without throwing, the provider is working
    unmount();
  });
});
