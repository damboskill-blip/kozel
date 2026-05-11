import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InterceptBanner } from '../../src/components/InterceptBanner.js';

describe('InterceptBanner', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders when eligible=true', () => {
    render(<InterceptBanner eligible deadlineMs={Date.now() + 3000} onClaim={() => {}} />);
    expect(screen.getByTestId('intercept-banner')).toBeInTheDocument();
  });

  it('renders nothing when eligible=false', () => {
    const { container } = render(<InterceptBanner eligible={false} deadlineMs={0} onClaim={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('clicking the button calls onClaim', () => {
    const onClaim = vi.fn();
    render(<InterceptBanner eligible deadlineMs={Date.now() + 3000} onClaim={onClaim} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClaim).toHaveBeenCalled();
  });

  it('shows countdown in seconds', () => {
    render(<InterceptBanner eligible deadlineMs={Date.now() + 2500} onClaim={() => {}} />);
    expect(screen.getByTestId('intercept-banner').textContent).toMatch(/3|2/);
  });
});
