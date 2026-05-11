import { useState } from 'react';
import { ru } from '../lib/i18n.js';
import styles from './IdentityScreen.module.css';

export type IdentityScreenProps = {
  onSubmit: (name: string) => void;
};

export function IdentityScreen({ onSubmit }: IdentityScreenProps): JSX.Element {
  const [name, setName] = useState('');
  const submit = (): void => {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
  };
  return (
    <div className={styles.screen}>
      <div className={styles.title}>{ru.app.title}</div>
      <input
        className={styles.input}
        placeholder={ru.identity.namePlaceholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
      />
      <button className={styles.button} onClick={submit}>{ru.identity.enter}</button>
    </div>
  );
}
