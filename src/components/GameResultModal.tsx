import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RefreshCw, X, Sparkles, Scale, Crown, ShieldAlert } from 'lucide-react';

interface GameResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewGame: () => void;
  winnerColor: 'w' | 'b' | null;
  isCheckmate: boolean;
  isDraw: boolean;
  playerColor: 'w' | 'b';
  playerName?: string;
  isTimeout?: boolean;
  isResigned?: boolean;
  gameMode?: 'vs_ai' | 'two_players' | 'puzzle' | 'study';
}

export const GameResultModal: React.FC<GameResultModalProps> = ({
  isOpen,
  onClose,
  onNewGame,
  winnerColor,
  isCheckmate,
  isDraw,
  playerColor,
  playerName = 'Kỳ thủ nhí',
  isTimeout = false,
  isResigned = false,
  gameMode = 'vs_ai',
}) => {
  if (!isOpen) return null;

  const isTwoPlayers = gameMode === 'two_players';
  const isPlayerWin = !isTwoPlayers && winnerColor === playerColor;
  const isAiWin = !isTwoPlayers && winnerColor !== null && winnerColor !== playerColor;
  const isTwoPlayerWin = isTwoPlayers && winnerColor !== null;

  // Determine strings according to game end state
  const headerTitle = isCheckmate ? 'CHIẾU HẾT!' : (isResigned ? 'XIN THUA!' : (isTimeout ? 'HẾT GIỜ!' : 'CỜ HOÀ!'));
  
  let resultSubtitle = '';
  if (winnerColor) {
    resultSubtitle = winnerColor === 'w' ? 'QUÂN TRẮNG THẮNG!!!' : 'QUÂN ĐEN THẮNG!!!';
  } else {
    resultSubtitle = 'HAI KỲ THỦ CÂN TÀI CÂN SỨC!!!';
  }

  // Color schemes for background banner & accents
  let bannerBgClass = 'from-amber-500 via-indigo-600 to-slate-700'; // draw default
  let iconBgClass = 'bg-amber-100 text-amber-600';
  let titleColorClass = 'text-amber-300';

  if (isPlayerWin || isTwoPlayerWin) {
    bannerBgClass = 'from-[#369662] via-[#2A784E] to-[#1E5A39]';
    iconBgClass = 'bg-amber-400/20 text-amber-300 border-2 border-amber-300/40';
    titleColorClass = 'text-amber-300';
  } else if (isAiWin) {
    bannerBgClass = 'from-rose-600 via-red-700 to-amber-800';
    iconBgClass = 'bg-white/20 text-white border-2 border-white/30';
    titleColorClass = 'text-amber-200';
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        {/* Backdrop overlay dismiss */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 15 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-[#F2EDE7] z-10"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Banner Header with Graphic & Effects */}
          <div className={`relative p-7 bg-gradient-to-br ${bannerBgClass} text-white text-center overflow-hidden`}>
            {/* Background Decorative Ripples */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent animate-pulse" />

            {/* Icon Graphic Badge */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
              className="relative mx-auto mb-3 w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-sm"
            >
              <div className={`w-full h-full rounded-2xl flex items-center justify-center ${iconBgClass}`}>
                {(isPlayerWin || isTwoPlayerWin) && <Trophy className="w-11 h-11 drop-shadow-md animate-bounce" />}
                {isAiWin && <Crown className="w-11 h-11 drop-shadow-md animate-pulse" />}
                {isDraw && <Scale className="w-11 h-11 drop-shadow-md" />}
              </div>
            </motion.div>

            {/* Title: CHIẾU HẾT! or CỜ HOÀ! */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <span className={`inline-block px-3 py-1 mb-2 rounded-full text-xs font-black tracking-wider uppercase bg-black/20 ${titleColorClass} border border-white/20`}>
                {(isPlayerWin || isTwoPlayerWin) ? '🎉 Chiến Thắng Rực Rỡ' : isAiWin ? '💪 Thi Đấu Tốt Lắm' : '🤝 Trận Đấu Kịch Tính'}
              </span>
              <h2 className="text-3xl font-black tracking-tight text-white uppercase drop-shadow-sm">
                {headerTitle}
              </h2>
            </motion.div>

            {/* Main Subtitle Box: QUÂN (TRẮNG/ĐEN) THẮNG!!! or HAI KỲ THỦ CÂN TÀI CÂN SỨC!!! */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 200 }}
              className="mt-3 py-2 px-4 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 shadow-inner"
            >
              <p className="text-lg font-black tracking-wide text-amber-200 uppercase leading-snug">
                {resultSubtitle}
              </p>
            </motion.div>
          </div>

          {/* Body Content */}
          <div className="p-6 text-center space-y-4 bg-white">
            {/* Friendly message */}
            <div className="p-3.5 rounded-2xl bg-[#F8F6F2] border border-[#E8E2D9] text-[#5C5751] text-sm font-medium leading-relaxed">
              {isTwoPlayers && winnerColor === 'w' && (
                <p>
                  Chúc mừng <span className="font-bold text-[#369662]">Đội Quân Trắng ⚪</span>! {isResigned ? 'Đối thủ đã xin thua, Quân Trắng giành chiến thắng!' : (isTimeout ? 'Đối thủ đã hết thời gian thi đấu, Quân Trắng giành chiến thắng!' : 'Nước đi xuất sắc đã chiếu hết Quân Đen và mang về chiến thắng thuyết phục!')} 🏆✨
                </p>
              )}
              {isTwoPlayers && winnerColor === 'b' && (
                <p>
                  Chúc mừng <span className="font-bold text-zinc-900">Đội Quân Đen ⚫</span>! {isResigned ? 'Đối thủ đã xin thua, Quân Đen giành chiến thắng!' : (isTimeout ? 'Đối thủ đã hết thời gian thi đấu, Quân Đen giành chiến thắng!' : 'Nước đi xuất sắc đã chiếu hết Quân Trắng và mang về chiến thắng thuyết phục!')} 🏆✨
                </p>
              )}
              {!isTwoPlayers && isPlayerWin && (
                <p>
                  Chúc mừng <span className="font-bold text-[#369662]">{playerName}</span>! {isResigned ? 'Đối thủ đã nhận thua ván cờ, con giành chiến thắng!' : (isTimeout ? 'Đối thủ đã hết thời gian thi đấu, con giành chiến thắng!' : 'Con đã quan sát sắc bén và đưa ra những nước đi tuyệt vời để chiếu hết đối thủ!')} 🏆✨
                </p>
              )}
              {!isTwoPlayers && isAiWin && (
                <p>
                  {isResigned ? 'Kỳ thủ đã xin thua ván cờ này.' : (isTimeout ? 'Ôi không! Con đã dùng hết thời gian thi đấu ván này.' : 'Đối thủ đã giành chiến thắng ván này!')} Thất bại là mẹ thành công, <span className="font-bold text-zinc-700">{playerName}</span> hãy rút kinh nghiệm và tiếp tục rèn luyện nhé! 💪
                </p>
              )}
              {isDraw && !isTimeout && (
                <p>
                  Ván đấu vô cùng kịch tính! Cả hai kỳ thủ đều thi đấu ngoan cường và không bên nào chịu khuất phục. Bắt đầu ván mới thôi nào! 🤝
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={onNewGame}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-[#369662] hover:bg-[#2e8254] text-white font-black text-base tracking-wide shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-5 h-5 animate-spin-slow" />
                <span>CHƠI VÁN MỚI</span>
              </button>

              <button
                onClick={onClose}
                className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-[#F2EDE7] hover:bg-[#E8E2D9] text-[#5C5751] font-bold text-sm transition-all cursor-pointer active:scale-95 border border-[#D6CDC2] whitespace-nowrap"
              >
                Xem bàn cờ
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
