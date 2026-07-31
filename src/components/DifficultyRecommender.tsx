import React, { useState, useEffect } from 'react';
import { Difficulty } from '../types';
import { getDifficultyRecommendation } from '../utils/profileStorage';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Brain, ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';

interface DifficultyRecommenderProps {
  profileId: string;
  currentDifficulty: Difficulty;
  onSetDifficulty: (diff: Difficulty) => void;
  gameCompletedTrigger: number; // Trigger reload when games completed changes
}

export const DifficultyRecommender: React.FC<DifficultyRecommenderProps> = ({
  profileId,
  currentDifficulty,
  onSetDifficulty,
  gameCompletedTrigger,
}) => {
  const [recommendation, setRecommendation] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (profileId) {
      const rec = getDifficultyRecommendation(profileId, currentDifficulty);
      setRecommendation(rec);
    }
  }, [profileId, currentDifficulty, gameCompletedTrigger]);

  const handleApply = () => {
    if (recommendation?.shouldChange) {
      onSetDifficulty(recommendation.recommendedDifficulty);
      setShowPopup(false);
      // Trigger a nice success feedback
      alert(`Đã cập nhật cấp độ đấu thành "${
        recommendation.recommendedDifficulty === 'easy' ? 'Dễ' : 
        recommendation.recommendedDifficulty === 'medium' ? 'Trung bình' : 
        recommendation.recommendedDifficulty === 'hard' ? 'Khó' : 'Chuyên gia'
      }" thành công! 🎉 Chúc bé chơi vui nha!`);
    }
  };

  if (!recommendation) return null;

  const difficultyNames: { [key in Difficulty]: string } = {
    easy: 'Dễ (Pawn)',
    medium: 'Trung bình (Knight)',
    hard: 'Khó (Rook)',
    expert: 'Chuyên gia (Queen)'
  };

  return (
    <div className="bg-white rounded-[32px] p-4 sm:p-5 max-lg:landscape:p-3 max-lg:landscape:rounded-2xl shadow-sm border-2 border-[#8BA888] w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <h3 className="font-extrabold text-[#5C5751] text-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            <Award className="w-4 h-4 text-[#8BA888] shrink-0" />
            <span>Đánh Giá Trình Độ</span>
          </h3>
          <p className="text-[#5C5751]/80 text-[12px] font-semibold leading-relaxed">
            {recommendation.reason}
          </p>
        </div>
        <div className="shrink-0">
          {recommendation.shouldChange ? (
            <button
              onClick={() => setShowPopup(true)}
              className="bg-[#8BA888] hover:bg-[#728F6F] active:scale-95 text-white font-extrabold text-[12px] py-1.5 px-3.5 rounded-full shadow-xs flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Nhận tư vấn</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="bg-[#F2EDE7] text-[#5C5751]/80 text-[11px] font-extrabold py-1 px-3 rounded-full border border-[#E8E2D9] whitespace-nowrap">
              Ổn định 🌟
            </div>
          )}
        </div>
      </div>

      {/* Recommendation Popover */}
      <AnimatePresence>
        {showPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border-4 border-[#8BA888] relative"
            >
              <div className="text-center mb-5">
                <div className="w-20 h-20 rounded-full bg-[#F2EDE7] border-4 border-[#8BA888] flex items-center justify-center text-5xl mx-auto mb-3 animate-bounce">
                  🐰
                </div>
                <h3 className="font-black text-lg text-[#5C5751] tracking-tight">Lời Khuyên của Sư Phụ Thỏ</h3>
                <p className="text-[13px] text-zinc-500 mt-1">Hệ thống phân tích lối chơi tự động phát hiện bé đã sẵn sàng cho nấc thang mới!</p>
              </div>

              {/* Visual recommendation change */}
              <div className="bg-[#FFFDFB] border-2 border-[#E8E2D9] rounded-2xl p-4 flex items-center justify-around gap-2 mb-5">
                <div className="text-center">
                  <span className="text-[13px] text-zinc-400 font-bold block">HIỆN TẠI</span>
                  <span className="text-[13px] font-black text-zinc-500">{difficultyNames[currentDifficulty]}</span>
                </div>
                <ArrowRight className="w-5 h-5 text-[#8BA888] animate-pulse" />
                <div className="text-center">
                  <span className="text-[13px] text-[#8BA888] font-black block">ĐỀ XUẤT</span>
                  <span className="text-[13px] font-black text-[#8BA888] underline decoration-2 decoration-[#8BA888]/50">
                    {difficultyNames[recommendation.recommendedDifficulty as Difficulty]}
                  </span>
                </div>
              </div>

              <p className="text-[13px] text-zinc-600 text-center mb-5 italic bg-amber-50 p-3 rounded-xl border border-amber-200/50">
                "{recommendation.reason}"
              </p>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPopup(false)}
                  className="flex-1 py-2.5 text-[13px] font-bold text-zinc-500 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer"
                >
                  Giữ nguyên
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 py-2.5 bg-[#8BA888] hover:bg-[#728F6F] text-white text-[13px] font-bold rounded-full shadow-md transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Cập nhật ngay</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
