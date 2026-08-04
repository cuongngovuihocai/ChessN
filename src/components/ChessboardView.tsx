import React, { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { motion, AnimatePresence } from 'motion/react';
import { ChessPiece } from './ChessPiece';

export interface LastMoveInfo {
  from: string;
  to: string;
  captured?: { type: string; color: 'w' | 'b' };
  piece?: { type: string; color: 'w' | 'b' };
  isEnPassant?: boolean;
  id?: number;
}

interface ActiveKick {
  id: number;
  from: Square;
  to: Square;
  victimSquare: Square;
  attacker: { type: string; color: 'w' | 'b' };
  victim: { type: string; color: 'w' | 'b' };
  fromPos: { left: number; top: number };
  toPos: { left: number; top: number };
  approachPos: { left: number; top: number };
  backPos: { left: number; top: number };
  victimPos: { left: number; top: number };
  flyX: number;
  flyY: number;
  isSquash: boolean;
  impactEmoji: string;
  spins: number;
  tiltDir: number;
}

interface ChessboardViewProps {
  fen: string;
  selectedSquare: Square | null;
  possibleMoves: string[];
  lastMove: LastMoveInfo | null;
  isInteractive: boolean;
  onSquareClick: (square: Square) => void;
  kingInCheckSquare: string | null; // e.g. "e1" if king is in check
  isExpanded?: boolean;
  orientation?: 'white' | 'black';
  playSound?: (type: 'move' | 'capture' | 'check' | 'gameover' | 'kick') => void;
}

export const ChessboardView: React.FC<ChessboardViewProps> = ({
  fen,
  selectedSquare,
  possibleMoves,
  lastMove,
  isInteractive,
  onSquareClick,
  kingInCheckSquare,
  isExpanded = false,
  orientation = 'white',
  playSound,
}) => {
  const chess = new Chess(fen);

  const files = orientation === 'white'
    ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];

  const ranks = orientation === 'white'
    ? ['8', '7', '6', '5', '4', '3', '2', '1']
    : ['1', '2', '3', '4', '5', '6', '7', '8'];

  // Right-click annotation states
  const [highlightedSquares, setHighlightedSquares] = useState<Square[]>([]);
  const [arrows, setArrows] = useState<Array<{ from: Square; to: Square }>>([]);
  const [rightClickStart, setRightClickStart] = useState<Square | null>(null);
  const [rightClickHover, setRightClickHover] = useState<Square | null>(null);

  // Active Kick Capture Animation State ("đá cờ")
  const [activeKick, setActiveKick] = useState<ActiveKick | null>(null);

  const getSquarePercent = (sq: Square) => {
    const file = sq[0];
    const rank = sq[1];
    const colIndex = files.indexOf(file);
    const rowIndex = ranks.indexOf(rank);
    return {
      left: (colIndex >= 0 ? colIndex : 0) * 12.5,
      top: (rowIndex >= 0 ? rowIndex : 0) * 12.5,
    };
  };

  // Trigger Kick Animation when lastMove indicates a capture
  useEffect(() => {
    if (!lastMove || !lastMove.from || !lastMove.to) {
      setActiveKick(null);
      return;
    }

    // Determine if this lastMove was a capture
    if (lastMove.captured) {
      const fromSq = lastMove.from as Square;
      const toSq = lastMove.to as Square;
      const victimSq = lastMove.isEnPassant
        ? (`${toSq[0]}${fromSq[1]}` as Square)
        : toSq;

      const attackerPiece = lastMove.piece || (chess.get(toSq)
        ? { type: chess.get(toSq)!.type, color: chess.get(toSq)!.color }
        : { type: 'p', color: 'w' });

      const fromPos = getSquarePercent(fromSq);
      const toPos = getSquarePercent(toSq);
      const victimPos = getSquarePercent(victimSq);

      // Calculate approach position right next to the victim square (82% of distance)
      const approachPos = {
        left: fromPos.left + (toPos.left - fromPos.left) * 0.82,
        top: fromPos.top + (toPos.top - fromPos.top) * 0.82,
      };

      // Calculate back position for Pawn lean-back loading phase (35% of vector)
      const backPos = {
        left: fromPos.left + (toPos.left - fromPos.left) * 0.35,
        top: fromPos.top + (toPos.top - fromPos.top) * 0.35,
      };

      const fromColIndex = files.indexOf(fromSq[0]);
      const fromRowIndex = ranks.indexOf(fromSq[1]);
      const toColIndex = files.indexOf(toSq[0]);
      const toRowIndex = ranks.indexOf(toSq[1]);

      const dx = toColIndex - fromColIndex;
      const dy = toRowIndex - fromRowIndex;

      const victimColor = lastMove.captured?.color || 'w';

      // Base horizontal fly component
      let baseFlyX = 0;
      if (dx > 0) {
        baseFlyX = 220;
      } else if (dx < 0) {
        baseFlyX = -220;
      } else {
        // dx === 0 (purely vertical kick)
        baseFlyX = orientation === 'white' ? 100 : -100;
      }

      // Base vertical fly component
      let baseFlyY = 0;
      if (dy > 0) {
        // Attacker moving DOWNWARDS on screen (e.g. Black attacking White)
        baseFlyY = 240;
      } else if (dy < 0) {
        // Attacker moving UPWARDS on screen (e.g. White attacking Black)
        baseFlyY = -240;
      } else {
        // dy === 0 (purely horizontal kick)
        if (orientation === 'white') {
          baseFlyY = victimColor === 'w' ? 200 : -200;
        } else {
          baseFlyY = victimColor === 'w' ? -200 : 200;
        }
      }

      // Determine power & characteristics by attacker piece type:
      // Pawn (p): Weakest -> short distance (~0.5x)
      // Queen (q): Strongest -> farthest distance (~2.4x)
      // Knight (n), Rook (r), Bishop (b): Medium appropriate strength
      // King (k): Authoritative -> squashes opponent flat down (isSquash = true)
      const attackerType = attackerPiece.type.toLowerCase();
      const isSquash = attackerType === 'k';

      let powerMultiplier = 1.0;
      let impactEmoji = '💥';
      let spins = 360;

      switch (attackerType) {
        case 'p': // Pawn (Tốt): Headbutt motion, short kick distance, small 💥 impact
          powerMultiplier = 0.5;
          impactEmoji = '💥';
          spins = 180;
          break;
        case 'b': // Bishop (Tượng): Strong kick, medium distance, medium 💥 impact
          powerMultiplier = 1.0;
          impactEmoji = '💥';
          spins = 360;
          break;
        case 'n': // Knight (Mã): Leaps, 360° somersault flip & overhead bicycle kick ("xe đạp chổng ngược"), launching opponent far!
          powerMultiplier = 2.1;
          impactEmoji = '💥';
          spins = 720;
          break;
        case 'r': // Rook (Xe): Heavy battering kick, medium distance, medium 💥 impact
          powerMultiplier = 1.25;
          impactEmoji = '💥';
          spins = 540;
          break;
        case 'q': // Queen (Hậu): Explosive kick, farthest launch off board, 3 fast spins (1080°), large 💥 impact
          powerMultiplier = 2.6;
          impactEmoji = '💥';
          spins = 1080;
          break;
        case 'k': // King (Vua): Authoritative leap & royal stomp, squashes opponent flat like a pancake, large 💥 impact
          powerMultiplier = 0;
          impactEmoji = '💥';
          spins = 0;
          break;
      }

      const flyX = baseFlyX * powerMultiplier;
      const flyY = baseFlyY * powerMultiplier;

      // tiltDir: 1 if target is to the right on screen, -1 if to the left on screen
      const tiltDir = dx >= 0 ? 1 : -1;

      const kickData: ActiveKick = {
        id: lastMove.id || Date.now(),
        from: fromSq,
        to: toSq,
        victimSquare: victimSq,
        attacker: attackerPiece,
        victim: lastMove.captured,
        fromPos,
        toPos,
        approachPos,
        backPos,
        victimPos,
        flyX,
        flyY,
        isSquash,
        impactEmoji,
        spins,
        tiltDir,
      };

      setActiveKick(kickData);

      // Play kick impact sound right at impact moment (~380ms)
      const soundTimer = setTimeout(() => {
        playSound?.('kick');
      }, 380);

      // Reset kick animation state after complete sequence (~900ms)
      const resetTimer = setTimeout(() => {
        setActiveKick(null);
      }, 900);

      return () => {
        clearTimeout(soundTimer);
        clearTimeout(resetTimer);
      };
    } else {
      setActiveKick(null);
    }
  }, [lastMove, fen]);

  // Clear annotations when fen changes (new move or game restart)
  useEffect(() => {
    setHighlightedSquares([]);
    setArrows([]);
  }, [fen]);

  const toggleHighlight = (sq: Square) => {
    setHighlightedSquares((prev) =>
      prev.includes(sq) ? prev.filter((s) => s !== sq) : [...prev, sq]
    );
  };

  const toggleArrow = (from: Square, to: Square) => {
    if (from === to) return;
    setArrows((prev) => {
      const exists = prev.some((a) => a.from === from && a.to === to);
      if (exists) {
        return prev.filter((a) => !(a.from === from && a.to === to));
      } else {
        return [...prev, { from, to }];
      }
    });
  };

  // Global mouseup listener for right-click releases
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (e.button === 2 && rightClickStart) {
        if (rightClickHover && rightClickStart !== rightClickHover) {
          toggleArrow(rightClickStart, rightClickHover);
        } else if (rightClickStart) {
          toggleHighlight(rightClickStart);
        }
        setRightClickStart(null);
        setRightClickHover(null);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [rightClickStart, rightClickHover]);

  const getSquareCoords = (sq: Square) => {
    const file = sq[0];
    const rank = sq[1];
    const colIndex = files.indexOf(file);
    const rowIndex = ranks.indexOf(rank);
    return {
      x: colIndex * 12.5 + 6.25,
      y: rowIndex * 12.5 + 6.25,
    };
  };

  const renderArrow = (
    fromSq: Square,
    toSq: Square,
    key: string,
    isPreview: boolean = false
  ) => {
    const from = getSquareCoords(fromSq);
    const to = getSquareCoords(toSq);

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return null;

    const ux = dx / len;
    const uy = dy / len;

    // Shorten line ends for clean arrowhead placement
    const startX = from.x + ux * 2.2;
    const startY = from.y + uy * 2.2;
    const endX = to.x - ux * 3.2;
    const endY = to.y - uy * 3.2;

    const strokeColor = isPreview ? 'rgba(22, 163, 74, 0.65)' : 'rgba(22, 163, 74, 0.92)';
    const markerId = isPreview ? 'arrowhead-preview' : 'arrowhead';

    return (
      <line
        key={key}
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={strokeColor}
        strokeWidth={isPreview ? '1.8' : '2.0'}
        strokeLinecap="round"
        markerEnd={`url(#${markerId})`}
      />
    );
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        setHighlightedSquares([]);
        setArrows([]);
      }}
      className={`relative w-full aspect-square mx-auto rounded-3xl overflow-hidden shadow-xl bg-white border-8 border-[#3bab3e] transition-all duration-300 ${
        isExpanded ? 'max-w-[660px]' : 'max-w-[560px]'
      }`}
      style={{ borderColor: '#3bab3e' }}
    >
      {/* Files indicators (a-h) along the bottom green border */}
      <div className="absolute bottom-0 left-4 right-4 h-4 flex justify-around items-center text-[12px] font-mono font-extrabold text-white pointer-events-none z-20 select-none">
        {files.map((file) => (
          <span key={file} className="w-full text-center">{file.toUpperCase()}</span>
        ))}
      </div>

      {/* Ranks indicators (1-8) along the left green border */}
      <div className="absolute top-4 bottom-4 left-0 w-4 flex flex-col justify-around items-center text-[12px] font-mono font-extrabold text-white pointer-events-none z-20 select-none">
        {ranks.map((rank) => (
          <span key={rank} className="h-full flex items-center justify-center w-full">{rank}</span>
        ))}
      </div>

      <motion.div
        animate={
          activeKick
            ? activeKick.attacker.type === 'r'
              ? {
                  // ROOK (XE - Option 1): Linear Kinetic Vector Thrust & ScaleX Compression
                  x: [0, -1.5, 1.5, -30, 28, -18, 12, -6, 2, 0],
                  y: [0, 1, -1, 6, -6, 4, -3, 2, -1, 0],
                  scaleX: [1, 1, 1, 1.06, 0.94, 1.03, 0.98, 1, 1, 1],
                  rotate: [0, 0, 0, -1.2, 1.2, -0.8, 0.5, -0.2, 0, 0],
                }
              : activeKick.isSquash
              ? {
                  // KING (VUA - Option 1): Concentric Radial Gravity Pulse & Vertical Drop Rebound
                  x: [0, 0, 0, -6, 6, -4, 4, -2, 1, 0],
                  y: [0, 0, 0, 22, -18, 13, -8, 4, -1, 0],
                  scaleY: [1, 1, 1, 0.92, 1.06, 0.96, 1.02, 0.99, 1, 1],
                  rotate: [0, 0, 0, -1.8, 1.8, -1.0, 0.6, -0.2, 0, 0],
                }
              : { x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rotate: 0 }
            : { x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rotate: 0 }
        }
        transition={{
          duration: 0.88,
          times: [0, 0.20, 0.38, 0.42, 0.48, 0.55, 0.63, 0.72, 0.82, 1],
        }}
        className="relative grid grid-cols-8 grid-rows-8 w-full h-full p-4 bg-[#3bab3e]"
      >
        {/* SVG overlay for arrows */}
        <svg
          className="absolute top-4 left-4 right-4 bottom-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] pointer-events-none z-30"
          viewBox="0 0 100 100"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="3.5"
              markerHeight="3.5"
              refX="2.8"
              refY="1.75"
              orient="auto"
            >
              <polygon points="0 0, 3.5 1.75, 0 3.5" fill="rgba(22, 163, 74, 0.92)" />
            </marker>
            <marker
              id="arrowhead-preview"
              markerWidth="3.5"
              markerHeight="3.5"
              refX="2.8"
              refY="1.75"
              orient="auto"
            >
              <polygon points="0 0, 3.5 1.75, 0 3.5" fill="rgba(22, 163, 74, 0.65)" />
            </marker>
          </defs>

          {/* Rendered arrows */}
          {arrows.map((a, idx) => renderArrow(a.from, a.to, `arrow-${idx}-${a.from}-${a.to}`))}

          {/* Dragging preview arrow */}
          {rightClickStart &&
            rightClickHover &&
            rightClickStart !== rightClickHover &&
            renderArrow(rightClickStart, rightClickHover, 'preview-arrow', true)}
        </svg>

        {/* --- OVERLAY ANIMATION FOR CAPTURE "ĐÁ CỜ / ĐÈ BẸP" --- */}
        {activeKick && (
          <div className="absolute top-4 left-4 right-4 bottom-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] pointer-events-none z-40 overflow-visible">
            {/* 1. Attacker Piece Animation */}
            <motion.div
              key={`kick-attacker-${activeKick.id}`}
              style={{
                position: 'absolute',
                width: '12.5%',
                height: '12.5%',
              }}
              initial={{
                left: `${activeKick.fromPos.left}%`,
                top: `${activeKick.fromPos.top}%`,
                scale: 1,
                rotate: 0,
                y: 0,
              }}
              animate={
                activeKick.isSquash
                  ? {
                      // King: advances to square, lifts up high into the air, hangs briefly, then STOMPS down heavily
                      left: [
                        `${activeKick.fromPos.left}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                      ],
                      top: [
                        `${activeKick.fromPos.top}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                      ],
                      y: [0, -36, -36, 4, 0],
                      scale: [1, 1.25, 1.35, 0.9, 1],
                      rotate: [0, -6, 6, -3, 0],
                    }
                  : activeKick.attacker.type === 'p'
                  ? {
                      // Pawn Headbutt: tilts head forward, headbutts violently at impact, HOLDS the forward tilt for a moment, then recovers upright!
                      left: [
                        `${activeKick.fromPos.left}%`,
                        `${activeKick.approachPos.left}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                      ],
                      top: [
                        `${activeKick.fromPos.top}%`,
                        `${activeKick.approachPos.top}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                      ],
                      rotate: [
                        0,
                        22 * activeKick.tiltDir,
                        42 * activeKick.tiltDir,
                        38 * activeKick.tiltDir,
                        -6 * activeKick.tiltDir,
                        0,
                      ], // Tilts head towards opponent (directionally based on dx), headbutts at impact, holds stance, then recovers upright
                      scale: [1, 1.12, 1.35, 1.25, 0.95, 1],
                    }
                  : activeKick.attacker.type === 'n'
                  ? {
                      // Knight (Mã): Advances to opponent, leaps high into the air with a full 360° somersault flip, then strikes with an overhead bicycle kick ("xe đạp chổng ngược")!
                      left: [
                        `${activeKick.fromPos.left}%`,
                        `${activeKick.approachPos.left}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                      ],
                      top: [
                        `${activeKick.fromPos.top}%`,
                        `${activeKick.approachPos.top}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                      ],
                      y: [0, -18, -62, -22, 2, 0],
                      rotate: [
                        0,
                        -25 * activeKick.tiltDir,
                        (-360 - 45) * activeKick.tiltDir, // 360° somersault flip + 45° bicycle kick extension!
                        -360 * activeKick.tiltDir,
                        -10 * activeKick.tiltDir,
                        0,
                      ],
                      scale: [1, 1.1, 1.45, 1.25, 0.92, 1],
                    }
                  : activeKick.attacker.type === 'r'
                  ? {
                      // Rook (Xe): Steady, heavy rumble on cyan/gold energy rails before riding firmly to impact!
                      left: [
                        `${activeKick.fromPos.left}%`,
                        `${activeKick.fromPos.left}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                      ],
                      top: [
                        `${activeKick.fromPos.top}%`,
                        `${activeKick.fromPos.top}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                      ],
                      y: [0, 0, 0, -3, 1, 0], // Stays firmly grounded on energy rails
                      rotate: [
                        0,
                        -8 * activeKick.tiltDir,  // Revs back & powers up energy rails
                        16 * activeKick.tiltDir,  // Leans forward during steady heavy collision
                        -6 * activeKick.tiltDir,  // Heavy recoil
                        0,
                        0,
                      ],
                      scale: [1, 1.08, 1.35, 1.15, 0.95, 1],
                    }
                  : activeKick.attacker.type === 'b'
                  ? {
                      // Bishop (Tượng): Glides along diagonal as 2 mirror clones accompany on parallel sides before converging at target!
                      left: [
                        `${activeKick.fromPos.left}%`,
                        `${activeKick.fromPos.left + (activeKick.toPos.left - activeKick.fromPos.left) * 0.4}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                      ],
                      top: [
                        `${activeKick.fromPos.top}%`,
                        `${activeKick.fromPos.top + (activeKick.toPos.top - activeKick.fromPos.top) * 0.4}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                      ],
                      rotate: [
                        0,
                        -15 * activeKick.tiltDir,
                        18 * activeKick.tiltDir,
                        -6 * activeKick.tiltDir,
                        0,
                        0,
                      ],
                      scale: [1, 1.1, 1.35, 1.25, 0.95, 1],
                    }
                  : {
                      // Kicking pieces: Queen (explosive launch)
                      left: [
                        `${activeKick.fromPos.left}%`,
                        `${activeKick.approachPos.left}%`,
                        `${activeKick.approachPos.left}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                      ],
                      top: [
                        `${activeKick.fromPos.top}%`,
                        `${activeKick.approachPos.top}%`,
                        `${activeKick.approachPos.top}%`,
                        `${activeKick.approachPos.top}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                      ],
                      rotate:
                        activeKick.attacker.type === 'q'
                          ? [
                              0,
                              0,
                              -35 * activeKick.tiltDir,
                              30 * activeKick.tiltDir,
                              -12 * activeKick.tiltDir,
                              0,
                            ]
                          : [
                              0,
                              0,
                              -22 * activeKick.tiltDir,
                              20 * activeKick.tiltDir,
                              -8 * activeKick.tiltDir,
                              0,
                            ],
                      scale:
                        activeKick.attacker.type === 'q'
                          ? [1, 1, 1.3, 1.55, 0.9, 1]
                          : [1, 1, 1.18, 1.32, 0.94, 1],
                    }
              }
              transition={{
                duration: 0.88,
                times: activeKick.isSquash
                  ? [0, 0.30, 0.46, 0.54, 1]
                  : activeKick.attacker.type === 'p'
                  ? [0, 0.28, 0.42, 0.72, 0.88, 1]
                  : activeKick.attacker.type === 'n'
                  ? [0, 0.22, 0.42, 0.54, 0.76, 1]
                  : activeKick.attacker.type === 'r'
                  ? [0, 0.14, 0.42, 0.58, 0.78, 1]
                  : [0, 0.32, 0.44, 0.52, 0.76, 1],
                ease: 'easeInOut',
              }}
              className="flex items-center justify-center p-1"
            >
              <div className="w-full h-full flex items-center justify-center drop-shadow-lg">
                <ChessPiece type={activeKick.attacker.type} color={activeKick.attacker.color} />
              </div>
            </motion.div>

            {/* Dual Energy Rails for Rook (Quân Xe) */}
            {activeKick.attacker.type === 'r' && (() => {
              const x1 = activeKick.fromPos.left + 6.25;
              const y1 = activeKick.fromPos.top + 6.25;
              const x2 = activeKick.toPos.left + 6.25;
              const y2 = activeKick.toPos.top + 6.25;
              const dx = x2 - x1;
              const dy = y2 - y1;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const px = (-dy / dist) * 1.8;
              const py = (dx / dist) * 1.8;

              return (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-25 overflow-visible">
                  <defs>
                    <linearGradient id={`rook-rail-grad-${activeKick.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.95" />
                      <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="1" />
                    </linearGradient>
                    <filter id={`rook-rail-glow-${activeKick.id}`} x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Rail 1 (Left Energy Track) */}
                  <motion.line
                    x1={`${x1 + px}%`}
                    y1={`${y1 + py}%`}
                    x2={`${x2 + px}%`}
                    y2={`${y2 + py}%`}
                    stroke={`url(#rook-rail-grad-${activeKick.id})`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    filter={`url(#rook-rail-glow-${activeKick.id})`}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{
                      pathLength: [0, 1, 1, 0],
                      opacity: [0, 1, 0.9, 0],
                    }}
                    transition={{
                      duration: 0.88,
                      times: [0, 0.16, 0.58, 0.82],
                      ease: 'easeInOut',
                    }}
                  />

                  {/* Rail 2 (Right Energy Track) */}
                  <motion.line
                    x1={`${x1 - px}%`}
                    y1={`${y1 - py}%`}
                    x2={`${x2 - px}%`}
                    y2={`${y2 - py}%`}
                    stroke={`url(#rook-rail-grad-${activeKick.id})`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    filter={`url(#rook-rail-glow-${activeKick.id})`}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{
                      pathLength: [0, 1, 1, 0],
                      opacity: [0, 1, 0.9, 0],
                    }}
                    transition={{
                      duration: 0.88,
                      times: [0, 0.16, 0.58, 0.82],
                      ease: 'easeInOut',
                    }}
                  />
                </svg>
              );
            })()}

            {/* 4 Ground Cracks & Cross Shockwaves emanating from Rook's impact point */}
            {activeKick.attacker.type === 'r' && (
              <>
                {/* 4 Jagged Ground Cracks centered on opponent's square */}
                <motion.div
                  key={`rook-ground-cracks-${activeKick.id}`}
                  style={{
                    position: 'absolute',
                    width: '12.5%',
                    height: '12.5%',
                    left: `${activeKick.toPos.left}%`,
                    top: `${activeKick.toPos.top}%`,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0, 1, 0.95, 0] }}
                  transition={{
                    duration: 0.88,
                    times: [0, 0.38, 0.42, 0.78, 0.95],
                  }}
                  className="flex items-center justify-center pointer-events-none z-30 overflow-visible"
                >
                  <svg viewBox="0 0 100 100" className="w-[180%] h-[180%] overflow-visible filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                    {/* Dark Gray Main Fissure Lines */}
                    <motion.g
                      stroke="#334155"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: [0, 0, 1, 1], opacity: [0, 0, 1, 0] }}
                      transition={{ duration: 0.88, times: [0, 0.40, 0.52, 0.92] }}
                    >
                      {/* Crack 1: Upward Fissure */}
                      <path d="M 50,50 L 51,32 L 44,18 L 52,4" />
                      <path d="M 51,32 L 62,24" strokeWidth="2.2" />
                      <path d="M 44,18 L 34,12" strokeWidth="1.8" />

                      {/* Crack 2: Rightward Fissure */}
                      <path d="M 50,50 L 68,52 L 82,44 L 96,52" />
                      <path d="M 68,52 L 76,64" strokeWidth="2.2" />
                      <path d="M 82,44 L 90,32" strokeWidth="1.8" />

                      {/* Crack 3: Downward Fissure */}
                      <path d="M 50,50 L 48,68 L 55,82 L 46,96" />
                      <path d="M 48,68 L 38,76" strokeWidth="2.2" />
                      <path d="M 55,82 L 66,90" strokeWidth="1.8" />

                      {/* Crack 4: Leftward Fissure */}
                      <path d="M 50,50 L 32,48 L 18,55 L 4,46" />
                      <path d="M 32,48 L 24,36" strokeWidth="2.2" />
                      <path d="M 18,55 L 10,66" strokeWidth="1.8" />
                    </motion.g>

                    {/* Dark Charcoal Inner Chasm Depth */}
                    <motion.g
                      stroke="#0f172a"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: [0, 0, 1, 1], opacity: [0, 0, 1, 0] }}
                      transition={{ duration: 0.88, times: [0, 0.40, 0.52, 0.88] }}
                    >
                      {/* Crack 1: Upward */}
                      <path d="M 50,50 L 51,32 L 44,18 L 52,4" />
                      <path d="M 51,32 L 62,24" strokeWidth="1.2" />
                      <path d="M 44,18 L 34,12" strokeWidth="1" />

                      {/* Crack 2: Rightward */}
                      <path d="M 50,50 L 68,52 L 82,44 L 96,52" />
                      <path d="M 68,52 L 76,64" strokeWidth="1.2" />
                      <path d="M 82,44 L 90,32" strokeWidth="1" />

                      {/* Crack 3: Downward */}
                      <path d="M 50,50 L 48,68 L 55,82 L 46,96" />
                      <path d="M 48,68 L 38,76" strokeWidth="1.2" />
                      <path d="M 55,82 L 66,90" strokeWidth="1" />

                      {/* Crack 4: Leftward */}
                      <path d="M 50,50 L 32,48 L 18,55 L 4,46" />
                      <path d="M 32,48 L 24,36" strokeWidth="1.2" />
                      <path d="M 18,55 L 10,66" strokeWidth="1" />
                    </motion.g>

                    {/* Center Impact Fracture Ring */}
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="12"
                      fill="none"
                      stroke="#475569"
                      strokeWidth="2.5"
                      strokeDasharray="4 3"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 0, 1.2, 1.8], opacity: [0, 0, 0.9, 0] }}
                      transition={{ duration: 0.88, times: [0, 0.40, 0.50, 0.78] }}
                    />
                  </svg>
                </motion.div>

                {/* Cross Shockwaves (+) emanating from Rook's impact point */}
                <motion.div
                  key={`rook-cross-shockwave-${activeKick.id}`}
                  style={{
                    position: 'absolute',
                    width: '12.5%',
                    height: '12.5%',
                    left: `${activeKick.toPos.left}%`,
                    top: `${activeKick.toPos.top}%`,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0, 1, 0.85, 0] }}
                  transition={{
                    duration: 0.88,
                    times: [0, 0.38, 0.42, 0.65, 0.88],
                  }}
                  className="flex items-center justify-center pointer-events-none z-45 overflow-visible"
                >
                  {/* Up Beam */}
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                      height: [0, 0, 90, 140, 0],
                      opacity: [0, 0, 1, 0.8, 0],
                    }}
                    transition={{
                      duration: 0.88,
                      times: [0, 0.40, 0.48, 0.65, 0.88],
                    }}
                    className="absolute bottom-1/2 w-4 bg-gradient-to-t from-amber-300 via-cyan-400 to-transparent rounded-t-full shadow-[0_0_18px_rgba(34,211,238,1)]"
                  />
                  {/* Down Beam */}
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                      height: [0, 0, 90, 140, 0],
                      opacity: [0, 0, 1, 0.8, 0],
                    }}
                    transition={{
                      duration: 0.88,
                      times: [0, 0.40, 0.48, 0.65, 0.88],
                    }}
                    className="absolute top-1/2 w-4 bg-gradient-to-b from-amber-300 via-cyan-400 to-transparent rounded-b-full shadow-[0_0_18px_rgba(34,211,238,1)]"
                  />
                  {/* Left Beam */}
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{
                      width: [0, 0, 90, 140, 0],
                      opacity: [0, 0, 1, 0.8, 0],
                    }}
                    transition={{
                      duration: 0.88,
                      times: [0, 0.40, 0.48, 0.65, 0.88],
                    }}
                    className="absolute right-1/2 h-4 bg-gradient-to-l from-amber-300 via-cyan-400 to-transparent rounded-l-full shadow-[0_0_18px_rgba(34,211,238,1)]"
                  />
                  {/* Right Beam */}
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{
                      width: [0, 0, 90, 140, 0],
                      opacity: [0, 0, 1, 0.8, 0],
                    }}
                    transition={{
                      duration: 0.88,
                      times: [0, 0.40, 0.48, 0.65, 0.88],
                    }}
                    className="absolute left-1/2 h-4 bg-gradient-to-r from-amber-300 via-cyan-400 to-transparent rounded-r-full shadow-[0_0_18px_rgba(34,211,238,1)]"
                  />
                </motion.div>
              </>
            )}

            {/* Rock/Stone Shatter Debris Particles when captured by Rook */}
            {activeKick.attacker.type === 'r' && (
              <>
                {[...Array(14)].map((_, idx) => {
                  const angle = (idx / 14) * Math.PI * 2;
                  const dist = 22 + (idx % 4) * 14;
                  const burstX = Math.cos(angle) * dist;
                  const burstY = Math.sin(angle) * dist + 16;
                  const rot = (idx % 2 === 0 ? 1 : -1) * (180 + idx * 45);
                  const delay = 0.42 + (idx % 3) * 0.02;

                  return (
                    <motion.div
                      key={`rook-rock-particle-${activeKick.id}-${idx}`}
                      style={{
                        position: 'absolute',
                        width: '12.5%',
                        height: '12.5%',
                        left: `${activeKick.victimPos.left}%`,
                        top: `${activeKick.victimPos.top}%`,
                      }}
                      initial={{ scale: 0, opacity: 0, x: 0, y: 0, rotate: 0 }}
                      animate={{
                        scale: [0, 0, 1.2, 0.8, 0],
                        opacity: [0, 0, 1, 0.8, 0],
                        x: [0, 0, burstX * 0.5, burstX],
                        y: [0, 0, burstY * 0.5, burstY + 12],
                        rotate: [0, 0, rot * 0.5, rot],
                      }}
                      transition={{
                        duration: 0.88,
                        times: [0, delay, delay + 0.12, delay + 0.28, 0.88],
                        ease: 'easeOut',
                      }}
                      className="flex items-center justify-center pointer-events-none z-45"
                    >
                      <div
                        className={`border border-stone-400/80 shadow-md ${
                          idx % 3 === 0
                            ? 'w-3 h-3 bg-stone-700 rounded-sm rotate-12'
                            : idx % 3 === 1
                            ? 'w-2.5 h-2 bg-stone-800 rounded-[1px] -rotate-45'
                            : 'w-2 h-2.5 bg-stone-600 rounded-[2px] rotate-45'
                        }`}
                      />
                    </motion.div>
                  );
                })}
              </>
            )}

            {/* 2 Mirror Clones (Bóng ma / Tàn ảnh) for Bishop */}
            {activeKick.attacker.type === 'b' && (() => {
              const dxPct = activeKick.toPos.left - activeKick.fromPos.left;
              const dyPct = activeKick.toPos.top - activeKick.fromPos.top;
              const len = Math.sqrt(dxPct * dxPct + dyPct * dyPct) || 1;
              const px = -dyPct / len;
              const py = dxPct / len;
              const offsetPct = 7.5;

              return (
                <>
                  {/* Clone 1 (Left Side Phantom) */}
                  <motion.div
                    key={`bishop-clone-1-${activeKick.id}`}
                    style={{
                      position: 'absolute',
                      width: '12.5%',
                      height: '12.5%',
                    }}
                    initial={{
                      left: `${activeKick.fromPos.left + px * offsetPct}%`,
                      top: `${activeKick.fromPos.top + py * offsetPct}%`,
                      opacity: 0,
                      scale: 0.8,
                    }}
                    animate={{
                      left: [
                        `${activeKick.fromPos.left + px * offsetPct}%`,
                        `${activeKick.fromPos.left + dxPct * 0.4 + px * offsetPct * 0.75}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                      ],
                      top: [
                        `${activeKick.fromPos.top + py * offsetPct}%`,
                        `${activeKick.fromPos.top + dyPct * 0.4 + py * offsetPct * 0.75}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                      ],
                      opacity: [0, 0.85, 0.95, 0],
                      scale: [0.8, 1.15, 1.25, 0],
                    }}
                    transition={{
                      duration: 0.88,
                      times: [0, 0.22, 0.42, 0.52],
                      ease: 'easeInOut',
                    }}
                    className="flex items-center justify-center p-1 pointer-events-none z-30 filter drop-shadow-[0_0_12px_rgba(56,189,248,0.95)]"
                  >
                    <div className="w-full h-full flex items-center justify-center opacity-80 mix-blend-screen brightness-125 saturate-200 blur-[0.4px]">
                      <ChessPiece type="b" color={activeKick.attacker.color} />
                    </div>
                  </motion.div>

                  {/* Clone 2 (Right Side Phantom) */}
                  <motion.div
                    key={`bishop-clone-2-${activeKick.id}`}
                    style={{
                      position: 'absolute',
                      width: '12.5%',
                      height: '12.5%',
                    }}
                    initial={{
                      left: `${activeKick.fromPos.left - px * offsetPct}%`,
                      top: `${activeKick.fromPos.top - py * offsetPct}%`,
                      opacity: 0,
                      scale: 0.8,
                    }}
                    animate={{
                      left: [
                        `${activeKick.fromPos.left - px * offsetPct}%`,
                        `${activeKick.fromPos.left + dxPct * 0.4 - px * offsetPct * 0.75}%`,
                        `${activeKick.toPos.left}%`,
                        `${activeKick.toPos.left}%`,
                      ],
                      top: [
                        `${activeKick.fromPos.top - py * offsetPct}%`,
                        `${activeKick.fromPos.top + dyPct * 0.4 - py * offsetPct * 0.75}%`,
                        `${activeKick.toPos.top}%`,
                        `${activeKick.toPos.top}%`,
                      ],
                      opacity: [0, 0.85, 0.95, 0],
                      scale: [0.8, 1.15, 1.25, 0],
                    }}
                    transition={{
                      duration: 0.88,
                      times: [0, 0.22, 0.42, 0.52],
                      ease: 'easeInOut',
                    }}
                    className="flex items-center justify-center p-1 pointer-events-none z-30 filter drop-shadow-[0_0_12px_rgba(56,189,248,0.95)]"
                  >
                    <div className="w-full h-full flex items-center justify-center opacity-80 mix-blend-screen brightness-125 saturate-200 blur-[0.4px]">
                      <ChessPiece type="b" color={activeKick.attacker.color} />
                    </div>
                  </motion.div>
                </>
              );
            })()}

            {/* Radiant Holy Cross Flash over Bishop's head upon convergence */}
            {activeKick.attacker.type === 'b' && (
              <motion.div
                key={`bishop-cross-${activeKick.id}`}
                style={{
                  position: 'absolute',
                  width: '12.5%',
                  height: '12.5%',
                  left: `${activeKick.toPos.left}%`,
                  top: `${activeKick.toPos.top - 4}%`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 0, 2.4, 2.0, 0],
                  opacity: [0, 0, 1, 0.9, 0],
                  rotate: [0, 0, 15, -15, 0],
                }}
                transition={{
                  duration: 0.88,
                  times: [0, 0.38, 0.46, 0.65, 0.88],
                  ease: 'easeOut',
                }}
                className="flex items-center justify-center pointer-events-none z-50 overflow-visible"
              >
                <div className="relative flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-16 h-16 filter drop-shadow-[0_0_16px_rgba(251,191,36,1)] drop-shadow-[0_0_24px_rgba(56,189,248,1)]">
                    <circle cx="50" cy="50" r="32" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4,4" className="animate-spin" />
                    <path
                      d="M 44,12 L 56,12 L 56,36 L 80,36 L 80,48 L 56,48 L 56,88 L 44,88 L 44,48 L 20,48 L 20,36 L 44,36 Z"
                      fill="url(#goldGradient)"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <defs>
                      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="50%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#38bdf8" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute text-xl select-none filter drop-shadow-[0_0_8px_rgba(255,255,255,1)]">✨</span>
                </div>
              </motion.div>
            )}

            {/* Sand & Dust Disintegration Particles when captured by Bishop */}
            {activeKick.attacker.type === 'b' && (
              <>
                {[...Array(12)].map((_, idx) => {
                  const angle = (idx / 12) * Math.PI * 2;
                  const dist = 18 + (idx % 3) * 12;
                  const burstX = Math.cos(angle) * dist;
                  const burstY = Math.sin(angle) * dist + 10;
                  const delay = 0.40 + (idx % 4) * 0.03;

                  return (
                    <motion.div
                      key={`bishop-dust-particle-${activeKick.id}-${idx}`}
                      style={{
                        position: 'absolute',
                        width: '12.5%',
                        height: '12.5%',
                        left: `${activeKick.victimPos.left}%`,
                        top: `${activeKick.victimPos.top}%`,
                      }}
                      initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                      animate={{
                        scale: [0, 0, 1.3, 0.4, 0],
                        opacity: [0, 0, 0.95, 0.6, 0],
                        x: [0, 0, burstX * 0.5, burstX],
                        y: [0, 0, burstY * 0.5, burstY],
                        rotate: [0, 0, 90, 180],
                      }}
                      transition={{
                        duration: 0.88,
                        times: [0, delay, delay + 0.15, delay + 0.32, 0.88],
                        ease: 'easeOut',
                      }}
                      className="flex items-center justify-center pointer-events-none z-45"
                    >
                      <div
                        className={`rounded-full filter blur-[0.4px] shadow-sm ${
                          idx % 3 === 0
                            ? 'w-2.5 h-2.5 bg-amber-500'
                            : idx % 3 === 1
                            ? 'w-2 h-2 bg-yellow-600'
                            : 'w-1.5 h-1.5 bg-amber-300'
                        }`}
                      />
                    </motion.div>
                  );
                })}
              </>
            )}

            {/* 2. Impact Visuals: King Concentric Target Rings + Seismic Shockwave VS Cartoon 💥 Flash for others */}
            {activeKick.isSquash ? (
              <>
                {/* Concentric Target Rings (Zoom-in Aiming Reticle onto target center) */}
                <motion.div
                  key={`kick-target-rings-${activeKick.id}`}
                  style={{
                    position: 'absolute',
                    width: '12.5%',
                    height: '12.5%',
                    left: `${activeKick.toPos.left}%`,
                    top: `${activeKick.toPos.top}%`,
                  }}
                  initial={{ scale: 3.5, opacity: 0 }}
                  animate={{
                    scale: [3.5, 1.0, 1.0, 1.2, 0],
                    opacity: [0, 0.95, 1.0, 0.8, 0],
                    rotate: [0, 90, 180, 270, 360],
                  }}
                  transition={{
                    duration: 0.88,
                    times: [0, 0.36, 0.46, 0.65, 0.90],
                    ease: 'easeOut',
                  }}
                  className="flex items-center justify-center pointer-events-none z-50 overflow-visible"
                >
                  <svg viewBox="0 0 100 100" className="w-[200%] h-[200%] filter drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]">
                    {/* Crosshairs aiming at target center */}
                    <line x1="50" y1="2" x2="50" y2="22" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
                    <line x1="50" y1="78" x2="50" y2="98" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
                    <line x1="2" y1="50" x2="22" y2="50" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
                    <line x1="78" y1="50" x2="98" y2="50" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
                    {/* Concentric Target Rings */}
                    <circle cx="50" cy="50" r="44" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray="8,5" />
                    <circle cx="50" cy="50" r="30" fill="none" stroke="#f59e0b" strokeWidth="3.5" />
                    <circle cx="50" cy="50" r="16" fill="none" stroke="#dc2626" strokeWidth="4" />
                    <circle cx="50" cy="50" r="6" fill="#ef4444" />
                  </svg>
                </motion.div>

                {/* 3 Concentric Radial Expansion Wave Rings for King Gravity Stomp (Option 1) */}
                <motion.div
                  key={`king-radial-shockwave-container-${activeKick.id}`}
                  style={{
                    position: 'absolute',
                    width: '12.5%',
                    height: '12.5%',
                    left: `${activeKick.toPos.left}%`,
                    top: `${activeKick.toPos.top}%`,
                  }}
                  className="flex items-center justify-center pointer-events-none z-45 overflow-visible"
                >
                  {/* Wave Ring 1: Primary Dense Gold Inner Wave */}
                  <motion.div
                    initial={{ scale: 0.1, opacity: 0 }}
                    animate={{
                      scale: [0.1, 0.1, 2.2, 3.4],
                      opacity: [0, 0, 1, 0],
                    }}
                    transition={{
                      duration: 0.88,
                      times: [0, 0.42, 0.62, 0.88],
                      ease: 'easeOut',
                    }}
                    className="absolute w-[180%] h-[180%] rounded-full border-4 border-amber-300 bg-amber-400/25 shadow-[0_0_28px_rgba(251,191,36,0.95)]"
                  />

                  {/* Wave Ring 2: Secondary Golden Ripple Ring */}
                  <motion.div
                    initial={{ scale: 0.1, opacity: 0 }}
                    animate={{
                      scale: [0.1, 0.1, 2.8, 4.5],
                      opacity: [0, 0, 0.85, 0],
                    }}
                    transition={{
                      duration: 0.88,
                      times: [0, 0.46, 0.68, 0.92],
                      ease: 'easeOut',
                    }}
                    className="absolute w-[180%] h-[180%] rounded-full border-[3px] border-yellow-400 bg-yellow-500/15 shadow-[0_0_22px_rgba(245,158,11,0.8)]"
                  />

                  {/* Wave Ring 3: Outer Dissipating Radial Pulse */}
                  <motion.div
                    initial={{ scale: 0.1, opacity: 0 }}
                    animate={{
                      scale: [0.1, 0.1, 3.6, 5.8],
                      opacity: [0, 0, 0.7, 0],
                    }}
                    transition={{
                      duration: 0.88,
                      times: [0, 0.50, 0.74, 0.96],
                      ease: 'easeOut',
                    }}
                    className="absolute w-[180%] h-[180%] rounded-full border-2 border-amber-500/80 shadow-[0_0_16px_rgba(217,119,6,0.6)]"
                  />
                </motion.div>
              </>
            ) : (
              /* Cartoon Flash 💥 for non-King captures */
              <motion.div
                key={`kick-flash-${activeKick.id}`}
                style={{
                  position: 'absolute',
                  width: '12.5%',
                  height: '12.5%',
                  left: `${activeKick.toPos.left}%`,
                  top: `${activeKick.toPos.top}%`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale:
                    activeKick.attacker.type === 'q'
                      ? [0, 0, 2.9, 0]
                      : activeKick.attacker.type === 'p'
                      ? [0, 0, 1.3, 0] // Small 💥 for Pawn headbutt
                      : [0, 0, 1.9, 0], // Medium 💥 for Bishop, Rook, Knight
                  opacity: [0, 0, 1, 0],
                  rotate: [0, 0, 45, 90],
                }}
                transition={{
                  duration: 0.88,
                  times: [0, 0.42, 0.58, 0.82],
                  ease: 'easeOut',
                }}
                className="flex items-center justify-center pointer-events-none z-50"
              >
                <div className="text-3xl sm:text-4xl filter drop-shadow-[0_0_12px_rgba(251,191,36,0.95)] select-none">
                  💥
                </div>
              </motion.div>
            )}

            {/* 3. Victim Piece Animation */}
            <motion.div
              key={`kick-victim-${activeKick.id}`}
              style={{
                position: 'absolute',
                width: '12.5%',
                height: '12.5%',
                left: `${activeKick.victimPos.left}%`,
                top: `${activeKick.victimPos.top}%`,
              }}
              initial={{
                x: 0,
                y: 0,
                rotate: 0,
                scale: 1,
                scaleX: 1,
                scaleY: 1,
                opacity: 1,
              }}
              animate={
                activeKick.isSquash
                  ? {
                      // KING SQUASH: Squashed flat into a pancake (scaleY -> 0.08) on the board before fading out
                      x: 0,
                      y: [0, 0, 18, 18, 18],
                      scaleX: [1, 1, 1.85, 1.9, 0],
                      scaleY: [1, 1, 0.08, 0.08, 0],
                      rotate: [0, 0, 6, -6, 0],
                      opacity: [1, 1, 1, 1, 0],
                    }
                  : activeKick.attacker.type === 'b'
                  ? {
                      // BISHOP DUST DISINTEGRATION: Disintegrates into sand/dust (dissolves downward, sepia/blur, fades to 0)
                      x: 0,
                      y: [0, 0, 6, 14, 22],
                      scale: [1, 1.08, 0.65, 0.25, 0],
                      rotate: [0, 0, -8, 12, -20],
                      opacity: [1, 1, 0.75, 0.25, 0],
                    }
                  : activeKick.attacker.type === 'r'
                  ? {
                      // ROOK STONE SHATTER: Cracks & shatters into stone fragments
                      x: 0,
                      y: [0, 0, 4, 12, 18],
                      scale: [1, 1.22, 0.45, 0.15, 0],
                      rotate: [0, 0, -12, 24, -45],
                      opacity: [1, 1, 0.85, 0.3, 0],
                    }
                  : {
                      // Kicked away with distance & 3 fast spins (1080°) for Queen, short distance for Pawn, medium for others
                      x: [0, 0, activeKick.flyX * 0.45, activeKick.flyX * 1.35],
                      y: [0, 0, activeKick.flyY * 0.45, activeKick.flyY * 1.35],
                      rotate: [0, 0, activeKick.spins * 0.45, activeKick.spins],
                      scale: [1, 1, 1.35, 0],
                      opacity: [1, 1, 1, 0],
                    }
              }
              transition={{
                duration: 0.88,
                times: activeKick.isSquash
                  ? [0, 0.40, 0.54, 0.78, 1]
                  : activeKick.attacker.type === 'b'
                  ? [0, 0.38, 0.52, 0.72, 1]
                  : activeKick.attacker.type === 'r'
                  ? [0, 0.40, 0.52, 0.72, 1]
                  : [0, 0.43, 0.72, 1],
                ease: 'easeOut',
              }}
              className={`flex items-center justify-center p-1 ${
                activeKick.attacker.type === 'b'
                  ? 'filter sepia-[100%] hue-rotate-15 contrast-125 blur-[0.8px]'
                  : activeKick.attacker.type === 'r'
                  ? 'filter grayscale(100%) contrast(160%) brightness(70%) blur-[0.6px]'
                  : ''
              }`}
            >
              <div className="w-full h-full flex items-center justify-center">
                <ChessPiece type={activeKick.victim.type} color={activeKick.victim.color} />
              </div>
            </motion.div>
          </div>
        )}

        {ranks.map((rank, rIdx) => {
          return (
            <div key={rank} className="contents">
              {files.map((file, fIdx) => {
                const squareName = `${file}${rank}` as Square;
                const piece = chess.get(squareName);
                const colIndex = 'abcdefgh'.indexOf(file);
                const rowIndex = '87654321'.indexOf(rank);
                const isDark = (rowIndex + colIndex) % 2 !== 0;

                // Styling classes
                const isSelected = selectedSquare === squareName;
                const isPossibleTarget = possibleMoves.includes(squareName);
                const isLastMoveSrc = lastMove?.from === squareName;
                const isLastMoveDst = lastMove?.to === squareName;
                const isCheck = kingInCheckSquare === squareName;
                const isHighlighted = highlightedSquares.includes(squareName);

                // Hide pieces during active kick overlay on affected cells to prevent duplicate rendering
                const isAttackerSquare = activeKick && activeKick.to === squareName;
                const isVictimSquare = activeKick && activeKick.victimSquare === squareName;
                const isFromSquare = activeKick && activeKick.from === squareName;
                const hidePieceOnGrid = isAttackerSquare || isVictimSquare || isFromSquare;

                // Check if King stomp 3x3 depression effect applies
                const isKingSquash = Boolean(activeKick && activeKick.isSquash);
                let isKingCenterSquare = false;
                let isKingSurroundingSquare = false;

                if (isKingSquash && activeKick) {
                  const targetCol = 'abcdefgh'.indexOf(activeKick.to[0]);
                  const targetRow = '87654321'.indexOf(activeKick.to[1]);
                  const diffCol = Math.abs(colIndex - targetCol);
                  const diffRow = Math.abs(rowIndex - targetRow);

                  if (diffCol === 0 && diffRow === 0) {
                    isKingCenterSquare = true;
                  } else if (diffCol <= 1 && diffRow <= 1) {
                    isKingSurroundingSquare = true;
                  }
                }

                const isKingImpactSquare = isKingCenterSquare || isKingSurroundingSquare;

                let squareBg = isDark ? 'bg-[#C4CDC1]' : 'bg-[#F2EDE7]'; // pastel sage & soft cream

                if (isLastMoveSrc || isLastMoveDst) {
                  squareBg = isDark ? 'bg-[#B0BBAE]' : 'bg-[#EAE4DC]'; // highlighted path in Natural Tones
                }

                return (
                  <motion.button
                    key={squareName}
                    id={`square-${squareName}`}
                    disabled={!isInteractive}
                    onContextMenu={(e) => e.preventDefault()}
                    onMouseDown={(e) => {
                      if (e.button === 2) {
                        e.preventDefault();
                        setRightClickStart(squareName);
                        setRightClickHover(squareName);
                      } else if (e.button === 0) {
                        setHighlightedSquares([]);
                        setArrows([]);
                      }
                    }}
                    onMouseEnter={() => {
                      if (rightClickStart) {
                        setRightClickHover(squareName);
                      }
                    }}
                    onClick={(e) => {
                      // Prevent parent container click from firing again
                      e.stopPropagation();
                      setHighlightedSquares([]);
                      setArrows([]);
                      onSquareClick(squareName);
                    }}
                    animate={
                      isKingImpactSquare
                        ? {
                            scale: [1, 1, isKingCenterSquare ? 0.84 : 0.90, 1.05, 1],
                            y: [0, 0, isKingCenterSquare ? 6 : 4, -2, 0],
                            filter: [
                              'brightness(100%)',
                              'brightness(100%)',
                              isKingCenterSquare ? 'brightness(50%)' : 'brightness(70%)',
                              'brightness(108%)',
                              'brightness(100%)',
                            ],
                          }
                        : { scale: 1, y: 0, filter: 'brightness(100%)' }
                    }
                    transition={
                      isKingImpactSquare
                        ? {
                            duration: 0.88,
                            times: [0, 0.40, 0.46, 0.62, 0.74, 1],
                            ease: 'easeOut',
                          }
                        : { duration: 0.15 }
                    }
                    className={`relative w-full h-full flex items-center justify-center transition-all duration-300 select-none focus:outline-none ${squareBg} ${
                      isSelected ? 'ring-4 ring-[#EBD99F] ring-inset bg-[#EBD99F]/30' : ''
                    } ${isCheck ? 'ring-4 ring-[#FFADAD] ring-inset animate-pulse bg-[#FFADAD]/30' : ''}`}
                  >
                    {/* King Stomp 3x3 Depressed & Darkened Inner Shadow Overlay */}
                    {isKingImpactSquare && (
                      <motion.div
                        key={`king-depress-${activeKick?.id}-${squareName}`}
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: [0, 0, isKingCenterSquare ? 0.75 : 0.5, 0],
                        }}
                        transition={{
                          duration: 0.88,
                          times: [0, 0.40, 0.46, 0.62],
                          ease: 'easeOut',
                        }}
                        className="absolute inset-0 bg-slate-950 shadow-[inset_0_4px_12px_rgba(0,0,0,0.85)] pointer-events-none z-15 rounded-sm"
                      />
                    )}
                    {/* Right-click soft highlight overlay */}
                    {isHighlighted && (
                      <div className="absolute inset-0 bg-[#16A34A]/40 pointer-events-none z-15" />
                    )}

                    {/* Background highlighted trail for last move */}
                    {(isLastMoveSrc || isLastMoveDst) && (
                      <div className="absolute inset-0 bg-[#EBD99F]/10 pointer-events-none" />
                    )}

                    {/* Chess Piece with animation */}
                    <AnimatePresence mode="popLayout">
                      {piece && !hidePieceOnGrid && (
                        <motion.div
                          key={`${piece.color}${piece.type}-${squareName}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="w-[90%] h-[90%] flex items-center justify-center cursor-pointer z-20 select-none hover:scale-105 transition-transform"
                        >
                          <ChessPiece type={piece.type} color={piece.color} />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Hint / Possible Move dot indicator */}
                    {isPossibleTarget && (
                      <div className="absolute inset-0 flex items-center justify-center z-25">
                        {piece ? (
                          // Target captures have an outer gold circle
                          <div className="w-[80%] h-[80%] rounded-full border-4 border-amber-400 bg-amber-400/25 animate-ping duration-1000" />
                        ) : (
                          // Regular movement dots
                          <div className="w-4 h-4 rounded-full bg-amber-400/80 shadow-md border-2 border-white" />
                        )}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};

