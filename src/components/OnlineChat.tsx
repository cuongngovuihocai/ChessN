import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Copy, Check, Users, Shield, Sparkles, MessageSquare, ExternalLink } from 'lucide-react';
import { OnlineChatMessage, OnlineRoomData, OnlinePlayer } from '../services/onlineChessService';
import { getAvatars } from '../utils/profileStorage';

interface OnlineChatProps {
  room: OnlineRoomData | null;
  currentUserId: string;
  userRole: 'w' | 'b' | 'spectator' | null;
  onSendMessage: (text: string) => void;
  onLeaveRoom: () => void;
  playerName: string;
  playerAvatar: string;
  hideRabbitNarration?: boolean;
}

export const OnlineChat: React.FC<OnlineChatProps> = ({
  room,
  currentUserId,
  userRole,
  onSendMessage,
  onLeaveRoom,
  playerName,
  playerAvatar,
  hideRabbitNarration = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const rawMessagesList = room?.messages ? Object.values(room.messages) : [];
  const messagesList = rawMessagesList.filter((msg) => {
    if (hideRabbitNarration) {
      const isReferee =
        msg.senderId === 'referee_rabbit_master' ||
        msg.roleTag === 'Trọng tài' ||
        msg.avatar === '🐰' ||
        (msg.senderName && msg.senderName.includes('Sư phụ Thỏ'));
      if (isReferee) return false;
    }
    return true;
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesList.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleSendQuickMsg = (msg: string) => {
    onSendMessage(msg);
  };

  const handleCopyLink = () => {
    if (!room) return;
    const roomUrl = `${window.location.origin}${window.location.pathname}?room=${room.id}`;
    navigator.clipboard.writeText(roomUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(() => {
      prompt("Sao chép đường dẫn phòng này:", roomUrl);
    });
  };

  const getRoleBadge = (role?: string) => {
    if (role === 'Trọng tài') return <span className="text-[11px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">Trọng tài 🐰</span>;
    if (role === 'Trắng' || role === 'w') return <span className="text-[11px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">Quân Trắng ⚪</span>;
    if (role === 'Đen' || role === 'b') return <span className="text-[11px] font-black bg-zinc-800 text-white px-2 py-0.5 rounded-full border border-zinc-600">Quân Đen ⚫</span>;
    return <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Khán giả 👁️</span>;
  };

  const renderPlayerAvatar = (avatarStr: string) => {
    const found = getAvatars().find(a => a.id === avatarStr);
    return found ? found.emoji : (avatarStr || '🦁');
  };

  return (
    <div className="flex flex-col h-[500px] sm:h-[588px] lg:h-[710px] w-full rounded-3xl border-4 border-[#369662] bg-[#FFFDFB] shadow-md overflow-hidden" style={{ borderStyle: 'solid' }}>
      {/* Online Chat Room Header */}
      <div className="bg-[#369662] text-white p-3.5 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between whitespace-nowrap">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-emerald-300 rounded-full animate-ping shrink-0" />
            <h3 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5 shrink-0">
              <span>Phòng: {room?.id}</span>
            </h3>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onLeaveRoom}
              className="text-[12px] bg-red-600/80 hover:bg-red-700 text-white py-1 px-2.5 rounded-xl font-bold transition-all cursor-pointer active:scale-95"
              title="Thoát phòng đấu online"
            >
              Rời phòng
            </button>
          </div>
        </div>

        {/* Players in Room status banner */}
        <div className="flex items-center justify-between bg-black/15 p-2 rounded-2xl border border-white/20 text-[12px]">
          {/* Player 1 (White) */}
          <div className="flex items-center space-x-1.5">
            <span className="text-base">{room?.player1 ? renderPlayerAvatar(room.player1.avatar) : '❓'}</span>
            <span className="font-bold truncate max-w-[90px]">{room?.player1?.name || 'Đang chờ...'}</span>
            <span className="text-[10px] bg-white text-zinc-800 font-extrabold px-1.5 py-0.5 rounded-md">⚪</span>
          </div>

          <span className="font-black text-emerald-200 text-xs">VS</span>

          {/* Player 2 (Black) */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] bg-zinc-900 text-white font-extrabold px-1.5 py-0.5 rounded-md">⚫</span>
            <span className="font-bold truncate max-w-[90px]">{room?.player2?.name || 'Đang chờ...'}</span>
            <span className="text-base">{room?.player2 ? renderPlayerAvatar(room.player2.avatar) : '❓'}</span>
          </div>
        </div>

        {/* Current user role indicator */}
        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-100 px-1">
          <span>Vai trò của bé: {getRoleBadge(userRole || undefined)}</span>
          {hideRabbitNarration && (
            <span className="text-[10px] bg-black/25 text-amber-200 px-2 py-0.5 rounded-full font-bold">
              Đã ẩn tường thuật 🐰
            </span>
          )}
          {userRole === 'spectator' && !hideRabbitNarration && <span className="text-amber-200 font-extrabold">Chế độ quan sát 👁️</span>}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 scrollbar-thin bg-[#FAF8F5]">
        {messagesList.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl">
              💬
            </div>
            <p className="text-sm font-bold text-zinc-600">
              Chưa có tin nhắn nào trong phòng.
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Hãy gửi tin nhắn chào bạn bè hoặc mời đối thủ vào chơi nhé!
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messagesList.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              const isReferee = msg.senderId === 'referee_rabbit_master' || msg.roleTag === 'Trọng tài' || msg.avatar === '🐰';

              if (isReferee) {
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full flex flex-col items-center my-1.5"
                  >
                    <div className="w-full bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 shadow-xs text-amber-950">
                      <div className="flex items-center justify-between border-b border-amber-200/80 pb-1.5 mb-1.5 text-[12px] font-extrabold text-amber-900">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">🐰</span>
                          <span>{msg.senderName || 'Sư phụ Thỏ (Trọng tài)'}</span>
                        </div>
                        <span className="text-[10px] bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full font-black border border-amber-300">TRỌNG TÀI 📣</span>
                      </div>
                      <p className="text-[13px] font-extrabold leading-relaxed text-amber-900">{msg.text}</p>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-base shadow-xs shrink-0">
                    {renderPlayerAvatar(msg.avatar)}
                  </div>

                  {/* Message container */}
                  <div className={`flex flex-col max-w-[82%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-0.5 px-1">
                      <span className="text-[11px] font-bold text-zinc-500">{msg.senderName}</span>
                      {msg.roleTag && getRoleBadge(msg.roleTag)}
                    </div>

                    <div
                      className={`p-3 rounded-2xl text-[13px] leading-relaxed shadow-xs font-medium ${
                        isMe
                          ? 'bg-[#369662] text-white rounded-tr-none'
                          : 'bg-white text-zinc-800 border border-[#E8E2D9] rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Greeting Emojis / Phrases for Kids */}
      <div className="p-2 bg-white border-t border-[#E8E2D9] flex gap-1.5 overflow-x-auto scrollbar-none text-[12px]">
        {[
          "Chào bạn! 👋",
          "Chúc chơi vui! 🎉",
          "Nước đi hay lắm! 👏",
          "Cố lên bé ơi! 💪",
          "Đến lượt bạn rồi đấy! ⏳"
        ].map((phrase) => (
          <button
            key={phrase}
            onClick={() => handleSendQuickMsg(phrase)}
            className="shrink-0 bg-[#F2EDE7] hover:bg-emerald-100 text-[#5C5751] hover:text-emerald-800 font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer text-[12px] border border-[#E8E2D9]"
          >
            {phrase}
          </button>
        ))}
      </div>

      {/* Chat Input Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-[#E8E2D9] flex items-center space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Nhập tin nhắn trò chuyện..."
          className="flex-1 text-[13px] border border-[#E8E2D9] rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-[#369662]/50 bg-white text-[#4A4540]"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className={`p-2.5 rounded-xl text-white flex items-center justify-center transition-all ${
            inputText.trim()
              ? 'bg-[#369662] hover:bg-emerald-700 cursor-pointer active:scale-95 shadow-xs'
              : 'bg-[#F2EDE7] text-zinc-400 cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
