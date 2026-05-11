import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { App } from '../src/App.js';

describe('App smoke', () => {
  it('renders root', () => {
    render(<App />);
    expect(screen.getByTestId('app-root')).toHaveTextContent('Козёл');
  });
});
