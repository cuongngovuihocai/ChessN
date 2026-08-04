import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, BrainCircuit, RefreshCw, Mic, MicOff } from 'lucide-react';
import Markdown from 'react-markdown';
import { ChatMessage } from '../types';
import { ChessPiece } from './ChessPiece';
import { getAvatars } from '../utils/profileStorage';

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

interface CoachChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onExplainMove: (msgId: string) => void;
  onGetHint: () => void;
  isAiThinking: boolean;
  canGetHint: boolean;
  playerName: string;
  isNarrationOnly?: boolean;
}

export const CoachChat: React.FC<CoachChatProps> = ({
  messages,
  onSendMessage,
  onExplainMove,
  onGetHint,
  isAiThinking,
  canGetHint,
  playerName,
  isNarrationOnly = false,
}) => {
  const [inputText, setInputText] = React.useState('');
  const [isListening, setIsListening] = React.useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto scroll inside chat container only, avoiding window scroll jumps
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isAiThinking]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const toggleListening = () => {
    const Win = window as unknown as IWindow;
    const SpeechRecognition = Win.SpeechRecognition || Win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói (Speech to Text). Bé hãy dùng Chrome hoặc Edge nhé!');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInputText(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div 
      className={`flex flex-col ${!isNarrationOnly ? 'h-[500px] sm:h-[588px] lg:h-[710px]' : 'h-[420px] sm:h-[480px] lg:h-[588px]'} w-full rounded-3xl border-4 border-[#8BA888] bg-[#FFFDFB] shadow-sm overflow-hidden`} 
      style={{ borderStyle: 'solid' }}
    >
      {/* Chat Header */}
      <div className="bg-[#8BA888] text-white p-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <div>
            <h3 className="font-bold text-sm tracking-tight text-white">
              {isNarrationOnly ? "Tường thuật trận đấu - Sư phụ Thỏ" : "Trò chuyện với Sư Phụ Thỏ"}
            </h3>
          </div>
        </div>
        
        {/* Hint Trigger in Header */}
        {!isNarrationOnly && (
          <button
            onClick={onGetHint}
            disabled={!canGetHint || isAiThinking}
            className={`flex items-center space-x-1 text-[13px] py-1.5 px-3 rounded-full font-bold transition-all shadow-sm ${
              canGetHint && !isAiThinking
                ? 'bg-[#EBD99F] hover:bg-[#EADBB3] text-[#5C5751] cursor-pointer active:scale-95'
                : 'bg-[#F2EDE7]/50 text-zinc-400 cursor-not-allowed'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Gợi ý</span>
          </button>
        )}
      </div>

      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isPlayer = msg.sender === 'player';
            const isSystem = msg.sender === 'system';
            
            if (isSystem) {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center text-center my-1.5"
                >
                  <span className="text-[13px] bg-[#F2EDE7] text-[#5C5751] px-3 py-1 rounded-full border border-[#E8E2D9] font-medium">
                    {msg.text}
                  </span>
                </motion.div>
              );
            }

            // Determine avatar content based on sender, character, and move
            const renderAvatar = () => {
              if (isPlayer) {
                const playerAvatar = msg.avatar;
                const found = getAvatars().find(a => a.id === playerAvatar);
                return found ? found.emoji : (playerAvatar || '🦁');
              }

              // Sư phụ Thỏ always gets the Rabbit emoji
              if (msg.characterName === 'Sư phụ Thỏ' || msg.avatar === '🐰') {
                return '🐰';
              }

              // Opponent move comment
              if (msg.moveData?.pieceName && msg.moveData?.color) {
                return <ChessPiece type={msg.moveData.pieceName} color={msg.moveData.color} className="w-full h-full scale-110" />;
              }

              // Fallback opponent avatar
              const opponentAvatar = msg.avatar;
              const foundOpponent = getAvatars().find(a => a.id === opponentAvatar);
              return foundOpponent ? foundOpponent.emoji : (opponentAvatar || '🤖');
            };

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: isPlayer ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-start gap-2.5 ${isPlayer ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                  isPlayer 
                    ? 'bg-[#EBD99F] border-2 border-white text-lg overflow-hidden' 
                    : 'bg-[#F2EDE7] border-2 border-white overflow-hidden p-0.5 text-lg'
                }`}>
                  {renderAvatar()}
                </div>

                {/* Message Bubble Container */}
                <div className={`flex flex-col max-w-[88%] ${isPlayer ? 'items-end' : 'items-start'}`}>
                  {/* Sender Name */}
                  <span className="text-[13px] font-bold text-zinc-400 mb-0.5 px-1">
                    {isPlayer ? playerName : msg.characterName || 'Sư phụ Thỏ'}
                  </span>

                  {/* Bubble body */}
                  <div className={`rounded-2xl p-3 text-[13px] leading-relaxed shadow-sm ${
                    isPlayer 
                      ? 'bg-[#5C5751] text-white rounded-tr-none font-medium' 
                      : 'bg-[#F2EDE7] text-[#4A4540] border border-[#E8E2D9] rounded-tl-none'
                  }`}>
                    <div className={`text-[13px] leading-relaxed [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 ${
                      isPlayer 
                        ? '[&_strong]:font-bold [&_strong]:text-white [&_em]:italic [&_code]:bg-white/20 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[12px]' 
                        : '[&_strong]:font-bold [&_strong]:text-[#2C2825] [&_em]:italic [&_code]:bg-[#E2D9CE] [&_code]:text-[#3B342C] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[12px]'
                    }`}>
                      <Markdown>{msg.text}</Markdown>
                    </div>
                    
                    {/* Unique tactical explain triggers inside the move comments */}
                    {!isPlayer && !isNarrationOnly && msg.isExplainable && msg.moveData && (
                      <div className="mt-2.5 pt-2 border-t border-[#E8E2D9] flex items-center justify-between gap-1">
                        <span className="text-[13px] text-[#8BA888] font-bold">
                          Bấm nút để nghe mẹo chiến thuật 👇
                        </span>
                        <button
                          onClick={() => onExplainMove(msg.id)}
                          className="flex items-center space-x-1 bg-[#8BA888] hover:bg-[#728F6F] active:scale-95 text-white py-1 px-2.5 rounded-full font-bold text-[13px] shadow transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-[#EBD99F] animate-pulse" />
                          <span>Giải thích</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* AI Typing loader */}
        {isAiThinking && (
          <div className="flex items-start gap-2.5 flex-row">
            <div className="w-8 h-8 rounded-full bg-[#F2EDE7] border-2 border-white flex items-center justify-center flex-shrink-0 animate-pulse text-lg">
              🥕
            </div>
            <div className="flex flex-col items-start max-w-[88%]">
              <span className="text-[13px] font-bold text-zinc-400 mb-0.5 px-1">
                Thỏ Trắng đang phân tích...
              </span>
              <div className="rounded-2xl p-3 bg-[#F2EDE7] border border-[#E8E2D9] rounded-tl-none flex items-center space-x-1.5 h-9">
                <div className="w-2 h-2 bg-[#8BA888] rounded-full animate-bounce delay-75" />
                <div className="w-2 h-2 bg-[#8BA888] rounded-full animate-bounce delay-150" />
                <div className="w-2 h-2 bg-[#8BA888] rounded-full animate-bounce delay-300" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input controls form or Referee indicator */}
      {isNarrationOnly ? (
        <div className="p-3.5 bg-white border-t border-[#E8E2D9] flex items-center justify-center space-x-2 text-[13px] font-bold text-[#5C5751]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#8BA888] animate-ping" />
          <span>🎙️ Sư phụ Thỏ đang làm trọng tài & tường thuật ván đấu</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-[#E8E2D9] flex items-center space-x-2 relative">
          {/* Active Speech Recognition Indicator Overlay */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="absolute -top-10 left-4 bg-red-500 text-white text-[12px] font-bold px-3.5 py-1 rounded-full shadow-md flex items-center space-x-2 border-2 border-white z-10"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <span>Đang lắng nghe... Bé hãy nói đi nào! 🎙️</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex-1 flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? "Đang lắng nghe giọng nói của bé..." : "Hỏi Sư Phụ Thỏ hoặc bấm micro..."}
              disabled={isAiThinking}
              className={`w-full text-[13px] border rounded-xl py-2.5 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-[#8BA888]/50 bg-white disabled:opacity-60 transition-colors text-[#4A4540] ${
                isListening ? 'border-red-400 ring-2 ring-red-400/30' : 'border-[#E8E2D9]'
              }`}
            />

            {/* Speech to Text Microphone Button */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={isAiThinking}
              title={isListening ? "Tắt Micro" : "Nói để nhập tin nhắn (Speech-to-text)"}
              className={`absolute right-2 p-1.5 rounded-lg transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-md scale-105'
                  : 'text-zinc-400 hover:text-[#8BA888] hover:bg-[#F2EDE7] active:scale-90'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || isAiThinking}
            className={`p-2.5 rounded-xl transition-all text-white flex items-center justify-center ${
              inputText.trim() && !isAiThinking
                ? 'bg-[#8BA888] hover:bg-[#728F6F] cursor-pointer active:scale-90 shadow-sm'
                : 'bg-[#F2EDE7] text-zinc-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
};
