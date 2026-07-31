import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Sparkles, X, Award, MousePointer, Swords, Bot, Globe, Users, Settings, Clock, Volume2 } from 'lucide-react';
import { VoiceSpeakingIcon } from './AudioVoiceIcons';
import { ChessPiece } from './ChessPiece';
import { speakTextAloud, cancelSpeech } from '../lib/speech';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'app_guide' | 'chess_rules'>('app_guide');
  const [speakingSectionId, setSpeakingSectionId] = useState<string | null>(null);

  // Cancel speech when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      cancelSpeech();
      setSpeakingSectionId(null);
    }
  }, [isOpen]);

  const handleTabChange = (tab: 'app_guide' | 'chess_rules') => {
    cancelSpeech();
    setSpeakingSectionId(null);
    setActiveTab(tab);
  };

  const handleClose = () => {
    cancelSpeech();
    setSpeakingSectionId(null);
    onClose();
  };

  const playSectionSpeech = (sectionId: string, text: string) => {
    if (speakingSectionId === sectionId) {
      cancelSpeech();
      setSpeakingSectionId(null);
    } else {
      setSpeakingSectionId(sectionId);
      speakTextAloud(text, () => {
        setSpeakingSectionId((current) => (current === sectionId ? null : current));
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#5C5751]/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-[#FFFDFB] rounded-[32px] border border-[#E8E2D9] p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E8E2D9] shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#8BA888] text-white flex items-center justify-center rounded-2xl shadow-sm">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#5C5751]">Hướng Dẫn Cờ Vua Cho Bé</h3>
                <p className="text-[12px] text-zinc-400 font-bold">Cẩm nang chơi game & luật cờ từ Sư phụ Thỏ 🐰</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-[#F2EDE7] text-zinc-400 hover:text-[#5C5751] transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-[#F2EDE7] p-1.5 rounded-2xl my-4 gap-1 shrink-0">
            <button
              onClick={() => handleTabChange('app_guide')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-[13px] font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'app_guide'
                  ? 'bg-white text-[#5C5751] shadow-sm'
                  : 'text-zinc-500 hover:text-[#5C5751]'
              }`}
            >
              <MousePointer className="w-4 h-4 text-[#8BA888]" />
              <span>Cách Chơi (Ứng Dụng)</span>
            </button>

            <button
              onClick={() => handleTabChange('chess_rules')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-[13px] font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'chess_rules'
                  ? 'bg-white text-[#5C5751] shadow-sm'
                  : 'text-zinc-500 hover:text-[#5C5751]'
              }`}
            >
              <Swords className="w-4 h-4 text-[#8BA888]" />
              <span>Luật Cờ Vua</span>
            </button>
          </div>

          {/* Content Body - Scrollable */}
          <div className="overflow-y-auto pr-2 space-y-4 text-[#5C5751] text-xs sm:text-sm font-medium leading-relaxed custom-scrollbar">
            {activeTab === 'app_guide' ? (
              <div className="space-y-4">
                {/* Section 1: 3 Chế độ chơi & Cách tương tác */}
                <div className="bg-white p-4 rounded-2xl border border-[#E8E2D9] shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-[#5C5751] flex items-center gap-2 text-sm text-[#8BA888]">
                      <Swords className="w-4 h-4" />
                      1. Các chế độ chơi & Cách tương tác
                    </h4>
                    <button
                      onClick={() =>
                        playSectionSpeech(
                          'sec_modes',
                          'Một: Các chế độ chơi và cách tương tác. Chế độ Với máy: Thử thách bản thân với đối thủ máy AI thông minh theo bốn cấp độ: Dễ, Trung bình, Khó, và Chuyên gia. Trước khi bấm Bắt đầu, bé có thể bấm nút chọn màu quân Trắng hoặc Đen. Bấm nút Bắt đầu ở giữa bàn cờ để khởi động. Chế độ Online hai người: Thi đấu trực tiếp với bạn bè qua mạng Internet. Chọn Tạo phòng để nhận Mã phòng gửi cho bạn, hoặc nhập Mã phòng có sẵn để tham gia. Hai người thi đấu luân phiên và chat trực tiếp trong phòng. Chế độ Offline hai người: Chơi cờ hai người đối kháng trực tiếp trên cùng một màn hình thiết bị. Bấm Bắt đầu để khởi động, hai người lần lượt di chuyển quân cờ trên cùng bàn cờ, không cần kết nối mạng.'
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer shadow-sm ${
                        speakingSectionId === 'sec_modes'
                          ? 'bg-[#E05252] text-white animate-pulse'
                          : 'bg-[#8BA888] text-white hover:bg-[#779674]'
                      }`}
                    >
                      {speakingSectionId === 'sec_modes' ? (
                        <>
                          <VoiceSpeakingIcon className="w-3.5 h-3.5" off={true} />
                          <span>Dừng đọc</span>
                        </>
                      ) : (
                        <>
                          <VoiceSpeakingIcon className="w-3.5 h-3.5" />
                          <span>🔊 Nghe Sư phụ đọc</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs font-semibold text-zinc-600">
                    {/* Vs AI */}
                    <div className="p-3 bg-[#F2EDE7]/50 rounded-2xl border border-[#E8E2D9] space-y-1">
                      <div className="flex items-center gap-2 font-extrabold text-sm text-[#5C5751]">
                        <Bot className="w-4 h-4 text-[#8BA888]" />
                        <span>🤖 Chế độ Với Máy (Vs AI)</span>
                      </div>
                      <p className="text-zinc-600 leading-relaxed">
                        <strong className="text-[#5C5751]">Giới thiệu:</strong> Thử thách tư duy cờ vua với đối thủ máy AI tự động qua 4 cấp độ (Dễ, Trung bình, Khó, Chuyên gia).
                      </p>
                      <p className="text-zinc-600 leading-relaxed">
                        <strong className="text-[#5C5751]">Tùy chỉnh & Tương tác:</strong> Bấm vào nút màu quân để chọn cầm quân <span className="font-bold text-[#5C5751]">⚪ Trắng</span> hoặc <span className="font-bold text-zinc-800">⚫ Đen</span>. Bấm nút <span className="bg-[#014b3f] text-white px-1.5 py-0.5 rounded font-bold">🚀 Bắt đầu</span> ở giữa bàn cờ để kích hoạt lượt đi.
                      </p>
                    </div>

                    {/* Online */}
                    <div className="p-3 bg-[#F2EDE7]/50 rounded-2xl border border-[#E8E2D9] space-y-1">
                      <div className="flex items-center gap-2 font-extrabold text-sm text-[#5C5751]">
                        <Globe className="w-4 h-4 text-sky-600" />
                        <span>🌐 Chế độ Online (2 Người - Trực tuyến)</span>
                      </div>
                      <p className="text-zinc-600 leading-relaxed">
                        <strong className="text-[#5C5751]">Giới thiệu:</strong> Thi đấu cờ vua trực tuyến với bạn bè hoặc người chơi khác qua kết nối Internet bằng mã phòng.
                      </p>
                      <p className="text-zinc-600 leading-relaxed">
                        <strong className="text-[#5C5751]">Tùy chỉnh & Tương tác:</strong> Chọn <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Tạo phòng</span> để lấy Mã phòng 6 ký tự gửi cho bạn bè, hoặc chọn <span className="bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-bold">Nhập mã phòng</span> để vào thi đấu. Hai người có thể trò chuyện trực tiếp qua khung Chat phòng.
                      </p>
                    </div>

                    {/* Offline */}
                    <div className="p-3 bg-[#F2EDE7]/50 rounded-2xl border border-[#E8E2D9] space-y-1">
                      <div className="flex items-center gap-2 font-extrabold text-sm text-[#5C5751]">
                        <Users className="w-4 h-4 text-amber-600" />
                        <span>👥 Chế độ Offline (2 Người - Cùng thiết bị)</span>
                      </div>
                      <p className="text-zinc-600 leading-relaxed">
                        <strong className="text-[#5C5751]">Giới thiệu:</strong> Chơi cờ đối kháng 2 người trực tiếp trên cùng một màn hình (máy tính hoặc máy tính bảng/điện thoại).
                      </p>
                      <p className="text-zinc-600 leading-relaxed">
                        <strong className="text-[#5C5751]">Tùy chỉnh & Tương tác:</strong> Bấm nút <span className="bg-[#014b3f] text-white px-1.5 py-0.5 rounded font-bold">🚀 Bắt đầu</span> để khởi động ván cờ. Hai người chơi lần lượt đi quân trực tiếp trên bàn cờ. Không cần mạng Internet.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Thao tác bàn cờ */}
                <div className="bg-white p-4 rounded-2xl border border-[#E8E2D9] shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-[#5C5751] flex items-center gap-2 text-sm text-[#8BA888]">
                      <MousePointer className="w-4 h-4" />
                      2. Thao tác trên bàn cờ
                    </h4>
                    <button
                      onClick={() =>
                        playSectionSpeech(
                          'sec_board',
                          'Hai: Thao tác trên bàn cờ. Đi quân cờ: Bấm chuột trái vào quân cờ của bé, các ô hợp lệ sẽ sáng chấm vàng. Bấm vào ô đích để di chuyển. Đánh dấu ô màu: Nhấn chuột phải vào một ô bất kỳ để tô màu xanh lá dễ nhìn. Vẽ mũi tên chỉ dẫn: Giữ chuột phải và kéo từ ô bắt đầu đến ô kết thúc để vẽ mũi tên chiến thuật. Xóa tất cả mũi tên: Bấm nhẹ chuột trái vào bất kỳ ô nào để làm sạch tất cả ký hiệu vẽ.'
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer shadow-sm ${
                        speakingSectionId === 'sec_board'
                          ? 'bg-[#E05252] text-white animate-pulse'
                          : 'bg-[#8BA888] text-white hover:bg-[#779674]'
                      }`}
                    >
                      {speakingSectionId === 'sec_board' ? (
                        <>
                          <VoiceSpeakingIcon className="w-3.5 h-3.5" off={true} />
                          <span>Dừng đọc</span>
                        </>
                      ) : (
                        <>
                          <VoiceSpeakingIcon className="w-3.5 h-3.5" />
                          <span>🔊 Nghe Sư phụ đọc</span>
                        </>
                      )}
                    </button>
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-zinc-600 font-semibold pl-1">
                    <li><strong className="text-[#5C5751]">Đi quân cờ:</strong> Bấm chuột trái vào quân cờ của bé, các ô hợp lệ sẽ sáng chấm vàng. Bấm vào ô đích để di chuyển.</li>
                    <li><strong className="text-[#5C5751]">Đánh dấu ô màu:</strong> Nhấn <span className="bg-[#16A34A]/20 text-[#15803D] px-1.5 py-0.5 rounded font-bold">Chuột phải</span> vào một ô bất kỳ để tô màu xanh lá dễ nhìn. Bấm lại để xóa.</li>
                    <li><strong className="text-[#5C5751]">Vẽ mũi tên chỉ dẫn:</strong> Giữ <span className="bg-[#16A34A]/20 text-[#15803D] px-1.5 py-0.5 rounded font-bold">Chuột phải</span> và kéo từ ô bắt đầu đến ô kết thúc để vẽ mũi tên chiến thuật.</li>
                    <li><strong className="text-[#5C5751]">Xóa tất cả mũi tên:</strong> Bấm nhẹ <span className="bg-[#F2EDE7] text-[#5C5751] px-1.5 py-0.5 rounded font-bold">Chuột trái</span> vào bất kỳ ô nào để làm sạch tất cả ký hiệu vẽ.</li>
                  </ul>
                </div>

                {/* Section 3: Menu Tùy chỉnh (Settings) */}
                <div className="bg-white p-4 rounded-2xl border border-[#E8E2D9] shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-[#5C5751] flex items-center gap-2 text-sm text-[#8BA888]">
                      <Settings className="w-4 h-4" />
                      3. Hướng dẫn các mục trong menu Tùy Chỉnh
                    </h4>
                    <button
                      onClick={() =>
                        playSectionSpeech(
                          'sec_settings',
                          'Ba: Hướng dẫn các mục trong menu Tùy chỉnh. Một: Âm thanh hiệu ứng: Bật hoặc Tắt hiệu ứng âm thanh sống động khi di chuyển quân cờ, ăn quân, chiếu tướng hoặc kết thúc ván cờ. Hai: Giọng nói thuyết minh: Bật hoặc Tắt giọng đọc tiếng Việt thân thiện hướng dẫn các thông báo và tương tác từ Sư phụ Thỏ. Ba: Chế độ thời gian: Ván đấu tiêu chuẩn là 90 phút cho 40 nước đi đầu tiên, cộng thêm 30 phút cho phần còn lại của ván đấu. Cờ nhanh 15 phút cộng thêm 10 giây cho mỗi nước đi. Cờ chớp 3 phút cộng thêm 2 giây cho mỗi nước đi.'
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer shadow-sm ${
                        speakingSectionId === 'sec_settings'
                          ? 'bg-[#E05252] text-white animate-pulse'
                          : 'bg-[#8BA888] text-white hover:bg-[#779674]'
                      }`}
                    >
                      {speakingSectionId === 'sec_settings' ? (
                        <>
                          <VoiceSpeakingIcon className="w-3.5 h-3.5" off={true} />
                          <span>Dừng đọc</span>
                        </>
                      ) : (
                        <>
                          <VoiceSpeakingIcon className="w-3.5 h-3.5" />
                          <span>🔊 Nghe Sư phụ đọc</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="space-y-2 text-xs font-semibold text-zinc-600">
                    <div className="p-2.5 bg-[#F2EDE7]/60 rounded-xl border border-[#E8E2D9] flex items-start gap-2.5">
                      <Volume2 className="w-4 h-4 text-[#8BA888] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#5C5751] font-black block">🔊 Hiệu ứng Âm thanh (Sound):</strong>
                        <span>Bật/Tắt âm thanh sống động khi thực hiện nước đi, ăn quân cờ, chiếu tướng hay khi ván đấu kết thúc.</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-[#F2EDE7]/60 rounded-xl border border-[#E8E2D9] flex items-start gap-2.5">
                      <VoiceSpeakingIcon className="w-4 h-4 text-[#8BA888] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#5C5751] font-black block">🎙️ Giọng nói thuyết minh (Speech):</strong>
                        <span>Bật/Tắt đọc bằng giọng nói tiếng Việt mượt mà cho các thông báo và tương tác từ Sư phụ Thỏ.</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-[#F2EDE7]/60 rounded-xl border border-[#E8E2D9] flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-[#8BA888] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#5C5751] font-black block">⏱️ Chế độ Thời gian (Time Control):</strong>
                        <ul className="list-disc list-inside space-y-1 pt-1 text-zinc-600 pl-1">
                          <li><strong className="text-[#5C5751]">Ván đấu tiêu chuẩn:</strong> 90 phút cho 40 nước đi đầu tiên, cộng thêm 30 phút cho phần còn lại của ván đấu.</li>
                          <li><strong className="text-[#5C5751]">Cờ nhanh (Rapid):</strong> 15 phút + 10 giây cộng thêm cho mỗi nước đi.</li>
                          <li><strong className="text-[#5C5751]">Cờ chớp (Blitz):</strong> 3 phút + 2 giây cộng thêm cho mỗi nước đi.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Trợ lý Sư phụ Thỏ & AI Coach & Elo */}
                <div className="bg-white p-4 rounded-2xl border border-[#E8E2D9] shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-[#5C5751] flex items-center gap-2 text-sm text-[#8BA888]">
                      <Sparkles className="w-4 h-4" />
                      4. Hỗ trợ từ Sư phụ Thỏ & Điểm Elo
                    </h4>
                    <button
                      onClick={() =>
                        playSectionSpeech(
                          'sec_coach',
                          'Bốn: Hỗ trợ từ Sư phụ Thỏ và Điểm Elo. Xin Gợi ý: Khi phân vân chưa biết đi nước nào, bấm nút Gợi ý ở ô chat để Sư phụ Thỏ hướng dẫn con nước đi hay nhất. Giải thích chiến thuật: Bấm biểu tượng lấp lánh bên cạnh nước đi của đối thủ trong ô chat để nghe Sư phụ Thỏ giải thích ý đồ. Điểm Elo và Cấp độ: Hệ thống tự động ghi nhận kết quả ván đấu và tính điểm Elo cho bé theo các cấp: Dễ, Trung Bình, Khó, và Chuyên Gia. Sư phụ Thỏ sẽ gợi ý tăng hoặc giảm độ khó khi bé có chuỗi ba ván thắng hoặc thua liên tiếp.'
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer shadow-sm ${
                        speakingSectionId === 'sec_coach'
                          ? 'bg-[#E05252] text-white animate-pulse'
                          : 'bg-[#8BA888] text-white hover:bg-[#779674]'
                      }`}
                    >
                      {speakingSectionId === 'sec_coach' ? (
                        <>
                          <VoiceSpeakingIcon className="w-3.5 h-3.5" off={true} />
                          <span>Dừng đọc</span>
                        </>
                      ) : (
                        <>
                          <VoiceSpeakingIcon className="w-3.5 h-3.5" />
                          <span>🔊 Nghe Sư phụ đọc</span>
                        </>
                      )}
                    </button>
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-zinc-600 font-semibold pl-1">
                    <li><strong className="text-[#5C5751]">Xin Gợi ý:</strong> Bấm nút <span className="bg-[#8BA888]/15 text-[#8BA888] px-1.5 py-0.5 rounded font-bold">💡 Gợi ý</span> ở ô chat để Sư phụ Thỏ hướng dẫn con nước đi hay nhất.</li>
                    <li><strong className="text-[#5C5751]">Giải thích chiến thuật:</strong> Bấm biểu tượng ✨ bên cạnh nước đi của đối thủ trong ô chat để nghe Sư phụ Thỏ giải thích ý đồ.</li>
                    <li><strong className="text-[#5C5751]">Đánh giá Elo:</strong> Tích lũy điểm Elo qua ván thắng (Cấp Dễ ♟️, Trung bình ♞, Khó ♜, Chuyên gia ♛). Sư phụ Thỏ sẽ nhắc bé điều chỉnh độ khó khi có chuỗi 3 ván thắng/thua.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Piece moves with SVG vector illustrations */}
                <div className="bg-white p-4 rounded-2xl border border-[#E8E2D9] shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-[#5C5751] flex items-center gap-2 text-sm text-[#8BA888]">
                      🛡️ Di chuyển của 6 quân cờ
                    </h4>
                    <button
                      onClick={() =>
                        playSectionSpeech(
                          'sec_pieces_all',
                          'Di chuyển của sáu quân cờ. Quân Tốt: Tiến một ô về phía trước, nước đầu tiên được tiến hai ô. Ăn quân đối phương theo đường chéo một ô. Quân Mã: Di chuyển theo hình chữ L, hai ô ngang một ô dọc hoặc ngược lại. Được nhảy qua đầu các quân khác. Quân Tượng: Di chuyển theo các đường chéo không giới hạn ô, giữ nguyên màu ô suốt cả ván đấu. Quân Xe: Di chuyển dọc theo các cột hoặc ngang theo các hàng không giới hạn số ô. Quân Hậu: Quân mạnh nhất bàn cờ, di chuyển kết hợp sức mạnh của cả Xe và Tượng. Quân Vua: Quân quan trọng nhất, di chuyển một ô theo mọi hướng. Bé phải luôn bảo vệ Vua an toàn.'
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer shadow-sm ${
                        speakingSectionId === 'sec_pieces_all'
                          ? 'bg-[#E05252] text-white animate-pulse'
                          : 'bg-[#8BA888] text-white hover:bg-[#779674]'
                      }`}
                    >
                      {speakingSectionId === 'sec_pieces_all' ? (
                        <>
                          <VoiceSpeakingIcon className="w-3.5 h-3.5" off={true} />
                          <span>Dừng đọc</span>
                        </>
                      ) : (
                        <>
                          <VoiceSpeakingIcon className="w-3.5 h-3.5" />
                          <span>🔊 Nghe đọc cả 6 quân</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-semibold">
                    {/* Pawn */}
                    <div className="p-3 bg-[#F2EDE7]/50 rounded-2xl border border-[#E8E2D9] flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 shrink-0 bg-white rounded-xl p-1 shadow-sm border border-[#E8E2D9] flex items-center justify-center">
                          <ChessPiece type="p" color="w" />
                        </div>
                        <div>
                          <strong className="text-[#5C5751] block font-black text-sm mb-0.5">Quân Tốt (Pawn)</strong>
                          <span className="text-zinc-600">Tiến 1 ô về phía trước (nước đầu tiên được tiến 2 ô). Ăn quân đối phương theo đường chéo 1 ô.</span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          playSectionSpeech(
                            'pawn',
                            'Quân Tốt: Tiến một ô về phía trước, nước đầu tiên được tiến hai ô. Ăn quân đối phương theo đường chéo một ô.'
                          )
                        }
                        className={`p-1.5 rounded-lg shrink-0 transition-all cursor-pointer shadow-sm ${
                          speakingSectionId === 'pawn' ? 'bg-[#E05252] text-white animate-pulse' : 'bg-[#8BA888] text-white hover:bg-[#779674]'
                        }`}
                        title="Nghe đọc quân Tốt"
                      >
                        <VoiceSpeakingIcon className="w-3.5 h-3.5" off={speakingSectionId === 'pawn'} />
                      </button>
                    </div>

                    {/* Knight */}
                    <div className="p-3 bg-[#F2EDE7]/50 rounded-2xl border border-[#E8E2D9] flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 shrink-0 bg-white rounded-xl p-1 shadow-sm border border-[#E8E2D9] flex items-center justify-center">
                          <ChessPiece type="n" color="w" />
                        </div>
                        <div>
                          <strong className="text-[#5C5751] block font-black text-sm mb-0.5">Quân Mã (Knight)</strong>
                          <span className="text-zinc-600">Di chuyển theo hình chữ L (2 ô ngang 1 ô dọc hoặc ngược lại). <strong>Được nhảy qua đầu các quân khác!</strong></span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          playSectionSpeech(
                            'knight',
                            'Quân Mã: Di chuyển theo hình chữ L, hai ô ngang một ô dọc hoặc ngược lại. Được nhảy qua đầu các quân khác.'
                          )
                        }
                        className={`p-1.5 rounded-lg shrink-0 transition-all cursor-pointer shadow-sm ${
                          speakingSectionId === 'knight' ? 'bg-[#E05252] text-white animate-pulse' : 'bg-[#8BA888] text-white hover:bg-[#779674]'
                        }`}
                        title="Nghe đọc quân Mã"
                      >
                        <VoiceSpeakingIcon className="w-3.5 h-3.5" off={speakingSectionId === 'knight'} />
                      </button>
                    </div>

                    {/* Bishop */}
                    <div className="p-3 bg-[#F2EDE7]/50 rounded-2xl border border-[#E8E2D9] flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 shrink-0 bg-white rounded-xl p-1 shadow-sm border border-[#E8E2D9] flex items-center justify-center">
                          <ChessPiece type="b" color="w" />
                        </div>
                        <div>
                          <strong className="text-[#5C5751] block font-black text-sm mb-0.5">Quân Tượng (Bishop)</strong>
                          <span className="text-zinc-600">Di chuyển theo các đường chéo không giới hạn ô, giữ nguyên màu ô suốt cả ván đấu.</span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          playSectionSpeech(
                            'bishop',
                            'Quân Tượng: Di chuyển theo các đường chéo không giới hạn ô, giữ nguyên màu ô suốt cả ván đấu.'
                          )
                        }
                        className={`p-1.5 rounded-lg shrink-0 transition-all cursor-pointer shadow-sm ${
                          speakingSectionId === 'bishop' ? 'bg-[#E05252] text-white animate-pulse' : 'bg-[#8BA888] text-white hover:bg-[#779674]'
                        }`}
                        title="Nghe đọc quân Tượng"
                      >
                        <VoiceSpeakingIcon className="w-3.5 h-3.5" off={speakingSectionId === 'bishop'} />
                      </button>
                    </div>

                    {/* Rook */}
                    <div className="p-3 bg-[#F2EDE7]/50 rounded-2xl border border-[#E8E2D9] flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 shrink-0 bg-white rounded-xl p-1 shadow-sm border border-[#E8E2D9] flex items-center justify-center">
                          <ChessPiece type="r" color="w" />
                        </div>
                        <div>
                          <strong className="text-[#5C5751] block font-black text-sm mb-0.5">Quân Xe (Rook)</strong>
                          <span className="text-zinc-600">Di chuyển dọc theo các cột hoặc ngang theo các hàng không giới hạn số ô.</span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          playSectionSpeech(
                            'rook',
                            'Quân Xe: Di chuyển dọc theo các cột hoặc ngang theo các hàng không giới hạn số ô.'
                          )
                        }
                        className={`p-1.5 rounded-lg shrink-0 transition-all cursor-pointer shadow-sm ${
                          speakingSectionId === 'rook' ? 'bg-[#E05252] text-white animate-pulse' : 'bg-[#8BA888] text-white hover:bg-[#779674]'
                        }`}
                        title="Nghe đọc quân Xe"
                      >
                        <VoiceSpeakingIcon className="w-3.5 h-3.5" off={speakingSectionId === 'rook'} />
                      </button>
                    </div>

                    {/* Queen */}
                    <div className="p-3 bg-[#F2EDE7]/50 rounded-2xl border border-[#E8E2D9] flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 shrink-0 bg-white rounded-xl p-1 shadow-sm border border-[#E8E2D9] flex items-center justify-center">
                          <ChessPiece type="q" color="w" />
                        </div>
                        <div>
                          <strong className="text-[#5C5751] block font-black text-sm mb-0.5">Quân Hậu (Queen)</strong>
                          <span className="text-zinc-600">Quân mạnh nhất bàn cờ! Di chuyển kết hợp sức mạnh của cả Xe và Tượng (ngang, dọc, chéo tùy ý).</span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          playSectionSpeech(
                            'queen',
                            'Quân Hậu: Quân mạnh nhất bàn cờ. Di chuyển kết hợp sức mạnh của cả Xe và Tượng.'
                          )
                        }
                        className={`p-1.5 rounded-lg shrink-0 transition-all cursor-pointer shadow-sm ${
                          speakingSectionId === 'queen' ? 'bg-[#E05252] text-white animate-pulse' : 'bg-[#8BA888] text-white hover:bg-[#779674]'
                        }`}
                        title="Nghe đọc quân Hậu"
                      >
                        <VoiceSpeakingIcon className="w-3.5 h-3.5" off={speakingSectionId === 'queen'} />
                      </button>
                    </div>

                    {/* King */}
                    <div className="p-3 bg-[#F2EDE7]/50 rounded-2xl border border-[#E8E2D9] flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 shrink-0 bg-white rounded-xl p-1 shadow-sm border border-[#E8E2D9] flex items-center justify-center">
                          <ChessPiece type="k" color="w" />
                        </div>
                        <div>
                          <strong className="text-[#5C5751] block font-black text-sm mb-0.5">Quân Vua (King)</strong>
                          <span className="text-zinc-600">Quân quan trọng nhất! Di chuyển 1 ô theo mọi hướng. Bé phải luôn bảo vệ Vua an toàn.</span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          playSectionSpeech(
                            'king',
                            'Quân Vua: Quân quan trọng nhất. Di chuyển một ô theo mọi hướng. Bé phải luôn bảo vệ Vua an toàn.'
                          )
                        }
                        className={`p-1.5 rounded-lg shrink-0 transition-all cursor-pointer shadow-sm ${
                          speakingSectionId === 'king' ? 'bg-[#E05252] text-white animate-pulse' : 'bg-[#8BA888] text-white hover:bg-[#779674]'
                        }`}
                        title="Nghe đọc quân Vua"
                      >
                        <VoiceSpeakingIcon className="w-3.5 h-3.5" off={speakingSectionId === 'king'} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Special moves */}
                <div className="bg-white p-4 rounded-2xl border border-[#E8E2D9] shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-[#5C5751] flex items-center gap-2 text-sm text-[#8BA888]">
                      ✨ Các nước đi đặc biệt trong Cờ Vua
                    </h4>
                  </div>

                  <div className="space-y-2.5 text-xs font-semibold text-zinc-600">
                    <div className="p-3 bg-[#F2EDE7]/40 rounded-2xl border border-[#E8E2D9] space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-[#5C5751] font-black text-sm block">🏰 Nhập thành (Castling):</strong>
                        <button
                          onClick={() =>
                            playSectionSpeech(
                              'special_castling',
                              'Nhập thành: Nước đi duy nhất cho phép di chuyển cả Vua và Xe cùng một lúc, giúp đưa Vua vào vị trí an toàn và đưa Xe ra làm nhiệm vụ tấn công. Vua di chuyển 2 ô về phía Xe, và Xe nhảy qua đứng ngay sát cạnh Vua. Ba Điều kiện bắt buộc để Nhập thành: Một, Cả Vua và quân Xe đó chưa từng di chuyển lần nào trong ván. Hai, Không có bất kỳ quân cờ nào đứng cản ở giữa hàng ngang nối Vua và Xe. Ba, Vua không đang bị chiếu, và các ô Vua đi qua hoặc hạ cánh không bị quân đối phương đe dọa.'
                            )
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer shadow-sm ${
                            speakingSectionId === 'special_castling'
                              ? 'bg-[#E05252] text-white animate-pulse'
                              : 'bg-[#8BA888] text-white hover:bg-[#779674]'
                          }`}
                        >
                          {speakingSectionId === 'special_castling' ? (
                            <>
                              <VoiceSpeakingIcon className="w-3 h-3" off={true} />
                              <span>Dừng đọc</span>
                            </>
                          ) : (
                            <>
                              <VoiceSpeakingIcon className="w-3 h-3" />
                              <span>Nghe đọc</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-zinc-600 leading-relaxed">
                        Nước đi duy nhất cho phép di chuyển cả Vua và Xe cùng một lúc, giúp đưa Vua vào vị trí an toàn và đưa Xe ra làm nhiệm vụ tấn công. Vua di chuyển 2 ô về phía Xe, và Xe nhảy qua đứng ngay sát cạnh Vua.
                      </p>
                      <div className="bg-white p-2.5 rounded-xl border border-[#E8E2D9]/80 text-[11px] space-y-1 text-zinc-500 mt-1">
                        <span className="font-bold text-[#8BA888] block">📌 3 Điều kiện bắt buộc để Nhập thành:</span>
                        <ul className="list-disc list-inside space-y-0.5 pl-0.5">
                          <li>Cả Vua và quân Xe đó <strong>chưa từng di chuyển</strong> lần nào trong ván.</li>
                          <li><strong>Không có bất kỳ quân cờ nào</strong> đứng cản ở giữa hàng ngang nối Vua và Xe.</li>
                          <li>Vua <strong>không đang bị chiếu</strong>, và các ô Vua đi qua hoặc hạ cánh không bị quân đối phương đe dọa.</li>
                        </ul>
                      </div>
                    </div>

                    <div className="p-3 bg-[#F2EDE7]/40 rounded-2xl border border-[#E8E2D9] space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-[#5C5751] font-black text-sm block">♟️ Bắt tốt qua đường (En Passant):</strong>
                        <button
                          onClick={() =>
                            playSectionSpeech(
                              'special_enpassant',
                              'Bắt tốt qua đường: Nước ăn quân đặc biệt chỉ dành riêng cho Tốt nhằm tránh việc Tốt đối phương nhảy 2 ô để né mặt Tốt của bé. Cách thực hiện và điều kiện: Tốt của bé đang đứng ở hàng 5 nếu cầm quân Trắng, hoặc hàng 4 nếu cầm quân Đen. Tốt đối phương ở cột bên cạnh nhảy 2 ô từ vị trí xuất phát và đứng ngay song song bên cạnh Tốt của bé. Bé có thể di chuyển Tốt của mình chéo 1 ô lên phía sau lưng Tốt đối phương và loại bỏ Tốt đó khỏi bàn cờ. Bắt tốt qua đường phải thực hiện ngay ở nước đi tiếp theo.'
                            )
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer shadow-sm ${
                            speakingSectionId === 'special_enpassant'
                              ? 'bg-[#E05252] text-white animate-pulse'
                              : 'bg-[#8BA888] text-white hover:bg-[#779674]'
                          }`}
                        >
                          {speakingSectionId === 'special_enpassant' ? (
                            <>
                              <VoiceSpeakingIcon className="w-3 h-3" off={true} />
                              <span>Dừng đọc</span>
                            </>
                          ) : (
                            <>
                              <VoiceSpeakingIcon className="w-3 h-3" />
                              <span>Nghe đọc</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-zinc-600 leading-relaxed">
                        Nước ăn quân đặc biệt chỉ dành riêng cho Tốt nhằm tránh việc Tốt đối phương nhảy 2 ô để "né" mặt Tốt của bé.
                      </p>
                      <div className="bg-white p-2.5 rounded-xl border border-[#E8E2D9]/80 text-[11px] space-y-1 text-zinc-500 mt-1">
                        <span className="font-bold text-[#8BA888] block">📌 Cách thực hiện & Điều kiện:</span>
                        <ul className="list-disc list-inside space-y-0.5 pl-0.5">
                          <li>Tốt của bé đang đứng ở <strong>hàng 5</strong> (nếu cầm quân Trắng) hoặc <strong>hàng 4</strong> (nếu cầm quân Đen).</li>
                          <li>Tốt đối phương ở cột bên cạnh nhảy 2 ô từ vị trí xuất phát và đứng <strong>ngay song song bên cạnh</strong> Tốt của bé.</li>
                          <li>Bé có thể di chuyển Tốt của mình chéo 1 ô lên phía sau lưng Tốt đối phương và loại bỏ Tốt đó khỏi bàn cờ.</li>
                          <li><strong>Lưu ý:</strong> Bắt tốt qua đường <strong>phải thực hiện ngay ở nước đi tiếp theo</strong>. Nếu bé đi nước khác, quyền bắt qua đường cho nước đó sẽ mất vĩnh viễn!</li>
                        </ul>
                      </div>
                    </div>

                    <div className="p-3 bg-[#F2EDE7]/40 rounded-2xl border border-[#E8E2D9] space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-[#5C5751] font-black text-sm block">🌟 Phong cấp (Promotion):</strong>
                        <button
                          onClick={() =>
                            playSectionSpeech(
                              'special_promotion',
                              'Phong cấp: Khi quân Tốt dũng cảm vượt qua mọi chướng ngại vật đi tới hàng cuối cùng phía bàn cờ đối phương, bé sẽ lập tức được phong cấp cho Tốt đó thành một trong các quân mạnh hơn: Hậu, Xe, Tượng hoặc Mã.'
                            )
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer shadow-sm ${
                            speakingSectionId === 'special_promotion'
                              ? 'bg-[#E05252] text-white animate-pulse'
                              : 'bg-[#8BA888] text-white hover:bg-[#779674]'
                          }`}
                        >
                          {speakingSectionId === 'special_promotion' ? (
                            <>
                              <VoiceSpeakingIcon className="w-3 h-3" off={true} />
                              <span>Dừng đọc</span>
                            </>
                          ) : (
                            <>
                              <VoiceSpeakingIcon className="w-3 h-3" />
                              <span>Nghe đọc</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-zinc-600 leading-relaxed">
                        Khi quân Tốt dũng cảm vượt qua mọi chướng ngại vật đi tới hàng cuối cùng phía bàn cờ đối phương (hàng 8 đối với Trắng, hàng 1 đối me Đen), bé sẽ lập tức được phong cấp cho Tốt đó thành một trong các quân mạnh hơn: <strong>Hậu, Xe, Tượng hoặc Mã</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rules of Checkmate & Draw */}
                <div className="bg-white p-4 rounded-2xl border border-[#E8E2D9] shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-[#5C5751] flex items-center gap-2 text-sm text-[#8BA888]">
                      🎯 Chiếu bí & Quy tắc Hòa cờ
                    </h4>
                    <button
                      onClick={() =>
                        playSectionSpeech(
                          'sec_checkmate_draw',
                          'Chiếu bí và Quy tắc Hòa cờ. Chiếu tướng: Khi Vua bị một quân cờ đối phương đe dọa ăn ở nước tiếp theo. Bé bắt buộc phải di chuyển Vua, ăn quân chiếu hoặc dùng quân khác chắn đường. Chiếu bí: Khi Vua bị chiếu và không còn bất kỳ nước đi hợp lệ nào để thoát khỏi nguy hiểm, người thực hiện nước chiếu bí sẽ giành chiến thắng. Bốn trường hợp Hòa cờ: Một, Bế tắc: Đến lượt đi nhưng Vua không bị chiếu và bé cũng không còn nước đi hợp lệ nào khác. Hai, Lặp lại thế cờ 3 lần: Khi cùng một vị trí thế cờ trên bàn lặp đi lặp lại 3 lần liên tiếp. Ba, Quy tắc 50 nước đi: Trải qua 50 nước đi liên tiếp mà không có Tốt nào di chuyển và không có quân cờ nào bị ăn. Bốn, Không đủ lực lượng: Khi cả hai bên không còn đủ quân để chiếu bí.'
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer shadow-sm ${
                        speakingSectionId === 'sec_checkmate_draw'
                          ? 'bg-[#E05252] text-white animate-pulse'
                          : 'bg-[#8BA888] text-white hover:bg-[#779674]'
                      }`}
                    >
                      {speakingSectionId === 'sec_checkmate_draw' ? (
                        <>
                          <VoiceSpeakingIcon className="w-3.5 h-3.5" off={true} />
                          <span>Dừng đọc</span>
                        </>
                      ) : (
                        <>
                          <VoiceSpeakingIcon className="w-3.5 h-3.5" />
                          <span>🔊 Nghe đọc phần này</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2 text-xs font-semibold text-zinc-600">
                    <div className="p-2.5 bg-[#F2EDE7]/40 rounded-xl border border-[#E8E2D9]">
                      <strong className="text-[#5C5751] font-extrabold block">⚡ Chiếu tướng (Check):</strong>
                      <span>Khi Vua bị một quân cờ đối phương đe dọa ăn ở nước tiếp theo. Bé bắt buộc phải di chuyển Vua, ăn quân chiếu hoặc dùng quân khác chắn đường.</span>
                    </div>

                    <div className="p-2.5 bg-[#F2EDE7]/40 rounded-xl border border-[#E8E2D9]">
                      <strong className="text-[#5C5751] font-extrabold block">🏆 Chiếu bí (Checkmate):</strong>
                      <span>Khi Vua bị chiếu và không còn bất kỳ nước đi hợp lệ nào để thoát khỏi nguy hiểm — Người thực hiện nước chiếu bí sẽ giành chiến thắng!</span>
                    </div>

                    <div className="p-2.5 bg-[#F2EDE7]/40 rounded-xl border border-[#E8E2D9] space-y-1">
                      <strong className="text-[#5C5751] font-extrabold block">🤝 4 Trường hợp Hòa cờ (Draw):</strong>
                      <ul className="list-disc list-inside space-y-1 pl-1 text-zinc-600">
                        <li><strong className="text-[#5C5751]">Bế tắc (Stalemate):</strong> Đến lượt đi nhưng Vua không bị chiếu và bé cũng không còn nước đi hợp lệ nào khác.</li>
                        <li><strong className="text-[#5C5751]">Lặp lại thế cờ 3 lần:</strong> Khi cùng một vị trí thế cờ trên bàn lặp đi lặp lại 3 lần liên tiếp trong ván đấu.</li>
                        <li><strong className="text-[#5C5751]">Quy tắc 50 nước đi:</strong> Trải qua 50 nước đi liên tiếp của cả 2 bên mà không có Tốt nào di chuyển và không có quân cờ nào bị ăn.</li>
                        <li><strong className="text-[#5C5751]">Không đủ lực lượng:</strong> Khi cả 2 bên không còn đủ quân để chiếu bí (ví dụ chỉ còn 2 Vua, hoặc Vua + Mã đấu Vua).</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer button */}
          <div className="mt-4 pt-3 border-t border-[#E8E2D9] shrink-0">
            <button
              onClick={handleClose}
              className="w-full py-3 bg-[#8BA888] hover:bg-[#7A9777] text-white font-black text-sm rounded-2xl transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Đã hiểu rồi, bắt đầu chơi thôi! ✨
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
