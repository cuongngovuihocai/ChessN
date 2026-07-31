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
  victimPos: { left: number; top: number };
  flyX: number;
  flyY: number;
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

      const fromColIndex = files.indexOf(fromSq[0]);
      const fromRowIndex = ranks.indexOf(fromSq[1]);
      const toColIndex = files.indexOf(toSq[0]);
      const toRowIndex = ranks.indexOf(toSq[1]);

      const dx = toColIndex - fromColIndex;
      const dy = toRowIndex - fromRowIndex;

      const victimColor = lastMove.captured?.color || 'w';

      // Horizontal fly component
      let flyX = 0;
      if (dx > 0) {
        flyX = 240;
      } else if (dx < 0) {
        flyX = -240;
      } else {
        // dx === 0 (purely vertical kick)
        flyX = orientation === 'white' ? 100 : -100;
      }

      // Vertical fly component
      let flyY = 0;
      if (dy > 0) {
        // Attacker moving DOWNWARDS on screen (e.g. Black attacking White)
        flyY = 260;
      } else if (dy < 0) {
        // Attacker moving UPWARDS on screen (e.g. White attacking Black)
        flyY = -260;
      } else {
        // dy === 0 (purely horizontal kick)
        // Send victim towards their own team's home side
        if (orientation === 'white') {
          flyY = victimColor === 'w' ? 220 : -220;
        } else {
          flyY = victimColor === 'w' ? -220 : 220;
        }
      }

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
        victimPos,
        flyX,
        flyY,
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

      <div className="relative grid grid-cols-8 grid-rows-8 w-full h-full p-4 bg-[#3bab3e]">
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

        {/* --- OVERLAY ANIMATION FOR CAPTURE "ĐÁ CỜ" --- */}
        {activeKick && (
          <div className="absolute top-4 left-4 right-4 bottom-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] pointer-events-none z-40 overflow-visible">
            {/* 1. Attacker Piece: Glides to edge of victim square, pauses ~1/3s, then kicks victim & settles */}
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
              }}
              animate={{
                left: [
                  `${activeKick.fromPos.left}%`,
                  `${activeKick.approachPos.left}%`,
                  `${activeKick.approachPos.left}%`,
                  `${activeKick.toPos.left}%`,
                  `${activeKick.toPos.left}%`,
                  `${activeKick.toPos.left}%`
                ],
                top: [
                  `${activeKick.fromPos.top}%`,
                  `${activeKick.approachPos.top}%`,
                  `${activeKick.approachPos.top}%`,
                  `${activeKick.toPos.top}%`,
                  `${activeKick.toPos.top}%`,
                  `${activeKick.toPos.top}%`
                ],
                rotate: [0, 0, -18, 16, -8, 0],
                scale: [1, 1, 1.15, 1.28, 0.94, 1]
              }}
              transition={{
                duration: 0.88,
                times: [0, 0.34, 0.43, 0.50, 0.74, 1],
                ease: "easeInOut"
              }}
              className="flex items-center justify-center p-1"
            >
              <div className="w-full h-full flex items-center justify-center drop-shadow-lg">
                <ChessPiece type={activeKick.attacker.type} color={activeKick.attacker.color} />
              </div>
            </motion.div>

            {/* 2. Impact Cartoon Flash 💥 at kick moment */}
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
                scale: [0, 0, 1.8, 0],
                opacity: [0, 0, 1, 0],
                rotate: [0, 0, 45, 90]
              }}
              transition={{
                duration: 0.88,
                times: [0, 0.42, 0.56, 0.80],
                ease: "easeOut"
              }}
              className="flex items-center justify-center pointer-events-none z-50"
            >
              <div className="text-3xl sm:text-4xl filter drop-shadow-[0_0_12px_rgba(251,191,36,0.95)] select-none">
                💥
              </div>
            </motion.div>

            {/* 3. Victim Piece: Pauses while attacker approaches, then kicked flying off the board */}
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
                opacity: 1,
              }}
              animate={{
                x: [0, 0, activeKick.flyX * 0.45, activeKick.flyX * 1.35],
                y: [0, 0, activeKick.flyY * 0.45, activeKick.flyY * 1.35],
                rotate: [0, 0, 240, 540],
                scale: [1, 1, 1.35, 0],
                opacity: [1, 1, 1, 0]
              }}
              transition={{
                duration: 0.88,
                times: [0, 0.43, 0.72, 1],
                ease: "easeOut"
              }}
              className="flex items-center justify-center p-1"
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

                let squareBg = isDark ? 'bg-[#C4CDC1]' : 'bg-[#F2EDE7]'; // pastel sage & soft cream

                if (isLastMoveSrc || isLastMoveDst) {
                  squareBg = isDark ? 'bg-[#B0BBAE]' : 'bg-[#EAE4DC]'; // highlighted path in Natural Tones
                }

                return (
                  <button
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
                    className={`relative w-full h-full flex items-center justify-center transition-all duration-300 select-none focus:outline-none ${squareBg} ${
                      isSelected ? 'ring-4 ring-[#EBD99F] ring-inset bg-[#EBD99F]/30' : ''
                    } ${isCheck ? 'ring-4 ring-[#FFADAD] ring-inset animate-pulse bg-[#FFADAD]/30' : ''}`}
                  >
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
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

