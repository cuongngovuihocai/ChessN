import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Users, Globe, Monitor, PlusCircle, LogIn, Copy, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { OnlineRoomData } from '../services/onlineChessService';

export type GameMode = 'vs_ai' | 'two_players';
export type TwoPlayerSubMode = 'offline' | 'online';

interface GameModeSelectorProps {
  gameMode: GameMode;
  subMode: TwoPlayerSubMode;
  onSelectMode: (mode: GameMode, subMode?: TwoPlayerSubMode) => void;
  onlineRoom: OnlineRoomData | null;
  userRole: 'w' | 'b' | 'spectator' | null;
  onCreateOnlineRoom: () => void;
  onJoinOnlineRoom: (roomId: string) => void;
  onLeaveOnlineRoom: () => void;
  isConnectingRoom?: boolean;
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  gameMode,
  subMode,
  onSelectMode,
  onlineRoom,
  userRole,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onLeaveOnlineRoom,
  isConnectingRoom = false,
}) => {
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputRoomCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('Bé hãy nhập mã phòng gồm 6 ký tự nhé!');
      return;
    }
    setErrorMessage('');
    onJoinOnlineRoom(cleanCode);
  };

  const handleCopyLink = () => {
    if (!onlineRoom) return;
    const roomUrl = `${window.location.origin}${window.location.pathname}?room=${onlineRoom.id}`;
    navigator.clipboard.writeText(roomUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      prompt("Sao chép link phòng này:", roomUrl);
    });
  };

  return (
    <div className={`bg-white rounded-[32px] p-5 max-lg:landscape:p-3 max-lg:landscape:rounded-2xl shadow-sm border-2 border-[#8BA888] transition-all ${
      gameMode === 'two_players' ? 'flex-1 h-full flex flex-col' : 'h-auto'
    }`}>
      <h3 className="text-[13px] max-lg:landscape:text-[11px] font-black text-[#5C5751] uppercase tracking-widest mb-3 max-lg:landscape:mb-1.5 flex items-center gap-1.5">
        <Users className="w-4 h-4 max-lg:landscape:w-3.5 max-lg:landscape:h-3.5 text-[#8BA888]" />
        Chế độ chơi
      </h3>

      {/* Main 2 choices: VS AI or 2 Players */}
      <div className="space-y-2 max-lg:landscape:space-y-1">
        {/* Choice 1: Đấu với máy */}
        <button
          onClick={() => onSelectMode('vs_ai')}
          className={`w-full flex items-center justify-between p-3 max-lg:landscape:p-1.5 rounded-2xl max-lg:landscape:rounded-xl border text-[13px] max-lg:landscape:text-[11px] font-extrabold transition-all cursor-pointer ${
            gameMode === 'vs_ai'
              ? 'bg-[#8BA888] text-white border-[#8BA888] shadow-xs'
              : 'bg-[#F2EDE7]/50 text-[#5C5751] border-[#E8E2D9] hover:bg-[#F2EDE7]'
          }`}
        >
          <div className="flex items-center space-x-2.5 max-lg:landscape:space-x-1.5">
            <span className="text-lg max-lg:landscape:text-sm">🤖</span>
            <span>Đấu với máy</span>
          </div>
          {gameMode === 'vs_ai' && <Check className="w-4 h-4 max-lg:landscape:w-3.5 max-lg:landscape:h-3.5 text-white" />}
        </button>

        {/* Choice 2: 2 người đấu */}
        <button
          onClick={() => onSelectMode('two_players', subMode)}
          className={`w-full flex items-center justify-between p-3 max-lg:landscape:p-1.5 rounded-2xl max-lg:landscape:rounded-xl border text-[13px] max-lg:landscape:text-[11px] font-extrabold transition-all cursor-pointer ${
            gameMode === 'two_players'
              ? 'bg-[#5C5751] text-white border-[#5C5751] shadow-xs'
              : 'bg-[#F2EDE7]/50 text-[#5C5751] border-[#E8E2D9] hover:bg-[#F2EDE7]'
          }`}
        >
          <div className="flex items-center space-x-2.5 max-lg:landscape:space-x-1.5">
            <span className="text-lg max-lg:landscape:text-sm">⚔️</span>
            <span>2 người đấu</span>
          </div>
          {gameMode === 'two_players' && <Check className="w-4 h-4 max-lg:landscape:w-3.5 max-lg:landscape:h-3.5 text-white" />}
        </button>

        {/* Expandable Sub-options when "2 người đấu" is selected */}
        <AnimatePresence>
          {gameMode === 'two_players' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-1.5 pt-1 space-y-2 overflow-hidden"
            >
              <div className="p-2.5 sm:p-3 bg-[#F8F6F2] rounded-2xl border border-[#E8E2D9] space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {/* Option A: Online */}
                  <button
                    onClick={() => onSelectMode('two_players', 'online')}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[12px] font-black transition-all cursor-pointer ${
                      subMode === 'online'
                        ? 'bg-[#369662] text-white border-[#369662] shadow-xs'
                        : 'bg-white text-[#5C5751] border-[#E8E2D9] hover:bg-emerald-50'
                    }`}
                  >
                    <Globe className="w-4 h-4 mb-0.5" />
                    <span>Chơi Online</span>
                    <span className="text-[10px] font-normal opacity-90">(khác thiết bị)</span>
                  </button>

                  {/* Option B: Offline */}
                  <button
                    onClick={() => onSelectMode('two_players', 'offline')}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[12px] font-black transition-all cursor-pointer ${
                      subMode === 'offline'
                        ? 'bg-[#8BA888] text-white border-[#8BA888] shadow-xs'
                        : 'bg-white text-[#5C5751] border-[#E8E2D9] hover:bg-emerald-50'
                    }`}
                  >
                    <Monitor className="w-4 h-4 mb-0.5" />
                    <span>Chơi Offline</span>
                    <span className="text-[10px] font-normal opacity-90">(cùng thiết bị)</span>
                  </button>
                </div>

                {/* Online Room Management Box */}
                {subMode === 'online' && (
                  <div className="pt-2 mt-2 border-t border-[#E8E2D9] space-y-2">
                    {onlineRoom ? (
                      /* Active Room info */
                      <div className="bg-emerald-50 rounded-2xl p-2.5 border border-emerald-200 space-y-2 text-[12px]">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-emerald-900 flex items-center gap-1">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                            Phòng: {onlineRoom.id}
                          </span>
                        </div>

                        {userRole === 'spectator' && (
                          <div className="text-zinc-600 font-bold text-[11px]">
                            👁️ Chế độ Khán giả (Xem trận đấu)
                          </div>
                        )}

                        <button
                          onClick={handleCopyLink}
                          className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-[#369662] hover:bg-emerald-700 text-white font-bold text-[12px] rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? 'Đã sao chép link!' : 'Sao chép link mời'}</span>
                        </button>
                      </div>
                    ) : (
                      /* Create or Join Room UI */
                      <div className="space-y-2">
                        {/* Button 1: Create room */}
                        <button
                          onClick={onCreateOnlineRoom}
                          disabled={isConnectingRoom}
                          className="w-full flex items-center justify-center space-x-1.5 py-2 px-2.5 bg-[#369662] hover:bg-emerald-700 text-white font-extrabold text-[12px] rounded-xl transition-all cursor-pointer active:scale-95 shadow-xs disabled:opacity-60"
                        >
                          <PlusCircle className="w-4 h-4 shrink-0" />
                          <span>Tạo phòng đấu mới</span>
                        </button>

                        <div className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest my-1">
                          — Hoặc nhập mã phòng —
                        </div>

                        {/* Form: Join room with code */}
                        <form onSubmit={handleJoinSubmit} className="flex items-center gap-1.5 w-full">
                          <input
                            type="text"
                            maxLength={6}
                            value={inputRoomCode}
                            onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                            placeholder="Mã: ABC123"
                            className="flex-1 min-w-0 w-full text-[12px] font-bold tracking-wider uppercase border border-[#E8E2D9] rounded-xl py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-[#369662] bg-white text-zinc-800 placeholder:text-zinc-400 placeholder:font-normal placeholder:normal-case placeholder:tracking-normal"
                          />
                          <button
                            type="submit"
                            disabled={isConnectingRoom}
                            className="shrink-0 min-w-max px-3 py-1.5 bg-[#5C5751] hover:bg-zinc-700 text-white font-black text-[12px] rounded-xl transition-all cursor-pointer active:scale-95 flex items-center gap-1 justify-center shadow-xs disabled:opacity-60 whitespace-nowrap"
                          >
                            <LogIn className="w-3.5 h-3.5 shrink-0" />
                            <span>Vào phòng</span>
                          </button>
                        </form>

                        {errorMessage && (
                          <p className="text-[11px] font-bold text-red-500 mt-1">
                            {errorMessage}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
