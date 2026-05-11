import { useEffect } from 'react';
import { SocketProvider } from './socket/SocketProvider.js';
import { SessionProvider, useSession } from './state/SessionContext.js';
import { RoomProvider, useRoom } from './state/RoomContext.js';
import { ChatProvider, useChat } from './state/ChatContext.js';
import { ToastProvider } from './state/ToastContext.js';
import { IdentityScreen } from './screens/IdentityScreen.js';
import { LobbyScreen } from './screens/LobbyScreen.js';
import { RoomLobbyScreen } from './screens/RoomLobbyScreen.js';
import { TableScreen } from './screens/TableScreen.js';
import { loadSession, saveSession } from './lib/storage.js';

function Shell(): JSX.Element {
  const session = useSession();
  const room = useRoom();
  const chat = useChat();

  // Auto-rejoin last room if we have one saved and we have a player.
  useEffect(() => {
    const s = loadSession();
    if (s?.lastRoom && session.playerId && !room.roomCode) {
      void room.joinRoom(s.lastRoom).then((r) => {
        if (r && 'error' in r) {
          // Stale lastRoom (server restarted, room expired). Forget it so
          // the user lands on the lobby cleanly instead of looping.
          saveSession({ ...s, lastRoom: null });
        }
      });
    }
  }, [session.playerId]);

  // Persist room code on join.
  useEffect(() => {
    const s = loadSession();
    if (!s) return;
    if (room.roomCode !== s.lastRoom) {
      saveSession({ ...s, lastRoom: room.roomCode });
    }
  }, [room.roomCode]);

  if (!session.playerId) {
    return <IdentityScreen onSubmit={(name) => void session.login(name)} />;
  }
  if (!room.roomCode) {
    return (
      <LobbyScreen
        onCreate={async () => {
          const code = await room.createRoom();
          if (code) await room.joinRoom(code);
          return code;
        }}
        onJoin={async (code) => {
          const r = await room.joinRoom(code);
          if ('error' in r) return r;
          return undefined;
        }}
      />
    );
  }
  if (room.status === 'lobby' || !room.state) {
    return (
      <RoomLobbyScreen
        roomCode={room.roomCode}
        seats={room.seats}
        mySeat={room.mySeat}
        onSit={(seat) => void room.takeSeat(seat)}
        onLeave={() => void room.leaveSeat()}
        onReady={(r) => void room.setReady(r)}
        onAddBot={() => void room.addBot()}
      />
    );
  }
  if (room.mySeat === null || !room.state) {
    return (
      <RoomLobbyScreen
        roomCode={room.roomCode}
        seats={room.seats}
        mySeat={room.mySeat}
        onSit={(seat) => void room.takeSeat(seat)}
        onLeave={() => void room.leaveSeat()}
        onReady={(r) => void room.setReady(r)}
        onAddBot={() => void room.addBot()}
      />
    );
  }
  return (
    <TableScreen
      state={room.state}
      seats={room.seats}
      mySeat={room.mySeat}
      onAction={(a) => void room.sendAction(a)}
      onClaimIntercept={() => void room.claimIntercept()}
      onSendChat={(t) => void chat.send(t)}
      chatMessages={chat.messages}
    />
  );
}

export function App(): JSX.Element {
  return (
    <SocketProvider>
      <SessionProvider>
        <RoomProvider>
          <ChatProvider>
            <ToastProvider>
              <Shell />
            </ToastProvider>
          </ChatProvider>
        </RoomProvider>
      </SessionProvider>
    </SocketProvider>
  );
}
