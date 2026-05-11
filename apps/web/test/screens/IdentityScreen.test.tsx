import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IdentityScreen } from '../../src/screens/IdentityScreen.js';

describe('IdentityScreen', () => {
  it('renders title and input', () => {
    render(<IdentityScreen onSubmit={() => {}} />);
    expect(screen.getByText('Козёл')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Как тебя зовут/)).toBeInTheDocument();
  });

  it('submit calls onSubmit with trimmed name', () => {
    const onSubmit = vi.fn();
    render(<IdentityScreen onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText(/Как тебя зовут/), { target: { value: '  Alice  ' } });
    fireEvent.click(screen.getByText('Войти'));
    expect(onSubmit).toHaveBeenCalledWith('Alice');
  });

  it('does not submit empty', () => {
    const onSubmit = vi.fn();
    render(<IdentityScreen onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('Войти'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
