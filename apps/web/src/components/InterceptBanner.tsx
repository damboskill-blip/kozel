import { useEffect, useState } from 'react';
import { ru } from '../lib/i18n.js';
import styles from './InterceptBanner.module.css';

export type InterceptBannerProps = {
  eligible: boolean;
  deadlineMs: number;
  onClaim: () => void;
};

export function InterceptBanner({ eligible, deadlineMs, onClaim }: InterceptBannerProps): JSX.Element | null {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadlineMs - Date.now()));
  useEffect(() => {
    if (!eligible) return;
    const tick = (): void => setRemaining(Math.max(0, deadlineMs - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [eligible, deadlineMs]);

  if (!eligible) return null;
  const seconds = Math.ceil(remaining / 1000);
  return (
    <div className={styles.banner} data-testid="intercept-banner">
      <button onClick={onClaim}>{ru.table.intercept}</button>
      <span className={styles.countdown}>{seconds} {ru.table.interceptCountdown}</span>
    </div>
  );
}
