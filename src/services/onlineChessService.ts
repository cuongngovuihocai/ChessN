import { ref, set, get, update, push, onValue, off, onDisconnect, remove } from "firebase/database";
import { database } from "../firebase";
import { TimeControlMode } from "../types";

export interface OnlinePlayer {
  id: string;
  name: string;
  avatar: string;
  color: 'w' | 'b';
}

export interface OnlineChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  avatar: string;
  text: string;
  timestamp: string;
  roleTag?: string; // 'Trắng', 'Đen', 'Khán giả'
}

export interface OnlineRoomData {
  id: string;
  createdAt: number;
  updatedAt: number;
  status: 'waiting' | 'playing' | 'finished';
  fen: string;
  lastMove: { from: string; to: string; promotion?: string } | null;
  turn: 'w' | 'b';
  player1: OnlinePlayer | null;
  player2: OnlinePlayer | null;
  winner: 'w' | 'b' | 'draw' | null;
  timeControlMode?: TimeControlMode;
  messages?: Record<string, OnlineChatMessage>;
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Generate a clean 6-digit room code
 */

export function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a new room in chesskid_rooms/{roomId}
 */
export async function createOnlineRoom(
  roomId: string,
  player: { id: string; name: string; avatar: string },
  timeControlMode: TimeControlMode = 'standard'
): Promise<OnlineRoomData> {
  const roomRef = ref(database, `chesskid_rooms/${roomId}`);
  const roomData: OnlineRoomData = {
    id: roomId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'waiting',
    fen: START_FEN,
    lastMove: null,
    turn: 'w',
    player1: {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      color: 'w'
    },
    player2: null,
    winner: null,
    timeControlMode,
    messages: {}
  };

  await set(roomRef, roomData);
  return roomData;
}

/**
 * Join an existing room
 */
export async function joinOnlineRoom(
  roomId: string,
  player: { id: string; name: string; avatar: string }
): Promise<{ room: OnlineRoomData; userRole: 'w' | 'b' | 'spectator' }> {
  const roomRef = ref(database, `chesskid_rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    throw new Error(`Phòng "${roomId}" không tồn tại. Bé hãy kiểm tra lại mã phòng nhé!`);
  }

  const room: OnlineRoomData = snapshot.val();
  room.winner = (room.winner === 'w' || room.winner === 'b' || room.winner === 'draw') ? room.winner : null;
  room.lastMove = room.lastMove || null;

  // Check if player is already Player 1
  if (room.player1 && room.player1.id === player.id) {
    return { room, userRole: 'w' };
  }

  // Check if player is already Player 2
  if (room.player2 && room.player2.id === player.id) {
    return { room, userRole: 'b' };
  }

  // Assign Player 1 if empty
  if (!room.player1) {
    const updatedP1: OnlinePlayer = {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      color: 'w'
    };
    await update(roomRef, {
      player1: updatedP1,
      updatedAt: Date.now()
    });
    return { room: { ...room, player1: updatedP1 }, userRole: 'w' };
  }

  // Assign Player 2 if empty
  if (!room.player2) {
    const updatedP2: OnlinePlayer = {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      color: 'b'
    };
    await update(roomRef, {
      player2: updatedP2,
      status: 'waiting',
      updatedAt: Date.now()
    });
    return { room: { ...room, player2: updatedP2, status: 'waiting' }, userRole: 'b' };
  }

  // Spectator mode
  return { room, userRole: 'spectator' };
}

/**
 * Subscribe to real-time changes in room
 */
export function subscribeToOnlineRoom(
  roomId: string,
  callback: (room: OnlineRoomData | null) => void
): () => void {
  const roomRef = ref(database, `chesskid_rooms/${roomId}`);
  
  const listener = onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as OnlineRoomData);
    } else {
      callback(null);
    }
  });

  return () => {
    off(roomRef, 'value', listener);
  };
}

/**
 * Make a move and sync to RTDB
 */
export async function makeOnlineMove(
  roomId: string,
  fen: string,
  move: { from: string; to: string; promotion?: string },
  nextTurn: 'w' | 'b',
  winner: 'w' | 'b' | 'draw' | null
): Promise<void> {
  const roomRef = ref(database, `chesskid_rooms/${roomId}`);
  
  const cleanMove: { from: string; to: string; promotion?: string } = {
    from: move.from,
    to: move.to
  };
  if (move.promotion) {
    cleanMove.promotion = move.promotion;
  }

  await update(roomRef, {
    fen,
    lastMove: cleanMove,
    turn: nextTurn,
    winner: winner || null,
    status: winner ? 'finished' : 'playing',
    updatedAt: Date.now()
  });
}

/**
 * Resign game in online room
 */
export async function resignOnlineGame(roomId: string, resigningRole: 'w' | 'b'): Promise<void> {
  const roomRef = ref(database, `chesskid_rooms/${roomId}`);
  const winner = resigningRole === 'w' ? 'b' : 'w';
  await update(roomRef, {
    winner,
    status: 'finished',
    updatedAt: Date.now()
  });
}

/**
 * Start online game match
 */
export async function startOnlineGame(roomId: string): Promise<void> {
  const roomRef = ref(database, `chesskid_rooms/${roomId}`);
  await update(roomRef, {
    status: 'playing',
    updatedAt: Date.now()
  });
}

/**
 * Update time control mode for online room
 */
export async function updateOnlineTimeControlMode(roomId: string, mode: TimeControlMode): Promise<void> {
  const roomRef = ref(database, `chesskid_rooms/${roomId}`);
  await update(roomRef, {
    timeControlMode: mode,
    updatedAt: Date.now()
  });
}

/**
 * Reset game position for new match
 */
export async function resetOnlineGame(roomId: string, _isTwoPlayersPresent = true): Promise<void> {
  const roomRef = ref(database, `chesskid_rooms/${roomId}`);
  await update(roomRef, {
    fen: START_FEN,
    lastMove: null,
    turn: 'w',
    winner: null,
    status: 'waiting',
    updatedAt: Date.now()
  });
}

/**
 * Send real-time chat message in online room
 */
export async function sendOnlineChatMessage(
  roomId: string,
  message: {
    senderId: string;
    senderName: string;
    avatar: string;
    text: string;
    roleTag?: string;
  }
): Promise<void> {
  const messagesRef = ref(database, `chesskid_rooms/${roomId}/messages`);
  const newMsgRef = push(messagesRef);
  await set(newMsgRef, {
    id: newMsgRef.key,
    senderId: message.senderId,
    senderName: message.senderName,
    avatar: message.avatar,
    text: message.text,
    timestamp: new Date().toISOString(),
    roleTag: message.roleTag || ''
  });
}

/**
 * Configure onDisconnect auto-cleanup for an online room.
 * - If isOnlyPlayer === true (only 1 player in the room):
 *   Registers onDisconnect(roomRef).remove() so if this user disconnects (tab closed, internet dropped),
 *   the entire empty room gets automatically deleted from Firebase.
 * - If isOnlyPlayer === false (2 players present in room):
 *   Cancels onDisconnect(roomRef) so if either player disconnects, the room remains intact.
 */
export function setupRoomOnDisconnect(roomId: string, isOnlyPlayer: boolean) {
  const roomRef = ref(database, `chesskid_rooms/${roomId}`);
  const disconnectRef = onDisconnect(roomRef);
  if (isOnlyPlayer) {
    disconnectRef.remove().catch((err) => {
      console.warn("Lỗi đăng ký onDisconnect remove:", err);
    });
  } else {
    disconnectRef.cancel().catch((err) => {
      console.warn("Lỗi hủy bỏ onDisconnect:", err);
    });
  }
}

/**
 * Leave online room manually
 */
export async function leaveOnlineRoomService(
  roomId: string,
  userRole: 'w' | 'b' | 'spectator' | null,
  currentRoom: OnlineRoomData | null
): Promise<void> {
  if (!currentRoom) return;

  const roomRef = ref(database, `chesskid_rooms/${roomId}`);

  // Cancel any pending onDisconnect for this client socket
  try {
    await onDisconnect(roomRef).cancel();
  } catch (e) {
    // Ignore error
  }

  if (userRole === 'spectator' || !userRole) {
    return; // Spectators do not alter room player slots
  }

  const hasP1 = Boolean(currentRoom.player1);
  const hasP2 = Boolean(currentRoom.player2);

  // If only 1 player was in the room (e.g. user was player1 and player2 is null), delete entire room!
  if ((userRole === 'w' && !hasP2) || (userRole === 'b' && !hasP1)) {
    await remove(roomRef);
    return;
  }

  // If both players were in room, don't delete room; just clear the leaving player's slot
  if (userRole === 'w') {
    await update(roomRef, { player1: null, updatedAt: Date.now() });
  } else if (userRole === 'b') {
    await update(roomRef, { player2: null, updatedAt: Date.now() });
  }
}
