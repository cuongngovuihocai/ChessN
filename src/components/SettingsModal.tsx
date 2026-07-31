import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Clock, MessageSquare } from 'lucide-react';
import { SoundSpeakerIcon, VoiceSpeakingIcon } from './AudioVoiceIcons';
import { TimeControlMode } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: (val: boolean) => void;
  speechEnabled: boolean;
  onToggleSpeech: (val: boolean) => void;
  autoComment?: boolean;
  onToggleAutoComment?: (val: boolean) => void;
  hideRabbitNarration?: boolean;
  onToggleHideRabbitNarration?: (val: boolean) => void;
  timeControlMode: TimeControlMode;
  onSelectTimeControlMode: (mode: TimeControlMode) => void;
  isGameStarted?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound,
  speechEnabled,
  onToggleSpeech,
  hideRabbitNarration = false,
  onToggleHideRabbitNarration,
  timeControlMode,
  onSelectTimeControlMode,
  isGameStarted = false,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#5C5751]/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-[#FFFDFB] rounded-[32px] border border-[#E8E2D9] p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E8E2D9]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#8BA888] text-white flex items-center justify-center rounded-2xl shadow-sm">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#5C5751]">Tùy chỉnh Trải nghiệm</h3>
                <p className="text-[12px] text-zinc-400 font-bold">Cài đặt âm thanh và hỗ trợ từ Sư phụ Thỏ</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[#F2EDE7] text-zinc-400 hover:text-[#5C5751] transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Options List */}
          <div className="space-y-4">
            {/* 1. Sound Effects */}
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#E8E2D9] shadow-sm">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-xl ${soundEnabled ? 'bg-[#8BA888]/15 text-[#8BA888]' : 'bg-zinc-100 text-zinc-400'}`}>
                  <SoundSpeakerIcon className="w-5 h-5" off={!soundEnabled} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#5C5751]">Âm thanh hiệu ứng</h4>
                  <p className="text-[12px] text-zinc-400 font-bold">Tiếng di chuyển quân cờ, ăn quân và chiếu tướng</p>
                </div>
              </div>
              <button
                onClick={() => onToggleSound(!soundEnabled)}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  soundEnabled ? 'bg-[#8BA888]' : 'bg-zinc-300'
                }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                    soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 2. Voice Speech */}
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#E8E2D9] shadow-sm">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-xl ${speechEnabled ? 'bg-[#8BA888]/15 text-[#8BA888]' : 'bg-zinc-100 text-zinc-400'}`}>
                  <VoiceSpeakingIcon className="w-5 h-5" off={!speechEnabled} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#5C5751]">Giọng nói thuyết minh</h4>
                  <p className="text-[12px] text-zinc-400 font-bold">Thuyết minh phản ứng bằng giọng nói tiếng Việt từ Sư phụ Thỏ</p>
                </div>
              </div>
              <button
                onClick={() => onToggleSpeech(!speechEnabled)}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  speechEnabled ? 'bg-[#8BA888]' : 'bg-zinc-300'
                }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                    speechEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 3. Rabbit Narration in Online Chat */}
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#E8E2D9] shadow-sm">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-xl ${!hideRabbitNarration ? 'bg-[#8BA888]/15 text-[#8BA888]' : 'bg-zinc-100 text-zinc-400'}`}>
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#5C5751]">Tường thuật Sư phụ Thỏ (Online)</h4>
                  <p className="text-[12px] text-zinc-400 font-bold">Hiển thị tin nhắn tường thuật nước đi & trọng tài trong ô chat online</p>
                </div>
              </div>
              <button
                onClick={() => onToggleHideRabbitNarration && onToggleHideRabbitNarration(!hideRabbitNarration)}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  !hideRabbitNarration ? 'bg-[#8BA888]' : 'bg-zinc-300'
                }`}
                title={hideRabbitNarration ? "Đang ẩn tường thuật" : "Đang hiển thị tường thuật"}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                    !hideRabbitNarration ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 3. Time Control Mode */}
            <div className="p-3.5 bg-white rounded-2xl border border-[#E8E2D9] shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-[#8BA888]/15 text-[#8BA888]">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#5C5751]">Thời gian thi đấu</h4>
                    <p className="text-[12px] text-zinc-400 font-bold">Quy định thời gian đếm ngược của mỗi kỳ thủ</p>
                  </div>
                </div>
              </div>

              {isGameStarted && (
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold text-center">
                  🔒 Ván cờ đang diễn ra! Không thể thay đổi chế độ thời gian lúc này.
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  disabled={isGameStarted}
                  onClick={() => onSelectTimeControlMode('standard')}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    isGameStarted ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    timeControlMode === 'standard'
                      ? 'bg-[#8BA888] text-white border-[#8BA888] font-black shadow-xs'
                      : 'bg-[#F8F6F2] text-[#5C5751] border-[#E8E2D9] hover:bg-zinc-200/60 font-bold'
                  }`}
                >
                  <span className="text-[12px] uppercase">Tiêu chuẩn</span>
                  <span className="text-[10px] opacity-90">90' (+30' p40)</span>
                </button>

                <button
                  type="button"
                  disabled={isGameStarted}
                  onClick={() => onSelectTimeControlMode('rapid')}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    isGameStarted ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    timeControlMode === 'rapid'
                      ? 'bg-[#8BA888] text-white border-[#8BA888] font-black shadow-xs'
                      : 'bg-[#F8F6F2] text-[#5C5751] border-[#E8E2D9] hover:bg-zinc-200/60 font-bold'
                  }`}
                >
                  <span className="text-[12px] uppercase">Cờ nhanh</span>
                  <span className="text-[10px] opacity-90">15' (+10s)</span>
                </button>

                <button
                  type="button"
                  disabled={isGameStarted}
                  onClick={() => onSelectTimeControlMode('blitz')}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    isGameStarted ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    timeControlMode === 'blitz'
                      ? 'bg-[#8BA888] text-white border-[#8BA888] font-black shadow-xs'
                      : 'bg-[#F8F6F2] text-[#5C5751] border-[#E8E2D9] hover:bg-zinc-200/60 font-bold'
                  }`}
                >
                  <span className="text-[12px] uppercase">Cờ chớp</span>
                  <span className="text-[10px] opacity-90">3' (+2s)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Close button */}
          <div className="mt-6 pt-4 border-t border-[#E8E2D9]">
            <button
              onClick={onClose}
              className="w-full py-3 bg-[#8BA888] hover:bg-[#7A9777] text-white font-black text-sm rounded-2xl transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Lưu & Đóng
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
