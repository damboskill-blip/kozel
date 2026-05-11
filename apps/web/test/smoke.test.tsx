import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { App } from '../src/App.js';

vi.mock('../src/socket/client.js', () => ({
  DEFAULT_SERVER_URL: 'http://test',
  createSocket: () => ({
    on: vi.fn(), off: vi.fn(), emit: vi.fn(), connect: vi.fn(), disconnect: vi.fn(),
    connected: false,
  }),
}));

describe('App smoke', () => {
  it('mounts without throwing', () => {
    render(<App />);
    // No session, no room → IdentityScreen.
    expect(screen.getByText('Козёл')).toBeInTheDocument();
  });
});
