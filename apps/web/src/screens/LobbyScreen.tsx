import { useState } from 'react';
import { ru } from '../lib/i18n.js';
import styles from './LobbyScreen.module.css';

export type LobbyScreenProps = {
  onCreate: () => Promise<string | null>;
  onJoin: (code: string) => Promise<undefined | { error: string }>;
};

export function LobbyScreen({ onCreate, onJoin }: LobbyScreenProps): JSX.Element {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const join = async (): Promise<void> => {
    setError(null);
    const normalized = code.toUpperCase().trim();
    if (!/^[A-Z0-9]{6}$/.test(normalized)) {
      setError(ru.lobby.invalidCode);
      return;
    }
    const r = await onJoin(normalized);
    if (r && 'error' in r) setError(ru.error.roomNotFound);
  };

  return (
    <div className={styles.screen}>
      <div className={styles.section}>
        <button className={styles.button} onClick={onCreate}>{ru.lobby.createRoom}</button>
      </div>
      <div className={styles.divider}>или</div>
      <div className={styles.section}>
        <input
          className={styles.input}
          placeholder={ru.lobby.roomCodePlaceholder}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
        />
        <button className={`${styles.button} ${styles.secondary}`} onClick={join}>{ru.lobby.joinRoom}</button>
        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}
