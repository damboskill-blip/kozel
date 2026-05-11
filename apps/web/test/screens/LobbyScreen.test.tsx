import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LobbyScreen } from '../../src/screens/LobbyScreen.js';

describe('LobbyScreen', () => {
  it('renders create + join controls', () => {
    render(<LobbyScreen onCreate={vi.fn()} onJoin={vi.fn()} />);
    expect(screen.getByText('Создать стол')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Код стола')).toBeInTheDocument();
  });

  it('clicking create calls onCreate', async () => {
    const onCreate = vi.fn().mockResolvedValue('AB1234');
    render(<LobbyScreen onCreate={onCreate} onJoin={vi.fn()} />);
    fireEvent.click(screen.getByText('Создать стол'));
    await waitFor(() => expect(onCreate).toHaveBeenCalled());
  });

  it('typing code + clicking join calls onJoin with uppercase code', async () => {
    const onJoin = vi.fn().mockResolvedValue(undefined);
    render(<LobbyScreen onCreate={vi.fn()} onJoin={onJoin} />);
    fireEvent.change(screen.getByPlaceholderText('Код стола'), { target: { value: 'ab1234' } });
    fireEvent.click(screen.getByText('Зайти за стол'));
    await waitFor(() => expect(onJoin).toHaveBeenCalledWith('AB1234'));
  });

  it('shows error when onJoin returns error', async () => {
    const onJoin = vi.fn().mockResolvedValue({ error: 'unknown-room' });
    render(<LobbyScreen onCreate={vi.fn()} onJoin={onJoin} />);
    fireEvent.change(screen.getByPlaceholderText('Код стола'), { target: { value: 'XX9999' } });
    fireEvent.click(screen.getByText('Зайти за стол'));
    await waitFor(() => expect(screen.getByText(/Стол не найден|Неверный код/)).toBeInTheDocument());
  });
});
