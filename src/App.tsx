import { useState, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, 
  Award, 
  Sparkles, 
  BrainCircuit, 
  Play, 
  HelpCircle, 
  TrendingUp, 
  BookOpen, 
  ChevronRight,
  Info,
  Maximize2,
  Minimize2,
  Flag,
  Settings,
  Clock,
  MessageSquare
} from 'lucide-react';

import { Difficulty, TimeControlMode, PlayerProfile, ChatMessage } from './types';
import { ChessboardView, LastMoveInfo } from './components/ChessboardView';
import { ChessPiece } from './components/ChessPiece';
import { CoachChat } from './components/CoachChat';
import { OnlineChat } from './components/OnlineChat';
import { GameModeSelector, GameMode, TwoPlayerSubMode } from './components/GameModeSelector';
import { ProfileSelector } from './components/ProfileSelector';
import { DifficultyRecommender } from './components/DifficultyRecommender';
import { SettingsModal } from './components/SettingsModal';
import { GuideModal } from './components/GuideModal';
import { GameResultModal } from './components/GameResultModal';
import { getProfiles, getActiveProfileId, addMatchRecord, setActiveProfileId, getAvatars } from './utils/profileStorage';
import { getAIMove, getWhiteBestMoves, getGameStage } from './utils/chessAI';
import { getStrategicHint, explainMoveTactics, answerCoachQuestion, formatFriendlyMoveText } from './utils/chessTactics';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
import { speakWithRole, getRabbitPlayerSpeech, getOpponentSpeech, getGameOverSpeech, getSpeechEnabled, setSpeechEnabled } from './lib/speech';
import { 
  OnlineRoomData, 
  generateRoomId, 
  createOnlineRoom, 
  joinOnlineRoom, 
  subscribeToOnlineRoom, 
  makeOnlineMove, 
  resignOnlineGame,
  resetOnlineGame, 
  startOnlineGame,
  updateOnlineTimeControlMode,
  sendOnlineChatMessage,
  setupRoomOnDisconnect,
  leaveOnlineRoomService
} from './services/onlineChessService';

