import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

vi.mock('./api/auth', () => ({
  refreshSession: vi.fn().mockRejectedValue(new Error('No session')),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  logoutUser: vi.fn(),
  oauthUrl: (provider) => `http://localhost:3001/api/auth/${provider}`
}));

function renderApp() {
  window.history.pushState({}, 'Login', '/login');
  render(
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}

describe('App', () => {
  it('renders the login screen', async () => {
    renderApp();
    expect(await screen.findByRole('heading', { name: /log in to continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });
});
