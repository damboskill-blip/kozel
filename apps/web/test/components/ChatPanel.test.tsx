import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatPanel } from '../../src/components/ChatPanel.js';

describe('ChatPanel', () => {
  it('renders messages', () => {
    render(<ChatPanel messages={[
      { from: 0, name: 'Alice', text: 'hi', at: 1 },
      { from: 1, name: 'Bob', text: 'hello', at: 2 },
    ]} onSend={() => {}} />);
    expect(screen.getByText('hi')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('Enter key sends and clears input', () => {
    const onSend = vi.fn();
    render(<ChatPanel messages={[]} onSend={onSend} />);
    const input = screen.getByPlaceholderText(/Сообщение/);
    fireEvent.change(input, { target: { value: 'hey' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('hey');
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('empty messages are not sent', () => {
    const onSend = vi.fn();
    render(<ChatPanel messages={[]} onSend={onSend} />);
    const input = screen.getByPlaceholderText(/Сообщение/);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
  });
});