export default function App() {
  // Chess Core States
  const chessRef = useRef<Chess>(new Chess());
  const [fen, setFen] = useState<string>(chessRef.current.fen());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<LastMoveInfo | null>(null);
  const [kingInCheckSquare, setKingInCheckSquare] = useState<string | null>(null);
  const [gameResult, setGameResult] = useState<'win' | 'loss' | 'draw' | 'active'>('active');

  // Player & Profile States
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [isBoardExpanded, setIsBoardExpanded] = useState<boolean>(false);
  const [gameCompletedTrigger, setGameCompletedTrigger] = useState<number>(0);
  
  // Game Mode & Online Room States
  const [gameMode, setGameMode] = useState<GameMode>('vs_ai');
  const [twoPlayerSubMode, setTwoPlayerSubMode] = useState<TwoPlayerSubMode>('offline');
  const [onlineRoomId, setOnlineRoomId] = useState<string | null>(null);
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomData | null>(null);
  const [userRole, setUserRole] = useState<'w' | 'b' | 'spectator' | null>(null);
  const [isConnectingRoom, setIsConnectingRoom] = useState<boolean>(false);
  const [onlineTab, setOnlineTab] = useState<'chat' | 'coach'>('chat');

  // Chat & AI Coaching States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [autoComment, setAutoComment] = useState(false); // Default false to save tokens
  const [hideRabbitNarration, setHideRabbitNarration] = useState<boolean>(() => {
    return localStorage.getItem('chess_hide_rabbit_narration') === 'true';
  });

  const handleToggleHideRabbitNarration = (val: boolean) => {
    setHideRabbitNarration(val);
    localStorage.setItem('chess_hide_rabbit_narration', String(val));
  };

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speechEnabled, setSpeechEnabledState] = useState(getSpeechEnabled());
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [gameWinnerColor, setGameWinnerColor] = useState<'w' | 'b' | null>(null);
  const [isCheckmateState, setIsCheckmateState] = useState(false);
  const [isDrawState, setIsDrawState] = useState(false);
  const [isTimeoutState, setIsTimeoutState] = useState(false);
  const [isResignedState, setIsResignedState] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [pendingPromotionMove, setPendingPromotionMove] = useState<{ from: Square; to: Square } | null>(null);

  // Time Control States (Standard default: 90 mins = 5400s)
  const [timeControlMode, setTimeControlMode] = useState<TimeControlMode>('standard');
  const [whiteTime, setWhiteTime] = useState<number>(5400);
  const [blackTime, setBlackTime] = useState<number>(5400);
  const [whiteMoveCount, setWhiteMoveCount] = useState<number>(0);
  const [blackMoveCount, setBlackMoveCount] = useState<number>(0);
  const [whiteBonusAdded, setWhiteBonusAdded] = useState<boolean>(false);
  const [blackBonusAdded, setBlackBonusAdded] = useState<boolean>(false);

  const getInitialSecondsForMode = (mode: TimeControlMode): number => {
    switch (mode) {
      case 'rapid': return 900; // 15 mins
      case 'blitz': return 180; // 3 mins
      case 'standard': default: return 5400; // 90 mins
    }
  };

  const resetTimers = (mode = timeControlMode) => {
    const initSecs = getInitialSecondsForMode(mode);
    setWhiteTime(initSecs);
    setBlackTime(initSecs);
    setWhiteMoveCount(0);
    setBlackMoveCount(0);
    setWhiteBonusAdded(false);
    setBlackBonusAdded(false);
    setIsTimeoutState(false);
  };

  const handleSelectTimeControlMode = (mode: TimeControlMode) => {
    setTimeControlMode(mode);
    resetTimers(mode);
    if (gameMode === 'two_players' && twoPlayerSubMode === 'online' && onlineRoomId) {
      updateOnlineTimeControlMode(onlineRoomId, mode);
    }
  };

  const formatChessTime = (totalSeconds: number): string => {
    if (totalSeconds < 0) totalSeconds = 0;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const recordMoveIncrement = (color: 'w' | 'b') => {
    if (color === 'w') {
      setWhiteMoveCount(prev => {
        const nextCount = prev + 1;
        if (timeControlMode === 'rapid') {
          setWhiteTime(t => t + 10);
        } else if (timeControlMode === 'blitz') {
          setWhiteTime(t => t + 2);
        } else if (timeControlMode === 'standard' && nextCount === 40 && !whiteBonusAdded) {
          setWhiteTime(t => t + 1800);
          setWhiteBonusAdded(true);
        }
        return nextCount;
      });
    } else if (color === 'b') {
      setBlackMoveCount(prev => {
        const nextCount = prev + 1;
        if (timeControlMode === 'rapid') {
          setBlackTime(t => t + 10);
        } else if (timeControlMode === 'blitz') {
          setBlackTime(t => t + 2);
        } else if (timeControlMode === 'standard' && nextCount === 40 && !blackBonusAdded) {
          setBlackTime(t => t + 1800);
          setBlackBonusAdded(true);
        }
        return nextCount;
      });
    }
  };

  // Two Player Referee Score Tracking State
  const [twoPlayerScore, setTwoPlayerScore] = useState<{ white: number; black: number; games: number }>({
    white: 0,
    black: 0,
    games: 0
  });
  const lastAnnouncedMatchRef = useRef<string | null>(null);

  const announceTwoPlayerGameEnd = (winner: 'w' | 'b' | 'draw', matchKey: string) => {
    if (lastAnnouncedMatchRef.current === matchKey) {
      return;
    }
    lastAnnouncedMatchRef.current = matchKey;

    let announceText = "";

    setTwoPlayerScore(prev => {
      let newWhite = prev.white;
      let newBlack = prev.black;
      const newGames = prev.games + 1;

      if (winner === 'w') newWhite += 1;
      else if (winner === 'b') newBlack += 1;

      if (newGames === 1) {
        if (winner === 'w') {
          announceText = "Ván đấu vừa rồi, phần thắng thuộc về Quân Trắng. Tỷ số là 1 - 0 nghiêng về Đội Trắng.";
        } else if (winner === 'b') {
          announceText = "Ván đấu vừa rồi, phần thắng thuộc về Quân Đen. Tỷ số là 1 - 0 nghiêng về Đội Đen.";
        } else {
          announceText = "Ván đấu vừa rồi, hai bên hòa nhau. Tỷ số là 0 - 0.";
        }
      } else {
        if (winner === 'w') {
          if (newWhite > newBlack) {
            announceText = `Kết thúc ván đấu hấp dẫn này, Quân Trắng tiếp tục giành được thắng lợi. Tỷ số bây giờ là ${newWhite} - ${newBlack} nghiêng về Đội Trắng.`;
          } else if (newWhite === newBlack) {
            announceText = `Kết thúc ván đấu hấp dẫn này, Quân Trắng đã xuất sắc giành thắng lợi. Tỷ số bây giờ là ${newWhite} - ${newBlack} chia đều cho hai đội.`;
          } else {
            announceText = `Kết thúc ván đấu hấp dẫn này, Quân Trắng đã giành chiến thắng và rút ngắn tỷ số xuống ${newWhite} - ${newBlack} nghiêng về Đội Đen.`;
          }
        } else if (winner === 'b') {
          if (newBlack > newWhite) {
            announceText = `Kết thúc ván đấu hấp dẫn này, Quân Đen tiếp tục giành được thắng lợi. Tỷ số bây giờ là ${newBlack} - ${newWhite} nghiêng về Đội Đen.`;
          } else if (newWhite === newBlack) {
            announceText = `Kết thúc ván đấu hấp dẫn này, Quân Đen đã xuất sắc giành thắng lợi. Tỷ số bây giờ là ${newBlack} - ${newWhite} chia đều cho hai đội.`;
          } else {
            announceText = `Kết thúc ván đấu hấp dẫn này, Quân Đen đã giành chiến thắng và rút ngắn tỷ số xuống ${newBlack} - ${newWhite} nghiêng về Đội Trắng.`;
          }
        } else {
          if (newWhite > newBlack) {
            announceText = `Kết thúc ván đấu hấp dẫn này, hai bên hòa nhau. Tỷ số hiện tại là ${newWhite} - ${newBlack} nghiêng về Đội Trắng.`;
          } else if (newBlack > newWhite) {
            announceText = `Kết thúc ván đấu hấp dẫn này, hai bên hòa nhau. Tỷ số hiện tại là ${newBlack} - ${newWhite} nghiêng về Đội Đen.`;
          } else {
            announceText = `Kết thúc ván đấu hấp dẫn này, hai bên hòa nhau. Tỷ số hiện tại là ${newWhite} - ${newBlack}.`;
          }
        }
      }

      return { white: newWhite, black: newBlack, games: newGames };
    });

    if (announceText) {
      const msgId = `referee_announcement_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setMessages(msgs => [
        ...msgs,
        {
          id: msgId,
          sender: 'ai_coach',
          text: announceText,
          timestamp: new Date().toISOString(),
          characterName: "Sư phụ Thỏ (Trọng tài)",
          avatar: "🐰"
        }
      ]);

      if (gameMode === 'two_players' && twoPlayerSubMode === 'online' && onlineRoomId) {
        // Chỉ để client của Quân Trắng (Host phòng) đứng ra đại diện phát thông báo lên RTDB chat phòng, tránh trùng lặp 2 lần do cả 2 máy cùng gửi
        if (userRole === 'w') {
          sendOnlineChatMessage(onlineRoomId, {
            senderId: 'referee_rabbit_master',
            senderName: 'Sư phụ Thỏ (Trọng tài)',
            avatar: '🐰',
            text: announceText,
            roleTag: 'Trọng tài'
          }).catch((err) => {
            console.warn("Lỗi gửi thông báo trọng tài:", err);
          });
        }
      }

      speakWithRole(announceText, 'rabbit_master');
    }
  };

  const handleTimeout = (losingColor: 'w' | 'b') => {
    const winningColor = losingColor === 'w' ? 'b' : 'w';
    playSound('gameover');
    setGameWinnerColor(winningColor);
    setIsCheckmateState(false);
    setIsDrawState(false);
    setIsTimeoutState(true);

    const isPlayerWin = (gameMode === 'two_players' && twoPlayerSubMode === 'online')
      ? winningColor === userRole
      : winningColor === playerColor;

    setGameResult(isPlayerWin ? 'win' : 'loss');

    const losingText = losingColor === 'w' ? 'Quân Trắng' : 'Quân Đen';
    const winningText = winningColor === 'w' ? 'Quân Trắng' : 'Quân Đen';
    setMessages(prev => [
      ...prev,
      {
        id: 'timeout_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        sender: 'system',
        text: `⏰ HẾT GIỜ! ${losingText} đã sử dụng hết thời gian thi đấu. ${winningText} giành CHIẾN THẮNG! 🏆`,
        timestamp: new Date().toISOString()
      }
    ]);

    if (gameMode === 'two_players') {
      announceTwoPlayerGameEnd(winningColor, `timeout_${losingColor}_${Date.now()}`);
      if (twoPlayerSubMode === 'online' && onlineRoomId && (userRole === 'w' || userRole === 'b')) {
        resignOnlineGame(onlineRoomId, losingColor);
      }
    }

    setShowResultModal(true);
  };

  // Clock Countdown Timer Interval
  useEffect(() => {
    if (!isGameStarted || gameResult !== 'active') return;

    const timer = setInterval(() => {
      const turn = chessRef.current.turn();
      if (turn === 'w') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            handleTimeout('w');
            return 0;
          }
          return prev - 1;
        });
      } else if (turn === 'b') {
        setBlackTime(prev => {
          if (prev <= 1) {
            handleTimeout('b');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isGameStarted, gameResult, userRole, gameMode, twoPlayerSubMode, playerColor, timeControlMode]);

  const handleToggleSpeech = (val: boolean) => {
    setSpeechEnabledState(val);
    setSpeechEnabled(val);
  };

  // Load profiles on mount
  useEffect(() => {
    const loadedProfiles = getProfiles();
    setProfiles(loadedProfiles);
    
    const activeId = getActiveProfileId();
    if (activeId && loadedProfiles.some(p => p.id === activeId)) {
      setActiveProfileIdState(activeId);
    } else if (loadedProfiles.length > 0) {
      setActiveProfileIdState(loadedProfiles[0].id);
      setActiveProfileId(loadedProfiles[0].id);
    }
  }, []);

  const activeProfile = profiles.find(p => p.id === activeProfileId);

  // Auto connect to online room if URL contains ?room=ROOM_ID
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get('room');
    if (roomIdFromUrl && activeProfileId) {
      const cleanRoomId = roomIdFromUrl.trim().toUpperCase();
      setGameMode('two_players');
      setTwoPlayerSubMode('online');
      handleJoinOnlineRoom(cleanRoomId);
    }
  }, [activeProfileId]);

  // Subscribe to Realtime Firebase Online Room updates
  useEffect(() => {
    if (!onlineRoomId) {
      setOnlineRoom(null);
      return;
    }

    const unsubscribe = subscribeToOnlineRoom(onlineRoomId, (rawRoom) => {
      if (!rawRoom) {
        alert("Phòng đấu này không còn tồn tại.");
        setOnlineRoomId(null);
        setOnlineRoom(null);
        setUserRole(null);
        return;
      }

      // Normalize Firebase RTDB values (Firebase omits null fields!)
      const roomWinner = (rawRoom.winner === 'w' || rawRoom.winner === 'b' || rawRoom.winner === 'draw') ? rawRoom.winner : null;
      const updatedRoom: OnlineRoomData = {
        ...rawRoom,
        winner: roomWinner,
        lastMove: rawRoom.lastMove || null,
        player1: rawRoom.player1 || null,
        player2: rawRoom.player2 || null,
        fen: rawRoom.fen || START_FEN,
        status: rawRoom.status || 'waiting',
        timeControlMode: rawRoom.timeControlMode || 'standard',
      };

      setOnlineRoom(updatedRoom);

      // Synchronize time control mode from room
      if (updatedRoom.timeControlMode && updatedRoom.timeControlMode !== timeControlMode) {
        setTimeControlMode(updatedRoom.timeControlMode);
      }

      // Synchronize game started status from room status
      if (updatedRoom.status === 'playing') {
        setIsGameStarted(true);
      } else if (updatedRoom.status === 'waiting' && updatedRoom.winner === null) {
        setIsGameStarted(false);
      }

      // Configure onDisconnect cleanup based on player count in the room
      if (userRole === 'w' || userRole === 'b') {
        const isOnlyPlayer = !(updatedRoom.player1 && updatedRoom.player2);
        setupRoomOnDisconnect(onlineRoomId, isOnlyPlayer);
      }

      // Check if room is waiting or playing with no winner and no move made (new or reset game)
      if (updatedRoom.winner === null && !updatedRoom.lastMove && (updatedRoom.fen === START_FEN || !updatedRoom.fen)) {
        lastAnnouncedMatchRef.current = null;
        chessRef.current = new Chess(START_FEN);
        setFen(chessRef.current.fen());
        setLastMove(null);
        setSelectedSquare(null);
        setPossibleMoves([]);
        setKingInCheckSquare(null);
        setIsGameStarted(updatedRoom.status === 'playing');
        setGameResult('active');
        setGameWinnerColor(null);
        setIsCheckmateState(false);
        setIsDrawState(false);
        setIsResignedState(false);
        setIsTimeoutState(false);
        setShowResultModal(false);
        resetTimers(updatedRoom.timeControlMode || timeControlMode);
        return;
      }

      // Sync chessboard FEN
      if (updatedRoom.fen && updatedRoom.fen !== chessRef.current.fen()) {
        chessRef.current.load(updatedRoom.fen);
        setFen(updatedRoom.fen);
        setIsGameStarted(true);

        if (updatedRoom.lastMove) {
          setLastMove(updatedRoom.lastMove);
          playSound(updatedRoom.lastMove.promotion ? 'check' : 'move');
        } else {
          setLastMove(null);
        }

        // Check for King in check
        let checkSquare: string | null = null;
        if (chessRef.current.inCheck()) {
          const board = chessRef.current.board();
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              const piece = board[r][c];
              if (piece && piece.type === 'k' && piece.color === chessRef.current.turn()) {
                checkSquare = piece.square;
                break;
              }
            }
          }
          playSound('check');
        }
        setKingInCheckSquare(checkSquare);

        // Check game over status
        if (chessRef.current.isGameOver() || updatedRoom.status === 'finished' || updatedRoom.winner !== null) {
          playSound('gameover');
          let roomWinner: 'w' | 'b' | 'draw' | null = updatedRoom.winner;

          if (chessRef.current.isCheckmate()) {
            const winnerColor = chessRef.current.turn() === 'w' ? 'b' : 'w';
            roomWinner = winnerColor;
            setGameWinnerColor(winnerColor);
            setIsCheckmateState(true);
            setIsDrawState(false);
            setGameResult(winnerColor === userRole ? 'win' : (userRole === 'spectator' ? 'active' : 'loss'));
          } else if (chessRef.current.isDraw() || updatedRoom.winner === 'draw') {
            roomWinner = 'draw';
            setGameWinnerColor(null);
            setIsCheckmateState(false);
            setIsDrawState(true);
            setGameResult('draw');
          } else if (updatedRoom.winner) {
            setGameWinnerColor(updatedRoom.winner);
            setIsCheckmateState(false);
            setGameResult(updatedRoom.winner === userRole ? 'win' : (userRole === 'spectator' ? 'active' : 'loss'));
          }

          if (roomWinner) {
            announceTwoPlayerGameEnd(roomWinner, `online_finish_${onlineRoomId}_${roomWinner}_${updatedRoom.updatedAt || ''}`);
          }
          setShowResultModal(true);
        }
      } else if (updatedRoom.status === 'finished' || updatedRoom.winner !== null) {
        // Handle game finish when FEN does not change (Resign or Timeout)
        playSound('gameover');
        if (updatedRoom.winner === 'draw') {
          setGameWinnerColor(null);
          setIsCheckmateState(false);
          setIsDrawState(true);
          setGameResult('draw');
        } else if (updatedRoom.winner) {
          setGameWinnerColor(updatedRoom.winner);
          setIsResignedState(true);
          setGameResult(updatedRoom.winner === userRole ? 'win' : (userRole === 'spectator' ? 'active' : 'loss'));
        }

        if (updatedRoom.winner) {
          announceTwoPlayerGameEnd(updatedRoom.winner, `online_finish_${onlineRoomId}_${updatedRoom.winner}_${updatedRoom.updatedAt || ''}`);
        }
        setShowResultModal(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onlineRoomId, userRole]);

  // Create new online room
  const handleCreateOnlineRoom = async () => {
    const profileToUse = activeProfile || {
      id: 'guest_' + Date.now(),
      name: 'Kỳ thủ nhí',
      avatar: '🦁'
    };

    setIsConnectingRoom(true);
    try {
      const newRoomId = generateRoomId();
      await createOnlineRoom(newRoomId, {
        id: profileToUse.id,
        name: profileToUse.name,
        avatar: profileToUse.avatar
      }, timeControlMode);

      setupRoomOnDisconnect(newRoomId, true);

      // Clean up previous local game & modal state
      chessRef.current = new Chess();
      setFen(chessRef.current.fen());
      setSelectedSquare(null);
      setPossibleMoves([]);
      setLastMove(null);
      setKingInCheckSquare(null);
      setIsGameStarted(false);
      setIsResignedState(false);
      setIsCheckmateState(false);
      setIsDrawState(false);
      setIsTimeoutState(false);
      setGameWinnerColor(null);
      setGameResult('active');
      setShowResultModal(false);
      resetTimers();

      setOnlineRoomId(newRoomId);
      setUserRole('w');
      setPlayerColor('w');
      setGameMode('two_players');
      setTwoPlayerSubMode('online');

      window.history.replaceState({}, '', `?room=${newRoomId}`);
    } catch (err: any) {
      alert("Không thể tạo phòng đấu: " + (err.message || err));
    } finally {
      setIsConnectingRoom(false);
    }
  };

  // Join existing online room
  const handleJoinOnlineRoom = async (roomIdToJoin: string) => {
    const profileToUse = activeProfile || {
      id: 'guest_' + Date.now(),
      name: 'Kỳ thủ nhí',
      avatar: '🦁'
    };

    setIsConnectingRoom(true);
    try {
      const { room, userRole: role } = await joinOnlineRoom(roomIdToJoin, {
        id: profileToUse.id,
        name: profileToUse.name,
        avatar: profileToUse.avatar
      });

      const normalizedWinner = (room.winner === 'w' || room.winner === 'b' || room.winner === 'draw') ? room.winner : null;

      // Clean up previous local game & modal state
      chessRef.current = new Chess(room.fen || START_FEN);
      setFen(chessRef.current.fen());
      setLastMove(room.lastMove || null);
      setSelectedSquare(null);
      setPossibleMoves([]);
      setKingInCheckSquare(null);
      setIsGameStarted(room.status === 'playing');
      setGameResult(normalizedWinner ? (normalizedWinner === role ? 'win' : (role === 'spectator' ? 'active' : 'loss')) : 'active');
      setGameWinnerColor(normalizedWinner === 'draw' ? null : (normalizedWinner || null));
      setIsCheckmateState(false);
      setIsDrawState(normalizedWinner === 'draw');
      setIsResignedState(false);
      setIsTimeoutState(false);
      setShowResultModal(room.status === 'finished' || normalizedWinner !== null);
      if (room.timeControlMode) {
        setTimeControlMode(room.timeControlMode);
      }
      resetTimers(room.timeControlMode || timeControlMode);

      setOnlineRoomId(roomIdToJoin);
      setOnlineRoom(room);
      setUserRole(role);
      setGameMode('two_players');
      setTwoPlayerSubMode('online');

      if (role === 'w' || role === 'b') {
        setPlayerColor(role);
        const isOnlyPlayer = !(room.player1 && room.player2);
        setupRoomOnDisconnect(roomIdToJoin, isOnlyPlayer);
      }

      window.history.replaceState({}, '', `?room=${roomIdToJoin}`);
    } catch (err: any) {
      alert(err.message || "Không thể kết nối vào phòng đấu này!");
    } finally {
      setIsConnectingRoom(false);
    }
  };

  // Leave online room
  const handleLeaveOnlineRoom = async () => {
    if (onlineRoomId) {
      await leaveOnlineRoomService(onlineRoomId, userRole, onlineRoom);
    }
    setOnlineRoomId(null);
    setOnlineRoom(null);
    setUserRole(null);
    window.history.replaceState({}, '', window.location.pathname);
    chessRef.current = new Chess();
    setFen(chessRef.current.fen());
    setSelectedSquare(null);
    setPossibleMoves([]);
    setLastMove(null);
    setKingInCheckSquare(null);
    setGameResult('active');
  };

  // Send real-time chat message in online room
  const handleSendOnlineChatMessage = async (text: string) => {
    if (!onlineRoomId || !activeProfile) return;
    try {
      await sendOnlineChatMessage(onlineRoomId, {
        senderId: activeProfile.id,
        senderName: activeProfile.name,
        avatar: activeProfile.avatar,
        text,
        roleTag: userRole === 'w' ? 'Trắng' : userRole === 'b' ? 'Đen' : 'Khán giả'
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Initialize a new game
  const handleNewGame = (resetChat = true, newColor?: 'w' | 'b') => {
    if (gameMode === 'two_players' && twoPlayerSubMode === 'online') {
      // If match is actively in progress, clicking "Ván mới" forfeits/resigns current game
      if (isGameStarted && gameResult === 'active' && !chessRef.current.isGameOver() && (userRole === 'w' || userRole === 'b')) {
        handleResign();
        return;
      }

      setShowResultModal(false);
      setIsCheckmateState(false);
      setIsDrawState(false);
      setIsResignedState(false);
      setIsTimeoutState(false);
      setGameWinnerColor(null);
      setGameResult('active');

      if (onlineRoomId) {
        const isTwoPlayersPresent = !!(onlineRoom && onlineRoom.player1 && onlineRoom.player2);
        resetOnlineGame(onlineRoomId, isTwoPlayersPresent);
      }
      return;
    }

    const colorToUse = newColor !== undefined ? newColor : playerColor;
    if (newColor !== undefined) {
      setPlayerColor(newColor);
    }

    chessRef.current = new Chess();
    setFen(chessRef.current.fen());
    setSelectedSquare(null);
    setPossibleMoves([]);
    setLastMove(null);
    setKingInCheckSquare(null);
    setIsGameStarted(false);
    setIsResignedState(false);
    setIsCheckmateState(false);
    setIsDrawState(false);
    setIsTimeoutState(false);
    setGameWinnerColor(null);
    setGameResult('active');
    setShowResultModal(false);
    setIsAiThinking(false);
    lastAnnouncedMatchRef.current = null;
    resetTimers();

    const pName = activeProfile ? activeProfile.name : "Kỳ thủ nhí";
    if (resetChat) {
      let welcomeText = "";
      if (gameMode === 'vs_ai') {
        welcomeText = colorToUse === 'w'
          ? `Chào mừng ${pName} đến với Học viện Cờ vua Nhí! ✨\nCon đang cầm **Quân Trắng ⚪** và được đi trước. Ta là Thỏ Trắng, sư phụ của con đây!\n\nHãy chọn một quân cờ Trắng và di chuyển nhé! Nếu gặp khó khăn, cứ bấm nút **Gợi ý** ở góc phải.`
          : `Chào mừng ${pName} đến với Học viện Cờ vua Nhí! ✨\nCon đang cầm **Quân Đen ⚫**. Đối thủ cầm quân Trắng sẽ đi nước đầu tiên! Hãy chuẩn bị nào!`;
      } else if (gameMode === 'two_players' && twoPlayerSubMode === 'offline') {
        welcomeText = `Chào mừng hai kỳ thủ! 🏆\nSư phụ Thỏ sẽ làm trọng tài và tường thuật các nước đi trong ván đấu này. Chúc hai con thi đấu hết mình và fair-play!`;
      }

      if (welcomeText) {
        setMessages([
          {
            id: 'welcome_' + Date.now(),
            sender: 'ai_coach',
            text: welcomeText,
            timestamp: new Date().toISOString(),
            characterName: "Sư phụ Thỏ",
            avatar: "🐰"
          }
        ]);
      } else {
        setMessages([]);
      }
    } else {
      const colorMsg = colorToUse === 'w' ? 'Cầm Quân Trắng - Đi trước' : 'Cầm Quân Đen - Đi sau';
      setMessages(prev => [
        ...prev,
        {
          id: 'system_new_game_' + Date.now(),
          sender: 'system',
          text: `--- Bắt đầu ván cờ mới (${colorMsg}) ---`,
          timestamp: new Date().toISOString()
        }
      ]);
    }
  };

  const togglePlayerColor = () => {
    if (isGameStarted && gameResult === 'active') {
      alert("Ván cờ đang diễn ra! Con không thể đổi màu quân lúc này.");
      return;
    }
    const nextColor = playerColor === 'w' ? 'b' : 'w';
    handleNewGame(true, nextColor);
  };

  // Re-initialize game when active profile, gameMode or subMode changes
  useEffect(() => {
    if (gameMode === 'vs_ai' || (gameMode === 'two_players' && twoPlayerSubMode === 'offline')) {
      handleNewGame(true);
    }
  }, [activeProfileId, gameMode, twoPlayerSubMode]);

  // Audio simulation trigger
  const playSound = (type: 'move' | 'capture' | 'check' | 'gameover' | 'kick') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

      if (type === 'move') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(350, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } else if (type === 'capture') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(250, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'kick') {
        // Punchy impact layer
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(320, audioCtx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.18);
        gain1.gain.setValueAtTime(0.35, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start();
        osc1.stop(audioCtx.currentTime + 0.18);

        // High clack impact
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(650, audioCtx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.12);
        gain2.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.12);
      } else if (type === 'check') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } else if (type === 'gameover') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      }
    } catch (e) {
      // Audio context might be blocked by browser policy
    }
  };

  const getPieceNameVietnamese = (type: string) => {
    switch (type.toLowerCase()) {
      case 'p': return 'Tốt';
      case 'n': return 'Mã';
      case 'b': return 'Tượng';
      case 'r': return 'Xe';
      case 'q': return 'Hậu';
      case 'k': return 'Vua';
      default: return 'Quân cờ';
    }
  };

  // Check and update checkmate/draw statuses
  const checkGameStatus = () => {
    const chess = chessRef.current;
    
    // Find King position for check indicator
    let checkSquare: string | null = null;
    if (chess.inCheck()) {
      const board = chess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.type === 'k' && piece.color === chess.turn()) {
            checkSquare = piece.square;
            break;
          }
        }
      }
      playSound('check');
    }
    setKingInCheckSquare(checkSquare);

    if (chess.isGameOver()) {
      playSound('gameover');
      let resultText = '';
      let resultType: 'win' | 'loss' | 'draw' = 'draw';
      let winnerColorToAnnounce: 'w' | 'b' | 'draw' = 'draw';

      if (chess.isCheckmate()) {
        const winnerColor = chess.turn() === 'w' ? 'b' : 'w'; // If active turn is White, Black won.
        winnerColorToAnnounce = winnerColor;
        setGameWinnerColor(winnerColor);
        setIsCheckmateState(true);
        setIsDrawState(false);
        if (gameMode === 'two_players') {
          resultText = `CHIẾU HẾT! ${winnerColor === 'w' ? 'Quân Trắng ⚪' : 'Quân Đen ⚫'} giành chiến thắng! 🏆`;
          resultType = 'win';
          setGameResult('win');
        } else if (winnerColor === playerColor) {
          resultText = `🎉 Chúc mừng con đã CHIẾU HẾT và giành CHIẾN THẮNG ngoạn mục! Ván này con chơi tốt đó! 🏆`;
          resultType = 'win';
          setGameResult('win');
          speakWithRole(getGameOverSpeech('player_win'), 'rabbit_master');
        } else {
          resultText = `😭 Ôi không! Đối thủ đã chiếu hết rồi. Thất bại là mẹ thành công, đừng buồn con ạ. Hãy chơi lại ván mới! 💪`;
          resultType = 'loss';
          setGameResult('loss');
          speakWithRole(getGameOverSpeech('ai_win'), 'opponent_ai');
        }
      } else if (chess.isDraw()) {
        winnerColorToAnnounce = 'draw';
        setGameWinnerColor(null);
        setIsCheckmateState(false);
        setIsDrawState(true);
        resultText = `🤝 Ván đấu kết thúc với tỷ số HÒA! Cả hai bên đều thi đấu vô cùng xuất sắc, ngang tài ngang sức!`;
        resultType = 'draw';
        setGameResult('draw');
        if (gameMode !== 'two_players') {
          speakWithRole(getGameOverSpeech('draw'), 'rabbit_master');
        }
      }

      if (gameMode === 'two_players') {
        announceTwoPlayerGameEnd(winnerColorToAnnounce, `offline_checkmate_draw_${chess.history().length}_${chess.fen()}`);
      }

      setShowResultModal(true);

      setMessages(prev => [
        ...prev,
        {
          id: 'game_over_msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          sender: 'system',
          text: `CỜ TÀN! ${resultText}`,
          timestamp: new Date().toISOString()
        }
      ]);

      // Record match to profile statistics
      if (activeProfileId) {
        addMatchRecord(activeProfileId, difficulty, resultType, chess.history().length);
        // Refresh profiles from local storage to update view stats
        setProfiles(getProfiles());
        setGameCompletedTrigger(prev => prev + 1);
      }
      return true;
    }
    return false;
  };

  // Helper to execute player move (handles VS AI, 2-Player Offline, and 2-Player Online)
  const executePlayerMove = (from: Square, to: Square, promotionPiece?: 'q' | 'r' | 'b' | 'n') => {
    const chess = chessRef.current;
    const pieceMoved = chess.get(from);
    
    const movePayload: any = {
      from,
      to,
    };
    if (promotionPiece) {
      movePayload.promotion = promotionPiece;
    }

    try {
      const moveDetails = chess.move(movePayload);
      if (!moveDetails) return;

      recordMoveIncrement(moveDetails.color);
      const captureMade = moveDetails.captured !== undefined;
      const newFen = chess.fen();

      // Update visual board
      const isEnPassant = moveDetails.flags.includes('e');
      setFen(newFen);
      setLastMove({ 
        from, 
        to, 
        captured: captureMade ? { type: moveDetails.captured!, color: (moveDetails.color === 'w' ? 'b' : 'w') } : undefined,
        piece: { type: moveDetails.piece, color: moveDetails.color },
        isEnPassant,
        id: Date.now()
      });
      setSelectedSquare(null);
      setPossibleMoves([]);
      playSound(captureMade ? 'capture' : 'move');

      let winner: 'w' | 'b' | 'draw' | null = null;
      const isOver = checkGameStatus();
      if (chess.isGameOver()) {
        if (chess.isCheckmate()) {
          winner = chess.turn() === 'w' ? 'b' : 'w';
        } else if (chess.isDraw()) {
          winner = 'draw';
        }
      }

      // 1. Online 2-Player Mode: Push move to Firebase RTDB & broadcast referee move update
      if (gameMode === 'two_players' && twoPlayerSubMode === 'online') {
        if (onlineRoomId) {
          const nextTurn = chess.turn();
          makeOnlineMove(onlineRoomId, newFen, { from, to, promotion: promotionPiece }, nextTurn, winner);

          // Referee Sư phụ Thỏ updates move in room chat
          const isCastling = moveDetails.flags.includes('k') || moveDetails.flags.includes('q');
          const isEnPassant = moveDetails.flags.includes('e');
          const isPromotion = moveDetails.flags.includes('p');
          const colorName = moveDetails.color === 'w' ? 'Quân Trắng' : 'Quân Đen';
          const pieceName = getPieceNameVietnamese(moveDetails.piece);

          let narration = '';
          if (isCastling) {
            narration = `${colorName} nhập thành thành công!`;
          } else if (isEnPassant) {
            narration = `${colorName} bắt Tốt qua đường ở ô ${to}!`;
          } else if (isPromotion) {
            const promoPieceName = getPieceNameVietnamese(promotionPiece || 'q');
            narration = `${colorName} phong cấp Tốt thành ${promoPieceName} ở ô ${to}!`;
          } else if (captureMade && moveDetails.captured) {
            const capturedPieceName = getPieceNameVietnamese(moveDetails.captured);
            narration = `${colorName} ăn ${capturedPieceName} ở ô ${to}.`;
          } else {
            narration = `${colorName} di chuyển ${pieceName} ${from} ➔ ${to}.`;
          }

          if (chess.isCheckmate()) {
            narration += ` CHIẾU HẾT! ${colorName} chiến thắng! 🏆`;
          } else if (chess.inCheck()) {
            narration += ` Chiếu Vua! ⚠️`;
          } else if (chess.isDraw()) {
            narration += ` Ván cờ hòa! 🤝`;
          }

          sendOnlineChatMessage(onlineRoomId, {
            senderId: 'referee_rabbit_master',
            senderName: 'Sư phụ Thỏ (Trọng tài)',
            avatar: '🐰',
            text: narration,
            roleTag: 'Trọng tài'
          }).catch((err) => console.warn("Lỗi gửi thông báo nước đi trọng tài:", err));

          speakWithRole(narration, 'rabbit_master');
        }
        return;
      }

      // 2. Offline 2-Player Mode: Turn switches automatically on the same device with move narration
      if (gameMode === 'two_players' && twoPlayerSubMode === 'offline') {
        const isCastling = moveDetails.flags.includes('k') || moveDetails.flags.includes('q');
        const isEnPassant = moveDetails.flags.includes('e');
        const isPromotion = moveDetails.flags.includes('p');
        const colorName = moveDetails.color === 'w' ? 'Quân Trắng' : 'Quân Đen';
        const pieceName = getPieceNameVietnamese(moveDetails.piece);

        let narration = '';

        if (isCastling) {
          narration = `${colorName} vừa nhập thành thành công!`;
        } else if (isEnPassant) {
          narration = `${colorName} vừa bắt Tốt qua đường ở ô ${to}!`;
        } else if (isPromotion) {
          const promoPieceName = getPieceNameVietnamese(promotionPiece || 'q');
          narration = `${colorName} vừa phong cấp Tốt thành ${promoPieceName} ở ô ${to}!`;
        } else if (captureMade && moveDetails.captured) {
          const capturedPieceName = getPieceNameVietnamese(moveDetails.captured);
          narration = `${colorName} vừa ăn ${capturedPieceName} ở ô ${to}.`;
        } else {
          narration = `${colorName} vừa di chuyển ${pieceName} từ ô ${from} đến ô ${to}.`;
        }

        if (chess.isCheckmate()) {
          narration += ` CHIẾU HẾT! ${colorName} chiến thắng! 🏆`;
        } else if (chess.inCheck()) {
          narration += ` Chiếu Vua! ⚠️`;
        } else if (chess.isDraw()) {
          narration += ` Ván cờ hòa! 🤝`;
        }

        setMessages(prev => [
          ...prev,
          {
            id: 'narration_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            sender: 'ai_coach',
            text: narration,
            timestamp: new Date().toISOString(),
            characterName: "Sư phụ Thỏ",
            avatar: "🐰"
          }
        ]);

        speakWithRole(narration, 'rabbit_master');
        return;
      }

      // 3. VS AI Mode: AI Opponent responds
      if (!isOver) {
        setIsAiThinking(true);

        let speechText = "";
        let coachExplanation = "";

        const isCastling = moveDetails.flags.includes('k') || moveDetails.flags.includes('q');
        const isEnPassant = moveDetails.flags.includes('e');
        const isPromotion = moveDetails.flags.includes('p');

        if (isCastling) {
          speechText = "[Sư phụ Thỏ]: Nhập thành thành công rồi con ơi! Đây là một nước đi đặc biệt giúp con bảo vệ Vua an toàn bằng cách đưa Vua vào góc và đưa Xe ra ngoài để phòng thủ đấy!";
          coachExplanation = "Sư phụ Thỏ: Nhập thành (Castling) là nước cờ cực kỳ quan trọng giúp bảo vệ Vua và kích hoạt Xe tham chiến. Con vừa đưa đức Vua vào góc an toàn và chuẩn bị cho một đợt phản công mạnh mẽ! 🏰👑";
        } else if (isEnPassant) {
          speechText = "[Sư phụ Thỏ]: Wow! Một nước bắt tốt qua đường thật ngoạn mục! Khi Tốt đối thủ tiến hai ô vượt qua ô Tốt của con đứng, con có thể đi chéo để bắt nó ngay lập tức!";
          coachExplanation = "Sư phụ Thỏ: Bắt tốt qua đường (En Passant) là một điều luật cờ vua cổ điển và thú vị. Khi Tốt đối phương tiến 2 ô để né tránh Tốt của con, con vẫn có quyền 'bắt' nó ngay lập tức như thể nó chỉ tiến 1 ô! ♟️✨";
        } else if (isPromotion) {
          const pieceName = promotionPiece === 'q' ? 'Hậu' : promotionPiece === 'r' ? 'Xe' : promotionPiece === 'b' ? 'Tượng' : 'Mã';
          speechText = `[Sư phụ Thỏ]: Chúc mừng con! Tốt dũng cảm đã tiến xuống hàng cuối cùng và phong cấp thành quân ${pieceName} vô cùng mạnh mẽ rồi!`;
          coachExplanation = `Sư phụ Thỏ: Tốt phong cấp! Bằng sự dũng cảm và kiên trì, quân Tốt nhỏ bé của con đã đi hết chiều dọc bàn cờ và được thăng chức thành quân ${pieceName}. Đây là khoảnh khắc thay đổi cục diện trận đấu! 👑🌟`;
        } else {
          const pieceType = pieceMoved?.type || 'p';
          const pieceNameVi = getPieceNameVietnamese(pieceType);
          const reactionType = chess.inCheck() ? 'check' : (captureMade ? 'capture' : 'move');
          speechText = getRabbitPlayerSpeech(reactionType, pieceNameVi);
        }

        const speechContent = speechText.replace("[Sư phụ Thỏ]: ", "");
        const coachMessageId = 'coach_move_reaction_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        setMessages(prev => [
          ...prev,
          {
            id: coachMessageId,
            sender: 'ai_coach',
            text: coachExplanation || speechContent,
            timestamp: new Date().toISOString(),
            characterName: "Sư phụ Thỏ",
            avatar: "🐰"
          }
        ]);

        if (autoComment && !isCastling && !isEnPassant && !isPromotion) {
          triggerAiExplanation({
            move: moveDetails.san,
            pieceName: pieceMoved?.type || 'p',
            color: playerColor,
            playerMove: true,
            boardFen: chess.fen(),
            capture: captureMade,
            isCheck: chess.inCheck(),
            isCheckmate: chess.isGameOver() && chess.isCheckmate(),
            gameStage: getGameStage(chess.fen())
          }, coachMessageId);
        }

        speakWithRole(speechText, 'rabbit_master').then(() => {
          setTimeout(() => {
            handleAIMove();
          }, 1500);
        });
      }
    } catch (err) {
      console.error("Lỗi di chuyển:", err);
    }
  };

  // Human player makes a move
  const handleSquareClick = (square: Square) => {
    if (!isGameStarted || gameResult !== 'active' || chessRef.current.isGameOver() || isAiThinking || !activeProfileId) return;

    const chess = chessRef.current;
    const currentTurn = chess.turn();

    // Mode turn validation
    if (gameMode === 'vs_ai') {
      if (currentTurn !== playerColor) return;
    } else if (gameMode === 'two_players' && twoPlayerSubMode === 'online') {
      if (userRole === 'spectator' || currentTurn !== userRole) return;
    }

    const piece = chess.get(square);

    // Color to move check
    const activeColor = (gameMode === 'two_players' && twoPlayerSubMode === 'offline')
      ? currentTurn
      : ((gameMode === 'two_players' && twoPlayerSubMode === 'online') ? userRole : playerColor);

    // 1. Clicked own piece -> show moves
    if (piece && piece.color === activeColor) {
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true });
      setPossibleMoves(moves.map(m => m.to));
      playSound('move');
      return;
    }

    // 2. Clicked legal target square -> perform move
    if (selectedSquare && possibleMoves.includes(square)) {
      const isPromotion = chess.get(selectedSquare)?.type === 'p' && (square[1] === '8' || square[1] === '1');
      
      if (isPromotion) {
        setPendingPromotionMove({ from: selectedSquare, to: square });
        return;
      }

      executePlayerMove(selectedSquare, square);
      return;
    }

    // 3. Clicked elsewhere -> clear selection
    setSelectedSquare(null);
    setPossibleMoves([]);
  };

  const handlePromotionSelect = (promotionPiece: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromotionMove) return;
    const { from, to } = pendingPromotionMove;
    setPendingPromotionMove(null);
    executePlayerMove(from, to, promotionPiece);
  };

  // AI computer move calculation and execution
  const handleAIMove = async () => {
    const chess = chessRef.current;
    if (chess.isGameOver()) {
      setIsAiThinking(false);
      return;
    }

    // Call programmatic Minimax engine based on level
    const bestMove = getAIMove(chess.fen(), difficulty);

    if (bestMove) {
      const tempChess = new Chess(chess.fen());
      const moveDetails = tempChess.move(bestMove);
      const pieceType = moveDetails.piece;
      const captureMade = moveDetails.captured !== undefined;

      // Apply the move on real engine
      chess.move(bestMove);
      recordMoveIncrement(moveDetails.color);
      setFen(chess.fen());
      setLastMove({ 
        from: moveDetails.from, 
        to: moveDetails.to,
        captured: captureMade ? { type: moveDetails.captured!, color: (moveDetails.color === 'w' ? 'b' : 'w') } : undefined,
        piece: { type: moveDetails.piece, color: moveDetails.color },
        isEnPassant: moveDetails.flags.includes('e'),
        id: Date.now()
      });
      playSound(captureMade ? 'capture' : 'move');

      // Check game over
      const isOver = checkGameStatus();

      // Check for opponent's special moves
      const isCastling = moveDetails.flags.includes('k') || moveDetails.flags.includes('q');
      const isEnPassant = moveDetails.flags.includes('e');
      const isPromotion = moveDetails.flags.includes('p');

      // Add AI's generic move text to the chat
      const moveMsgId = 'ai_move_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const pName = getPieceNameVietnamese(pieceType);
      
      // Determine what the opponent will speak (Opponent Voice role)
      const capturedPieceNameVi = moveDetails.captured ? getPieceNameVietnamese(moveDetails.captured) : undefined;
      const opponentReactionType = chess.inCheck() ? 'check' : (captureMade ? 'capture' : 'move');
      let speech = "";

      if (isCastling) {
        speech = `[Đối thủ]: Ta vừa di chuyển đức Vua và Xe để Nhập thành rồi nhé!`;
      } else if (isEnPassant) {
        speech = `[Đối thủ]: Ha ha! Ta vừa thực hiện nước Bắt tốt qua đường để bắt quân Tốt của bé nhé!`;
      } else if (isPromotion) {
        const promoPieceName = getPieceNameVietnamese(moveDetails.promotion || 'q');
        speech = `[Đối thủ]: Quân Tốt của ta đã đi đến hàng cuối và phong cấp thành quân ${promoPieceName} rồi nhé!`;
      } else {
        speech = getOpponentSpeech(opponentReactionType, pName, moveDetails.from, moveDetails.to, capturedPieceNameVi);
      }

      // Speak with Opponent AI voice role
      speakWithRole(speech, 'opponent_ai');

      const aiColor = moveDetails.color;
      const aiMoveData = {
        move: moveDetails.san,
        pieceName: pieceType,
        color: aiColor,
        playerMove: false,
        boardFen: chess.fen(),
        capture: captureMade,
        isCheck: chess.inCheck(),
        isCheckmate: chess.isGameOver() && chess.isCheckmate(),
        gameStage: getGameStage(chess.fen())
      };

      const colorLabel = aiColor === 'w' ? 'Trắng' : 'Đen';
      const charName = pName === 'Tốt' ? `Tốt ${colorLabel} Dũng Cảm` : `${pName} ${colorLabel}`;

      setMessages(prev => [
        ...prev,
        {
          id: moveMsgId,
          sender: 'ai_coach',
          text: speech,
          timestamp: new Date().toISOString(),
          characterName: charName,
          avatar: undefined, // Will be rendered as custom chess SVG
          isExplainable: !isCastling && !isEnPassant && !isPromotion,
          moveData: aiMoveData
        }
      ]);

      // If opponent made a special move, Sư phụ Thỏ steps in to explain it!
      if (isCastling || isEnPassant || isPromotion) {
        let coachText = "";
        let coachSpeech = "";

        if (isCastling) {
          coachText = "Sư phụ Thỏ: Ồ, đối thủ vừa thực hiện nước **Nhập thành** (Castling) kìa con! Họ đã bảo vệ đức Vua Đen vào góc an toàn và đưa Xe ra ngoài để chuẩn bị tấn công rồi. Con hãy tìm cách đột phá trung lộ nhé! 🏰👑";
          coachSpeech = "[Sư phụ Thỏ]: Đối thủ vừa thực hiện nước Nhập thành để bảo vệ Vua Đen kìa con! Hãy cùng tập trung suy nghĩ cách tấn công trung lộ nhé!";
        } else if (isEnPassant) {
          coachText = "Sư phụ Thỏ: Ôi! Đối thủ vừa dùng luật **Bắt tốt qua đường** (En Passant) rất khéo léo để bắt quân Tốt của con đấy. Đây là một điều luật đặc biệt khi Tốt của con đứng ở hàng 5 và Tốt đối phương tiến hai ô vượt qua nó. Đừng nản lòng nhé! ♟️✨";
          coachSpeech = "[Sư phụ Thỏ]: Đối thủ vừa bắt tốt qua đường của con rồi! Đừng lo lắng con nhé, hãy tập trung điều các quân cờ khác tiến lên!";
        } else {
          const promoPieceName = getPieceNameVietnamese(moveDetails.promotion || 'q');
          coachText = `Sư phụ Thỏ: Hãy cẩn thận con nhé! Quân Tốt Đen của đối phương vừa hoàn thành hành trình và **Phong cấp** thành quân ${promoPieceName} vô cùng nguy hiểm rồi đấy. Hãy tăng cường phòng thủ đức Vua nha! 👑🌟`;
          coachSpeech = `[Sư phụ Thỏ]: Cẩn thận nha con ơi! Quân Tốt Đen vừa phong cấp thành quân ${promoPieceName} rồi đấy! Hãy cùng Sư phụ tập trung phòng thủ nhé!`;
        }

        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              id: 'ai_special_explanation_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
              sender: 'ai_coach',
              text: coachText,
              timestamp: new Date().toISOString(),
              characterName: "Sư phụ Thỏ",
              avatar: "🐰"
            }
          ]);
          speakWithRole(coachSpeech, 'rabbit_master');
        }, 2200);
      } else if (autoComment && !isOver) {
        // If autoComment is true, automatically replace or expand with deep coaching explanation
        await triggerAiExplanation(aiMoveData, moveMsgId);
      }
    }

    setIsAiThinking(false);
  };

  // Call Express API to get full AI tactical coaching explanation
  const triggerAiExplanation = async (moveData: any, targetMsgId?: string) => {
    try {
      const response = await fetch("/api/explain-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...moveData,
          playerName: activeProfile?.name,
          playerLevel: difficulty === 'easy' ? 'Dễ' : difficulty === 'medium' ? 'Trung bình' : difficulty === 'hard' ? 'Khó' : 'Chuyên gia'
        })
      });
      const data = await response.json();
      
      if (data.success && data.text) {
        if (targetMsgId) {
          // Replace or update existing chat message with the premium Gemini response
          setMessages(prev => prev.map(m => {
            if (m.id === targetMsgId) {
              return {
                ...m,
                text: data.text,
                characterName: data.characterName,
                isExplainable: false // already explained
              };
            }
            return m;
          }));
        } else {
          // Push a new coaching message
          setMessages(prev => [
            ...prev,
            {
              id: 'explain_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
              sender: 'ai_coach',
              text: data.text,
              timestamp: new Date().toISOString(),
              characterName: data.characterName,
              avatar: undefined,
              isExplainable: false,
              moveData
            }
          ]);
        }
      }
    } catch (e) {
      console.error("Lỗi giải thích nước đi:", e);
    }
  };

  // Triggered when clicking "Giải thích" button inside a chat message manually
  const handleExplainMoveManually = async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (msg && msg.moveData) {
      const pName = activeProfile?.name || 'bé';
      const explanation = explainMoveTactics(chessRef.current.fen(), msg.moveData, pName);

      // 1. Hide the Explain button on the target message
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          return {
            ...m,
            isExplainable: false
          };
        }
        return m;
      }));

      // 2. Append a separate response from the opponent piece itself explaining its move
      setMessages(prev => [
        ...prev,
        {
          id: 'explain_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          sender: 'ai_coach',
          text: explanation.text,
          timestamp: new Date().toISOString(),
          characterName: explanation.characterName,
          moveData: {
            pieceName: explanation.pieceName,
            color: explanation.color
          },
          isExplainable: false
        }
      ]);

      speakWithRole(`[${explanation.characterName}]: Ta vừa di chuyển để chiếm vị trí tốt, bé ${pName} hãy cẩn thận nhé!`, 'opponent_ai');
    }
  };

  // Send a custom chat message written by the child
  const handleSendCustomMessage = async (text: string) => {
    // 1. Append player's question to the chat list
    const playerMsgId = 'player_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const playerEmoji = getAvatars().find(a => a.id === activeProfile?.avatar)?.emoji || activeProfile?.avatar || '🦁';

    setMessages(prev => [
      ...prev,
      {
        id: playerMsgId,
        sender: 'player',
        text: text,
        timestamp: new Date().toISOString(),
        avatar: playerEmoji
      }
    ]);

    if (gameMode === 'two_players') {
      const refereeReply = "Sư phụ Thỏ làm Trọng tài điều hành ván đấu 2 người này! Chúc hai kỳ thủ giữ vững tinh thần thể thao và thi đấu hết mình nhé! 🏆🐰";
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: 'referee_reply_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            sender: 'ai_coach',
            text: refereeReply,
            timestamp: new Date().toISOString(),
            characterName: "Sư phụ Thỏ (Trọng tài)",
            avatar: "🐰"
          }
        ]);
        speakWithRole("Sư phụ Thỏ làm Trọng tài. Chúc hai kỳ thủ thi đấu hết mình!", 'rabbit_master');
      }, 400);
      return;
    }

    setIsAiThinking(true);

    const pName = activeProfile?.name || 'bé';
    const smartAnswer = answerCoachQuestion(text, chessRef.current.fen(), pName);

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: 'coach_reply_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          sender: 'ai_coach',
          text: smartAnswer,
          timestamp: new Date().toISOString(),
          characterName: "Sư phụ Thỏ",
          avatar: "🐰"
        }
      ]);
      setIsAiThinking(false);
      speakWithRole(`[Sư phụ Thỏ]: ${smartAnswer.replace(/[*_#👉🌱⚔️👑💡🐰✨]/g, '').slice(0, 120)}`, 'rabbit_master');
    }, 400);
  };

  // Hint button triggered: provides strategic & tactical guidance for current stage
  const handleGetHint = async () => {
    if (chessRef.current.isGameOver() || isAiThinking) return;

    if (gameMode === 'two_players') {
      const refereeMsg = "Sư phụ Thỏ đang giữ vai trò Trọng tài điều hành ván đấu, vì vậy Sư phụ sẽ không tư vấn nước đi cho bên nào cả. Chúc hai kỳ thủ thi đấu tập trung và fair-play! 🏆🐰";
      setMessages(prev => [
        ...prev,
        {
          id: 'referee_hint_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          sender: 'ai_coach',
          text: refereeMsg,
          timestamp: new Date().toISOString(),
          characterName: "Sư phụ Thỏ (Trọng tài)",
          avatar: "🐰"
        }
      ]);
      speakWithRole("Sư phụ Thỏ giữ vai trò Trọng tài nên không tư vấn nước đi. Chúc hai kỳ thủ thi đấu fair-play!", 'rabbit_master');
      return;
    }

    setIsAiThinking(true);
    const pName = activeProfile?.name || 'bé';
    const hintInfo = getStrategicHint(chessRef.current.fen(), pName, playerColor);

    let hintText = ``;

    if (hintInfo.recommendedMoves.length > 0) {
      const topSan = hintInfo.recommendedMoves[0].san;
      const friendlyMove = formatFriendlyMoveText(chessRef.current, topSan);
      hintText += `Nước đi Sư phụ khuyên con: ${friendlyMove.combinedText}.\n\n💡 **Tác dụng chiến thuật:** ${hintInfo.recommendedMoves[0].explanation}\n\n`;

      if (hintInfo.recommendedMoves.length > 1) {
        const altMoves = hintInfo.recommendedMoves.slice(1).map(m => {
          const fm = formatFriendlyMoveText(chessRef.current, m.san);
          return `${fm.actionText} (\`${m.san}\`)`;
        }).join(', ');
        hintText += `🔍 **Lựa chọn khác:** ${altMoves}\n\n`;
      }
    }

    hintText += `🌱 *Lời khuyên ${hintInfo.stageTitle}: ${hintInfo.masterAdvice}*\n\nCon cũng có thể đặt câu hỏi trực tiếp với ta ở ô chat bên dưới.`;

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: 'hint_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          sender: 'ai_coach',
          text: hintText,
          timestamp: new Date().toISOString(),
          characterName: "Sư phụ Thỏ",
          avatar: "🐰"
        }
      ]);

      // Highlight the recommended square briefly on the board
      if (hintInfo.recommendedMoves.length > 0) {
        const bestMoveStr = hintInfo.recommendedMoves[0].san;
        const match = bestMoveStr.match(/[a-h][1-8]/);
        if (match) {
          const targetSq = match[0] as Square;
          setSelectedSquare(null);
          setPossibleMoves([targetSq]);
        }
      }

      setIsAiThinking(false);
      speakWithRole(`[Sư phụ Thỏ]: Ở giai đoạn ${hintInfo.stage === 'khai_cuoc' ? 'Khai cuộc' : hintInfo.stage === 'trung_cuoc' ? 'Trung cuộc' : 'Tàn cuộc'}, con nên đi nước ${hintInfo.recommendedMoves[0]?.san || ''} nhé!`, 'rabbit_master');
    }, 500);
  };

  // Profile Created Callback
  const handleProfileCreated = (newProfile: PlayerProfile) => {
    setProfiles(getProfiles());
    setActiveIdAndInitialize(newProfile.id);
  };

  // Profile Selection callback
  const setActiveIdAndInitialize = (id: string) => {
    setActiveProfileIdState(id);
    setActiveProfileId(id);
  };

  // Profile Deleted Callback
  const handleProfileDeleted = (id: string) => {
    setProfiles(getProfiles());
    const activeId = getActiveProfileId();
    setActiveProfileIdState(activeId);
  };

  const handleResign = () => {
    if (chessRef.current.isGameOver()) return;
    setShowResignConfirm(true);
  };

  const confirmResign = () => {
    setShowResignConfirm(false);
    playSound('gameover');

    const currentTurn = chessRef.current.turn();
    const resigningColor = (gameMode === 'two_players' && twoPlayerSubMode === 'online')
      ? userRole
      : currentTurn;

    const winnerColor = resigningColor === 'w' ? 'b' : 'w';

    setGameWinnerColor(winnerColor);
    setIsCheckmateState(false);
    setIsDrawState(false);
    setIsTimeoutState(false);
    setIsResignedState(true);

    const isPlayerWin = (gameMode === 'two_players' && twoPlayerSubMode === 'online')
      ? winnerColor === userRole
      : winnerColor === playerColor;

    setGameResult(isPlayerWin ? 'win' : 'loss');

    const resigningText = resigningColor === 'w' ? 'Kỳ thủ Quân Trắng ⚪' : 'Kỳ thủ Quân Đen ⚫';
    const winningText = winnerColor === 'w' ? 'Kỳ thủ Quân Trắng ⚪' : 'Kỳ thủ Quân Đen ⚫';

    let announcementText = '';
    if (gameMode === 'two_players') {
      announcementText = `🚩 XIN THUA: ${resigningText} đã xin thua! ${winningText} giành CHIẾN THẮNG ván đấu này! 🏆`;
    } else {
      announcementText = `🚩 Bé đã nhận thua ván này. Thừa nhận thế cờ yếu và bắt đầu lại là đức tính của một nhà vô địch đấy! 💪✨`;
    }

    if (activeProfileId) {
      addMatchRecord(activeProfileId, difficulty, 'resigned', chessRef.current.history().length);
      setProfiles(getProfiles());
      setGameCompletedTrigger(prev => prev + 1);
    }

    setMessages(prev => [
      ...prev,
      {
        id: 'resign_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        sender: 'system',
        text: announcementText,
        timestamp: new Date().toISOString()
      }
    ]);

    if (gameMode === 'two_players') {
      announceTwoPlayerGameEnd(winnerColor, `resign_${resigningColor}_${Date.now()}`);
      if (twoPlayerSubMode === 'online' && onlineRoomId && (userRole === 'w' || userRole === 'b')) {
        resignOnlineGame(onlineRoomId, userRole);
      }
    }

    setShowResultModal(true);
  };

  return (
    <div className="min-h-screen text-[#4A4540] font-sans pb-12 transition-colors duration-300" style={{ backgroundColor: '#f9e6da' }}>
      {/* Top Header App Brand */}
      <header className="bg-white/50 backdrop-blur-md border-b border-[#E8E2D9] shadow-sm py-4 px-6 mb-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 bg-[#8BA888] text-white flex items-center justify-center text-3xl rounded-2xl shadow-sm rotate-[-3deg] animate-pulse">
              ♟️
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#5C5751]">
                Cờ Vua Cho Bé
              </h1>
              <p className="text-[13px] text-zinc-500 font-bold">Học cờ cùng Sư phụ Thỏ!</p>
            </div>
          </div>

          {/* Header Right: Custom Logo */}
          <div className="flex items-center">
            <img 
              src="https://lh3.googleusercontent.com/d/1yOLi510GeFZT7mihMrnhZRKXtel1C6-z" 
              alt="Cờ Vua Cho Bé Logo" 
              className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </header>

      {/* Main Grid Content Dashboard */}
      <main className="max-w-6xl mx-auto px-4">
        {/* If no profile is selected, force selection first to create premium UX */}
        {!activeProfileId ? (
          <div className="max-w-xl mx-auto py-10">
            <ProfileSelector
              profiles={profiles}
              activeProfileId={activeProfileId}
              onSelectProfile={setActiveIdAndInitialize}
              onProfileCreated={handleProfileCreated}
              onProfileDeleted={handleProfileDeleted}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* COLUMN 1 (LEFT): Player Profile, Game Mode & Difficulty Selectors */}
            <div className={`lg:col-span-3 ${isBoardExpanded ? 'hidden' : 'block'} grid grid-cols-1 max-lg:landscape:grid-cols-2 gap-3 lg:flex lg:flex-col lg:gap-4 h-full`}>
              {/* Profile card minified */}
              <div className="bg-white rounded-[32px] p-5 max-lg:landscape:p-3 max-lg:landscape:rounded-2xl shadow-sm border-2 border-[#8BA888] shrink-0">
                <div className="flex items-center space-x-3 max-lg:landscape:space-x-2 mb-4 max-lg:landscape:mb-2">
                  <div className="w-12 h-12 max-lg:landscape:w-9 max-lg:landscape:h-9 rounded-2xl max-lg:landscape:rounded-xl bg-[#F2EDE7] flex items-center justify-center text-3xl max-lg:landscape:text-xl border border-[#E8E2D9] shadow-inner shrink-0">
                    {profiles.find(p => p.id === activeProfileId)?.avatar === 'lion' ? '🦁' :
                     profiles.find(p => p.id === activeProfileId)?.avatar === 'panda' ? '🐼' :
                     profiles.find(p => p.id === activeProfileId)?.avatar === 'fox' ? '🦊' :
                     profiles.find(p => p.id === activeProfileId)?.avatar === 'koala' ? '🐨' :
                     profiles.find(p => p.id === activeProfileId)?.avatar === 'bunny' ? '🐰' : '🐵'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm max-lg:landscape:text-xs text-[#5C5751] truncate">{activeProfile?.name}</h3>
                    <p className="text-[13px] max-lg:landscape:text-[10px] text-zinc-400 font-bold uppercase tracking-wider truncate">Kỳ thủ tích cực</p>
                  </div>
                </div>

                {/* Score specs */}
                <div className="grid grid-cols-2 gap-2 max-lg:landscape:gap-1 bg-[#F2EDE7]/60 p-3 max-lg:landscape:p-1.5 rounded-2xl max-lg:landscape:rounded-xl border border-[#E8E2D9] text-center">
                  <div>
                    <span className="text-[13px] max-lg:landscape:text-[10px] text-zinc-500 font-bold block">Elo của bé</span>
                    <strong className="text-sm max-lg:landscape:text-xs font-black text-[#8BA888]">{activeProfile?.elo}</strong>
                  </div>
                  <div>
                    <span className="text-[13px] max-lg:landscape:text-[10px] text-zinc-500 font-bold block">Đã đấu</span>
                    <strong className="text-sm max-lg:landscape:text-xs font-black text-[#5C5751]">{activeProfile?.gamesPlayed} ván</strong>
                  </div>
                </div>

                {/* Switch profile button */}
                <button
                  onClick={() => setActiveIdAndInitialize("")}
                  className="w-full mt-3 max-lg:landscape:mt-1.5 py-2 max-lg:landscape:py-1 text-center bg-white hover:bg-[#F2EDE7] text-[13px] max-lg:landscape:text-[11px] font-bold text-[#8BA888] border border-dashed border-[#8BA888]/40 rounded-xl transition-all cursor-pointer"
                >
                  Đổi tài khoản
                </button>
              </div>

              {/* Chế độ chơi (Game Mode Selector) */}
              <GameModeSelector
                gameMode={gameMode}
                subMode={twoPlayerSubMode}
                onSelectMode={(mode, sub) => {
                  setGameMode(mode);
                  if (sub) setTwoPlayerSubMode(sub);
                  if (mode === 'vs_ai') {
                    handleLeaveOnlineRoom();
                  }
                }}
                onlineRoom={onlineRoom}
                userRole={userRole}
                onCreateOnlineRoom={handleCreateOnlineRoom}
                onJoinOnlineRoom={handleJoinOnlineRoom}
                onLeaveOnlineRoom={handleLeaveOnlineRoom}
                isConnectingRoom={isConnectingRoom}
              />

              {/* Difficulty selectors (Only shown in VS AI mode) */}
              {gameMode === 'vs_ai' && (
                <div className="bg-white rounded-[32px] p-5 max-lg:landscape:p-3 max-lg:landscape:rounded-2xl shadow-sm border-2 border-[#8BA888]">
                  <h3 className="text-[13px] max-lg:landscape:text-[11px] font-black text-[#5C5751] uppercase tracking-widest mb-3 max-lg:landscape:mb-1.5 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 max-lg:landscape:w-3.5 max-lg:landscape:h-3.5 text-[#8BA888]" />
                    Chọn cấp độ đấu
                  </h3>
                  
                  <div className="space-y-1.5 max-lg:landscape:space-y-1">
                    {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map((level) => {
                      const isSelected = difficulty === level;
                      const levelNames = { easy: 'Dễ (Pawn ♟️)', medium: 'Trung bình (Knight ♞)', hard: 'Khó (Rook ♜)', expert: 'Chuyên gia (Queen ♛)' };
                      const levelColors = {
                        easy: 'bg-[#F2EDE7]/50 text-[#5C5751] border-[#E8E2D9] hover:bg-[#F2EDE7]',
                        medium: 'bg-[#F2EDE7]/50 text-[#5C5751] border-[#E8E2D9] hover:bg-[#F2EDE7]',
                        hard: 'bg-[#F2EDE7]/50 text-[#5C5751] border-[#E8E2D9] hover:bg-[#F2EDE7]',
                        expert: 'bg-[#F2EDE7]/50 text-[#5C5751] border-[#E8E2D9] hover:bg-[#F2EDE7]'
                      };
                      const selectedColors = {
                        easy: 'bg-[#8BA888] text-white border-[#8BA888] shadow-sm',
                        medium: 'bg-[#8BA888] text-white border-[#8BA888] shadow-sm',
                        hard: 'bg-[#5C5751] text-white border-[#5C5751] shadow-sm',
                        expert: 'bg-[#5C5751] text-white border-[#5C5751] shadow-sm'
                      };

                      return (
                        <button
                          key={level}
                          onClick={() => setDifficulty(level)}
                          className={`w-full text-left py-2.5 max-lg:landscape:py-1.5 px-3.5 max-lg:landscape:px-2.5 rounded-xl border text-[13px] max-lg:landscape:text-[11px] font-extrabold transition-all cursor-pointer ${
                            isSelected ? selectedColors[level] : levelColors[level]
                          }`}
                        >
                          {levelNames[level]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* COLUMNS 2 & 3 COMBINED CONTAINER (MIDDLE CHESSBOARD + RIGHT CHAT + RECOMMENDER) */}
            <div className={`space-y-6 ${isBoardExpanded ? 'lg:col-span-12' : 'lg:col-span-9'}`}>
              
              <div className="grid grid-cols-1 lg:grid-cols-9 gap-6 items-stretch h-full">
                {/* COLUMN 2 (CENTER): Interactive Cartoon Chessboard & Controls */}
                <div className={`flex flex-col items-center space-y-4 ${isBoardExpanded ? 'lg:col-span-9' : 'lg:col-span-5'}`}>
                  
                  {/* Game level stats indicator */}
                  {gameMode === 'two_players' && twoPlayerSubMode === 'online' && userRole === 'spectator' ? (
                    <div className="w-full flex flex-col space-y-1.5 px-3 sm:px-4 py-2 bg-white rounded-2xl border border-[#E8E2D9] shadow-sm">
                      <div className="flex items-center justify-between text-[12px] sm:text-[13px] font-bold text-zinc-600">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping shrink-0" />
                          <span className="text-amber-800 font-extrabold">Chế độ Quan sát 👁️</span>
                        </div>
                        {gameResult !== 'active' ? (
                          <button
                            onClick={() => setShowResultModal(true)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] uppercase transition-all cursor-pointer active:scale-95 shadow-xs shrink-0"
                            title="Xem lại bảng kết quả"
                          >
                            🏆 Xem kết quả
                          </button>
                        ) : (
                          <span className="text-[11px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">
                            {chessRef.current.turn() === 'w' ? '⏳ Lượt Quân Trắng' : '⏳ Lượt Quân Đen'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[12px] font-bold text-zinc-700 bg-[#F8F6F2] px-3 py-1.5 rounded-xl border border-[#E8E2D9] gap-2">
                        <div className={`flex items-center space-x-1 min-w-0 transition-all ${chessRef.current.turn() === 'w' ? 'font-black text-[#014b3f]' : ''}`}>
                          <span className="shrink-0">⚪</span>
                          <span className="text-zinc-500 shrink-0">Trắng:</span>
                          <span className="font-extrabold text-[#014b3f] truncate">{onlineRoom?.player1?.name || 'Đang chờ...'}</span>
                        </div>
                        <span className="text-amber-600 font-black text-[11px] shrink-0 bg-amber-100 px-2 py-0.5 rounded-lg">
                          {chessRef.current.turn() === 'w' ? '⚪ Lượt Trắng' : '⚫ Lượt Đen'}
                        </span>
                        <div className={`flex items-center space-x-1 min-w-0 transition-all ${chessRef.current.turn() === 'b' ? 'font-black text-zinc-900' : ''}`}>
                          <span className="shrink-0">⚫</span>
                          <span className="text-zinc-500 shrink-0">Đen:</span>
                          <span className="font-extrabold text-zinc-900 truncate">{onlineRoom?.player2?.name || 'Đang chờ...'}</span>
                        </div>
                      </div>

                      {/* Spectator Clock Row */}
                      <div className="flex items-center justify-between text-[12px] font-bold text-[#5C5751] bg-[#F8F6F2] px-3 py-1.5 rounded-xl border border-[#E8E2D9] gap-2">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Clock className="w-3.5 h-3.5 text-[#8BA888]" />
                          <span className="font-extrabold text-[#5C5751] text-[11px] sm:text-[12px]">Thời gian thi đấu:</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${
                            chessRef.current.turn() === 'w' && gameResult === 'active'
                              ? 'bg-[#014b3f] text-white border-[#014b3f] font-black'
                              : 'bg-white text-zinc-700 border-[#E8E2D9]'
                          }`}>
                            <span className="text-[11px] font-sans">⚪</span>
                            <span className="font-black text-[12px]">{formatChessTime(whiteTime)}</span>
                          </div>
                          <span className="text-zinc-400 font-bold font-sans">:</span>
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${
                            chessRef.current.turn() === 'b' && gameResult === 'active'
                              ? 'bg-zinc-900 text-white border-zinc-900 font-black'
                              : 'bg-white text-zinc-700 border-[#E8E2D9]'
                          }`}>
                            <span className="text-[11px] font-sans">⚫</span>
                            <span className="font-black text-[12px]">{formatChessTime(blackTime)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col gap-2">
                      {/* Row 1: Player Information & Integrated Turn Badges */}
                      <div className="w-full flex items-center justify-between px-3 sm:px-4 py-2 bg-white rounded-2xl border border-[#E8E2D9] shadow-sm whitespace-nowrap overflow-x-auto gap-2">
                        {/* Player 1 (Left) */}
                        <div className="flex items-center space-x-1.5 text-[12px] sm:text-[13px] font-bold text-zinc-600 shrink-0">
                          <span>
                            {gameMode === 'two_players' && twoPlayerSubMode === 'online'
                              ? 'Bạn:'
                              : (gameMode === 'two_players' ? 'Kỳ thủ 1:' : 'Bé:')}
                          </span>
                          {gameMode === 'two_players' && twoPlayerSubMode === 'online' ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-black uppercase text-[11px] sm:text-[12px] shadow-xs shrink-0 ${
                                isGameStarted && gameResult === 'active' && chessRef.current.turn() === userRole
                                  ? (userRole === 'w' ? 'bg-[#014b3f] text-[#fafffb] ring-2 ring-emerald-400 animate-pulse' : 'bg-zinc-900 text-white ring-2 ring-amber-400 animate-pulse')
                                  : (userRole === 'b' ? 'bg-[#fafcfa] border border-[#E8E2D9] text-zinc-700' : 'bg-[#014b3f] text-[#fafffb]')
                              }`}
                            >
                              {isGameStarted && gameResult === 'active' && chessRef.current.turn() === userRole && (
                                <span className="animate-spin text-amber-300 text-[12px]">⏳</span>
                              )}
                              <span>{userRole === 'b' ? 'Quân Đen ⚫' : 'Quân Trắng ⚪'}</span>
                            </span>
                          ) : (
                            <button
                              onClick={togglePlayerColor}
                              disabled={isGameStarted && gameResult === 'active'}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-black uppercase text-[11px] sm:text-[12px] transition-all shadow-xs shrink-0 ${
                                isGameStarted && gameResult === 'active' ? 'cursor-default' : 'cursor-pointer active:scale-95'
                              } ${
                                isGameStarted && gameResult === 'active' && chessRef.current.turn() === playerColor
                                  ? (playerColor === 'w' ? 'bg-[#014b3f] text-[#fafffb] ring-2 ring-emerald-400 animate-pulse' : 'bg-zinc-900 text-white ring-2 ring-amber-400 animate-pulse')
                                  : (playerColor === 'w' ? 'bg-[#014b3f] text-[#fafffb]' : 'bg-[#fafcfa] border border-[#E8E2D9] text-zinc-700')
                              }`}
                              title={isGameStarted ? "Ván cờ đang diễn ra" : "Bấm vào để hoán đổi màu quân"}
                            >
                              {isGameStarted && gameResult === 'active' && chessRef.current.turn() === playerColor && (
                                <span className="animate-spin text-amber-300 text-[12px]">⏳</span>
                              )}
                              <span>{playerColor === 'w' ? 'Quân Trắng ⚪' : 'Quân Đen ⚫'}</span>
                            </button>
                          )}
                        </div>

                        {/* Player 2 / Opponent (Right) */}
                        <div className="flex items-center space-x-1.5 text-[12px] sm:text-[13px] font-bold text-zinc-600 shrink-0">
                          <span>
                            {gameMode === 'two_players'
                              ? (twoPlayerSubMode === 'offline' 
                                  ? 'Kỳ thủ 2:' 
                                  : 'Đối thủ:')
                              : 'Đối thủ AI:'}
                          </span>
                          {gameMode === 'two_players' && twoPlayerSubMode === 'online' ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-black uppercase text-[11px] sm:text-[12px] shadow-xs shrink-0 ${
                                isGameStarted && gameResult === 'active' && chessRef.current.turn() !== userRole
                                  ? (userRole === 'w' ? 'bg-zinc-900 text-white ring-2 ring-amber-400 animate-pulse' : 'bg-[#014b3f] text-[#fafffb] ring-2 ring-emerald-400 animate-pulse')
                                  : (userRole === 'b' ? 'bg-[#014b3f] text-[#fafffb]' : 'bg-[#fafcfa] border border-[#E8E2D9] text-zinc-700')
                              }`}
                            >
                              {isGameStarted && gameResult === 'active' && chessRef.current.turn() !== userRole && (
                                <span className="animate-spin text-amber-300 text-[12px]">⏳</span>
                              )}
                              <span>{userRole === 'b' ? 'Quân Trắng ⚪' : 'Quân Đen ⚫'}</span>
                            </span>
                          ) : (
                            <button
                              onClick={togglePlayerColor}
                              disabled={isGameStarted && gameResult === 'active'}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-black uppercase text-[11px] sm:text-[12px] transition-all shadow-xs shrink-0 ${
                                isGameStarted && gameResult === 'active' ? 'cursor-default' : 'cursor-pointer active:scale-95'
                              } ${
                                isGameStarted && gameResult === 'active' && chessRef.current.turn() !== playerColor
                                  ? (playerColor === 'w' ? 'bg-zinc-900 text-white ring-2 ring-amber-400 animate-pulse' : 'bg-[#014b3f] text-[#fafffb] ring-2 ring-emerald-400 animate-pulse')
                                  : (playerColor === 'w' ? 'bg-[#fafcfa] border border-[#E8E2D9] text-zinc-700' : 'bg-[#014b3f] text-[#fafffb]')
                              }`}
                              title={isGameStarted ? "Ván cờ đang diễn ra" : "Bấm vào để hoán đổi màu quân"}
                            >
                              {isAiThinking ? (
                                <span className="text-amber-300 font-black animate-pulse flex items-center gap-1">
                                  🤖 AI ĐANG NGHĨ...
                                </span>
                              ) : (
                                <>
                                  {isGameStarted && gameResult === 'active' && chessRef.current.turn() !== playerColor && (
                                    <span className="animate-spin text-amber-300 text-[12px]">⏳</span>
                                  )}
                                  <span>{playerColor === 'w' ? 'Quân Đen ⚫' : 'Quân Trắng ⚪'}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Clock Timer Row */}
                      <div className="w-full flex items-center justify-between px-3 sm:px-4 py-1.5 bg-[#F8F6F2] rounded-2xl border border-[#E8E2D9] shadow-2xs gap-2 text-[12px] font-bold text-[#5C5751]">
                        {/* White player countdown */}
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all font-mono ${
                          chessRef.current.turn() === 'w' && isGameStarted && gameResult === 'active'
                            ? 'bg-[#014b3f] text-white border-[#014b3f] font-black shadow-xs ring-2 ring-[#014b3f]/20'
                            : 'bg-white text-zinc-700 border-[#E8E2D9]'
                        }`}>
                          <span className="text-[11px] font-sans">⚪ Trắng:</span>
                          <span className="font-black text-[13px]">{formatChessTime(whiteTime)}</span>
                        </div>

                        {/* Center Result Button if game over */}
                        {gameResult !== 'active' && (
                          <button
                            onClick={() => setShowResultModal(true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] sm:text-[12px] uppercase transition-all cursor-pointer active:scale-95 shadow-xs shrink-0"
                            title="Xem lại bảng kết quả"
                          >
                            🏆 Xem kết quả
                          </button>
                        )}

                        {/* Black player countdown */}
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all font-mono ${
                          chessRef.current.turn() === 'b' && isGameStarted && gameResult === 'active'
                            ? 'bg-zinc-900 text-white border-zinc-900 font-black shadow-xs ring-2 ring-zinc-900/20'
                            : 'bg-white text-zinc-700 border-[#E8E2D9]'
                        }`}>
                          <span className="text-[11px] font-sans">⚫ Đen:</span>
                          <span className="font-black text-[13px]">{formatChessTime(blackTime)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Board view render */}
                  <div className="relative overflow-hidden rounded-2xl">
                    <ChessboardView
                      fen={fen}
                      selectedSquare={selectedSquare}
                      possibleMoves={possibleMoves}
                      lastMove={lastMove}
                      isInteractive={
                        isGameStarted &&
                        gameResult === 'active' &&
                        (gameMode === 'vs_ai'
                          ? (!isAiThinking && chessRef.current.turn() === playerColor)
                          : (gameMode === 'two_players' && twoPlayerSubMode === 'offline'
                              ? true
                              : (userRole !== 'spectator' && chessRef.current.turn() === userRole)))
                      }
                      onSquareClick={handleSquareClick}
                      kingInCheckSquare={kingInCheckSquare}
                      isExpanded={isBoardExpanded}
                      orientation={(gameMode === 'two_players' && twoPlayerSubMode === 'online' && userRole === 'b') ? 'black' : (playerColor === 'w' ? 'white' : 'black')}
                      playSound={playSound}
                    />

                    {/* Start Game Overlay Button in Center of Board */}
                    {!isGameStarted && gameResult === 'active' && (
                      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/35 backdrop-blur-[2px] rounded-2xl p-4">
                        <motion.button
                          initial={{ scale: 0.85, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          whileHover={{ scale: 1.06 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => {
                            if (gameMode === 'two_players' && twoPlayerSubMode === 'online' && onlineRoomId) {
                              if (userRole === 'spectator') {
                                alert("Bạn đang ở Chế độ Quan sát. Vui lòng chờ 2 kỳ thủ bắt đầu ván đấu!");
                                return;
                              }
                              startOnlineGame(onlineRoomId);
                            } else {
                              setIsGameStarted(true);
                              playSound('move');
                              if (gameMode === 'vs_ai' && playerColor === 'b' && chessRef.current.turn() === 'w') {
                                setIsAiThinking(true);
                                setTimeout(() => {
                                  handleAIMove();
                                }, 500);
                              }
                            }
                          }}
                          className="px-6 py-3.5 sm:px-8 sm:py-4 rounded-3xl bg-[#014b3f] hover:bg-[#026857] text-[#fafffb] text-base sm:text-xl font-black shadow-2xl border-4 border-amber-300 flex items-center gap-3 cursor-pointer group transition-all"
                        >
                          <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-amber-300 text-amber-300 group-hover:scale-110 transition-transform" />
                          <span>
                            {gameMode === 'two_players' && twoPlayerSubMode === 'online' && userRole === 'spectator'
                              ? 'ĐANG CHỜ BẮT ĐẦU VÁN ĐẤU'
                              : 'BẮT ĐẦU VÁN ĐẤU'}
                          </span>
                        </motion.button>
                        <p className="mt-3 px-3.5 py-1.5 bg-white/95 backdrop-blur-md text-[#5C5751] text-xs sm:text-sm font-extrabold rounded-full border border-[#E8E2D9] shadow-md text-center">
                          💡 Bé có thể vào "Tùy chỉnh" để đổi chế độ thời gian trước khi bấm bắt đầu!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Play Actions Controls Bar (5 Buttons arranged logically) */}
                  <div className="w-full grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                    {/* 1. Ván mới */}
                    <button
                      onClick={() => handleNewGame(true)}
                      className="flex items-center justify-center space-x-1 py-2.5 px-2 bg-white hover:bg-[#F2EDE7]/60 active:scale-95 text-[#5C5751] font-extrabold text-[12px] rounded-2xl border-2 border-[#369662] transition-all cursor-pointer shadow-sm"
                      title="Bắt đầu ván cờ mới"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#8BA888] shrink-0" />
                      <span>Ván mới</span>
                    </button>

                    {/* 2. Phóng to / Thu nhỏ */}
                    <button
                      onClick={() => setIsBoardExpanded(!isBoardExpanded)}
                      className="flex items-center justify-center space-x-1 py-2.5 px-2 bg-white hover:bg-[#F2EDE7]/60 active:scale-95 text-[#5C5751] font-extrabold text-[12px] rounded-2xl border-2 border-[#369662] transition-all cursor-pointer shadow-sm"
                      title={isBoardExpanded ? "Thu nhỏ bàn cờ" : "Phóng to bàn cờ"}
                    >
                      {isBoardExpanded ? (
                        <>
                          <Minimize2 className="w-3.5 h-3.5 text-[#8BA888] shrink-0" />
                          <span>Thu nhỏ</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3.5 h-3.5 text-[#8BA888] shrink-0" />
                          <span>Phóng to</span>
                        </>
                      )}
                    </button>

                    {/* 3. Hướng dẫn (Cách chơi & Luật chơi) */}
                    <button
                      onClick={() => setShowGuideModal(true)}
                      className="flex items-center justify-center space-x-1 py-2.5 px-2 bg-white hover:bg-[#F2EDE7]/60 active:scale-95 text-[#5C5751] font-extrabold text-[12px] rounded-2xl border-2 border-[#369662] transition-all cursor-pointer shadow-sm"
                      title="Xem hướng dẫn ứng dụng và luật cờ vua"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#8BA888] shrink-0" />
                      <span>Hướng dẫn</span>
                    </button>

                    {/* 4. Tùy chỉnh (Âm thanh, Giọng nói, Thời gian) */}
                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="flex items-center justify-center space-x-1 py-2.5 px-2 bg-white hover:bg-[#F2EDE7]/60 active:scale-95 text-[#5C5751] font-extrabold text-[12px] rounded-2xl border-2 border-[#369662] transition-all cursor-pointer shadow-sm"
                      title="Mở bảng cài đặt tùy chỉnh"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#8BA888] shrink-0" />
                      <span>Tùy chỉnh</span>
                    </button>

                    {/* 5. Xin thua */}
                    <button
                      onClick={handleResign}
                      disabled={gameResult !== 'active'}
                      className={`flex items-center justify-center space-x-1 py-2.5 px-2 font-extrabold text-[12px] rounded-2xl border-2 transition-all shadow-sm col-span-2 sm:col-span-1 ${
                        gameResult === 'active'
                          ? 'bg-white hover:bg-[#F2EDE7]/60 border-[#369662] text-[#5C5751] cursor-pointer active:scale-95'
                          : 'bg-zinc-100 border-zinc-300 text-zinc-400 cursor-not-allowed'
                      }`}
                      title="Nhận thua ván hiện tại"
                    >
                      <Flag className={`w-3.5 h-3.5 shrink-0 ${gameResult === 'active' ? 'text-[#8BA888]' : 'text-zinc-400'}`} />
                      <span>Xin thua</span>
                    </button>
                  </div>
                </div>

                {/* COLUMN 3 (RIGHT): Friendly Chess Coach AI Chat Box OR Online Player Chat */}
                <div className={`lg:col-span-4 ${isBoardExpanded ? 'hidden' : 'block'} flex flex-col h-full`}>
                  {gameMode === 'two_players' && twoPlayerSubMode === 'online' ? (
                    <OnlineChat
                      room={onlineRoom}
                      currentUserId={activeProfile?.id || ''}
                      userRole={userRole}
                      onSendMessage={handleSendOnlineChatMessage}
                      onLeaveRoom={handleLeaveOnlineRoom}
                      playerName={activeProfile?.name || 'Kỳ thủ nhí'}
                      playerAvatar={activeProfile?.avatar || '🦁'}
                      hideRabbitNarration={hideRabbitNarration}
                    />
                  ) : (
                    <CoachChat
                      messages={messages}
                      onSendMessage={handleSendCustomMessage}
                      onExplainMove={handleExplainMoveManually}
                      onGetHint={handleGetHint}
                      isAiThinking={isAiThinking}
                      canGetHint={!isAiThinking && gameResult === 'active' && gameMode === 'vs_ai'}
                      playerName={activeProfile?.name || "Bé"}
                      isNarrationOnly={gameMode === 'two_players' && twoPlayerSubMode === 'offline'}
                    />
                  )}
                </div>
              </div>

            </div>

            {/* DifficultyRecommender (Spans across all 3 columns on desktop) */}
            {gameMode === 'vs_ai' && !isBoardExpanded && (
              <div className="lg:col-span-12">
                <DifficultyRecommender
                  profileId={activeProfileId}
                  currentDifficulty={difficulty}
                  onSetDifficulty={setDifficulty}
                  gameCompletedTrigger={gameCompletedTrigger}
                />
              </div>
            )}

          </div>
        )}
      </main>

      <AnimatePresence>
        {showResignConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#5C5751]/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-[#FFFDFB] rounded-[32px] border border-[#E8E2D9] p-6 max-w-sm w-full shadow-xl relative overflow-hidden text-center"
            >
              {/* Playful icon header */}
              <div className="mx-auto w-16 h-16 bg-[#F2EDE7] text-white flex items-center justify-center text-3xl rounded-3xl mb-4 border border-[#E8E2D9] shadow-inner rotate-[-3deg]">
                🐰
              </div>

              <h3 className="text-lg font-black text-[#5C5751] mb-2">
                Con muốn nhận thua sao?
              </h3>
              <p className="text-[13px] text-zinc-500 font-bold mb-6 leading-relaxed">
                Nhận thua ván này để cùng Sư phụ Thỏ làm lại ván mới nhé? Kiên trì rèn luyện chính là bí quyết của mọi nhà vô địch đấy! 💪✨
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowResignConfirm(false)}
                  className="flex-1 py-3 px-4 font-black text-[13px] rounded-2xl border border-[#E8E2D9] bg-white hover:bg-[#F2EDE7]/60 text-[#5C5751] transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  Nghĩ lại đã
                </button>
                <button
                  onClick={confirmResign}
                  className="flex-1 py-3 px-4 font-black text-[13px] rounded-2xl bg-[#FFADAD]/30 hover:bg-[#FFADAD]/50 border border-[#FFADAD]/60 text-red-700 transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  Đồng ý thua
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingPromotionMove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#5C5751]/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-[#FFFDFB] rounded-[32px] border border-[#E8E2D9] p-6 max-w-sm w-full shadow-xl relative overflow-hidden text-center"
            >
              {/* Playful icon header */}
              <div className="mx-auto w-16 h-16 bg-[#8BA888] text-white flex items-center justify-center text-3xl rounded-3xl mb-4 border border-[#E8E2D9] shadow-inner rotate-[-3deg]">
                ✨
              </div>

              <h3 className="text-lg font-black text-[#5C5751] mb-2">
                Chúc mừng con! Phong cấp cho Tốt!
              </h3>
              <p className="text-[13px] text-zinc-500 font-bold mb-6 leading-relaxed">
                Tốt dũng cảm đã đi đến hàng cuối cùng rồi! Con muốn phong cấp cho Tốt thành quân cờ siêu cấp nào đây? 👑
              </p>

              <div className="grid grid-cols-2 gap-3 justify-center">
                <button
                  onClick={() => handlePromotionSelect('q')}
                  className="py-3 px-4 flex flex-col items-center justify-center font-black rounded-2xl border-2 border-[#D6CDC2] bg-white hover:bg-[#F2EDE7] text-[#5C5751] transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <div className="w-12 h-12 mb-1">
                    <ChessPiece type="q" color="w" />
                  </div>
                  <span className="text-[13px]">Quân Hậu (Q)</span>
                </button>
                <button
                  onClick={() => handlePromotionSelect('r')}
                  className="py-3 px-4 flex flex-col items-center justify-center font-black rounded-2xl border-2 border-[#D6CDC2] bg-white hover:bg-[#F2EDE7] text-[#5C5751] transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <div className="w-12 h-12 mb-1">
                    <ChessPiece type="r" color="w" />
                  </div>
                  <span className="text-[13px]">Quân Xe (R)</span>
                </button>
                <button
                  onClick={() => handlePromotionSelect('b')}
                  className="py-3 px-4 flex flex-col items-center justify-center font-black rounded-2xl border-2 border-[#D6CDC2] bg-white hover:bg-[#F2EDE7] text-[#5C5751] transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <div className="w-12 h-12 mb-1">
                    <ChessPiece type="b" color="w" />
                  </div>
                  <span className="text-[13px]">Quân Tượng (B)</span>
                </button>
                <button
                  onClick={() => handlePromotionSelect('n')}
                  className="py-3 px-4 flex flex-col items-center justify-center font-black rounded-2xl border-2 border-[#D6CDC2] bg-white hover:bg-[#F2EDE7] text-[#5C5751] transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <div className="w-12 h-12 mb-1">
                    <ChessPiece type="n" color="w" />
                  </div>
                  <span className="text-[13px]">Quân Mã (N)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        soundEnabled={soundEnabled}
        onToggleSound={setSoundEnabled}
        speechEnabled={speechEnabled}
        onToggleSpeech={handleToggleSpeech}
        autoComment={autoComment}
        onToggleAutoComment={setAutoComment}
        hideRabbitNarration={hideRabbitNarration}
        onToggleHideRabbitNarration={handleToggleHideRabbitNarration}
        timeControlMode={timeControlMode}
        onSelectTimeControlMode={handleSelectTimeControlMode}
        isGameStarted={isGameStarted && gameResult === 'active'}
      />

      {/* Guide Modal */}
      <GuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />

      {/* Game Result Pop-up Modal */}
      <GameResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        onNewGame={() => handleNewGame(true)}
        winnerColor={gameWinnerColor}
        isCheckmate={isCheckmateState}
        isDraw={isDrawState}
        playerColor={playerColor}
        playerName={activeProfile ? activeProfile.name : "Kỳ thủ nhí"}
        isTimeout={isTimeoutState}
        isResigned={isResignedState}
        gameMode={gameMode}
      />
    </div>
  );
}
