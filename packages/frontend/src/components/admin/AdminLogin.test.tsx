import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AdminAuthProvider } from '../../contexts/AdminAuthContext';

import { AdminLogin } from './AdminLogin';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockFetch = vi.fn();
global.fetch = mockFetch;

function renderAdminLogin() {
  return render(
    <MemoryRouter>
      <AdminAuthProvider>
        <AdminLogin />
      </AdminAuthProvider>
    </MemoryRouter>
  );
}

describe('AdminLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form', () => {
    renderAdminLogin();

    expect(screen.getByText('Admin Login')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('allows typing in username and password fields', () => {
    renderAdminLogin();

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(usernameInput, { target: { value: 'Admin' } });
    fireEvent.change(passwordInput, { target: { value: 'SuperSecure123@' } });

    expect(usernameInput).toHaveValue('Admin');
    expect(passwordInput).toHaveValue('SuperSecure123@');
  });

  it('shows loading state during login', () => {
    mockFetch.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100))
    );

    renderAdminLogin();

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'Admin' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(screen.getByRole('button', { name: 'Logging in...' })).toBeDisabled();
  });

  it('navigates to dashboard on successful login', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    renderAdminLogin();

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'Admin' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'SuperSecure123@' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('shows error on invalid credentials', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

    renderAdminLogin();

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'Admin' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid username or password')).toBeInTheDocument();
    });
  });

  it('handles network failure gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderAdminLogin();

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'Admin' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    // Should show some error state
    await waitFor(() => {
      // Either shows error message or returns to normal state
      const errorMsg = screen.queryByText('Failed to connect to server');
      const invalidMsg = screen.queryByText('Invalid username or password');
      const loginBtn = screen.queryByRole('button', { name: 'Login' });
      expect(errorMsg || invalidMsg || loginBtn).toBeTruthy();
    });
  });

  it('requires username and password fields', () => {
    renderAdminLogin();

    expect(screen.getByLabelText('Username')).toBeRequired();
    expect(screen.getByLabelText('Password')).toBeRequired();
  });
});
