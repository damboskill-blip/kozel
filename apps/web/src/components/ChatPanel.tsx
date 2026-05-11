import { useState } from 'react';
import type { ChatMsg } from '../state/ChatContext.js';
import { ru } from '../lib/i18n.js';
import styles from './ChatPanel.module.css';

export type ChatPanelProps = {
  messages: ChatMsg[];
  onSend: (text: string) => void;
};

export function ChatPanel({ messages, onSend }: ChatPanelProps): JSX.Element {
  const [text, setText] = useState('');
  const submit = (): void => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  };
  return (
    <div className={styles.panel} data-testid="chat-panel">
      <div className={styles.list}>
        {messages.map((m, i) => (
          <div className={styles.msg} key={i}>
            <span className={styles.from}>{m.name}:</span>
            <span>{m.text}</span>
          </div>
        ))}
      </div>
      <input
        className={styles.input}
        placeholder={ru.chat.placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
      />
    </div>
  );
}
