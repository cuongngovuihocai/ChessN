import { Chess, Square, PieceSymbol } from 'chess.js';
import { getWhiteBestMoves, getPlayerBestMoves, getGameStage } from './chessAI';

export interface TacticalExplanation {
  moveSan: string;
  stage: 'khai_cuoc' | 'trung_cuoc' | 'tan_cuoc';
  stageName: string;
  summary: string;
  strategicBenefits: string[];
  coachingTip: string;
}

export interface StrategicHintResult {
  stage: 'khai_cuoc' | 'trung_cuoc' | 'tan_cuoc';
  stageTitle: string;
  stageStrategy: string;
  recommendedMoves: {
    san: string;
    explanation: string;
  }[];
  masterAdvice: string;
}

const PIECE_NAMES_VI: Record<string, string> = {
  p: 'Tốt',
  n: 'Mã',
  b: 'Tượng',
  r: 'Xe',
  q: 'Hậu',
  k: 'Vua'
};

const PIECE_ICONS: Record<string, string> = {
  p: '♟️',
  n: '🐴',
  b: '📐',
  r: '🏰',
  q: '👸',
  k: '♔'
};

const CENTER_SQUARES = ['d4', 'e4', 'd5', 'e5'];
const EXTENDED_CENTER = ['c3', 'd3', 'e3', 'f3', 'c4', 'f4', 'c5', 'f5', 'c6', 'd6', 'e6', 'f6'];

/**
 * Returns human friendly Vietnamese piece name
 */
export function getPieceNameVi(symbol: string): string {
  const lower = symbol.toLowerCase();
  return PIECE_NAMES_VI[lower] || symbol;
}

/**
 * Converts Chess SAN (like Nc3, e4, Bxe4, O-O) into easy-to-understand Vietnamese description
 */
export interface FriendlyMoveInfo {
  actionText: string;
  icon: string;
  notationDetail: string;
  combinedText: string;
}

/**
 * Converts Chess SAN (like Nc3, e4, Bxe4, O-O) into easy-to-understand Vietnamese description with notation breakdown
 */
export function formatFriendlyMoveText(chess: Chess, moveSan: string): FriendlyMoveInfo {
  if (moveSan === 'O-O') {
    return {
      actionText: 'Nhập thành gần',
      icon: '🛡️',
      notationDetail: 'kí hiệu là `O-O`, di chuyển Vua sang góc phải an toàn',
      combinedText: '**Nhập thành gần** *(kí hiệu là `O-O`, giấu Vua vào góc an toàn)*'
    };
  }
  if (moveSan === 'O-O-O') {
    return {
      actionText: 'Nhập thành xa',
      icon: '🛡️',
      notationDetail: 'kí hiệu là `O-O-O`, di chuyển Vua sang góc trái an toàn',
      combinedText: '**Nhập thành xa** *(kí hiệu là `O-O-O`, giấu Vua vào góc an toàn)*'
    };
  }

  const moves = chess.moves({ verbose: true });
  const moveObj = moves.find(m => m.san === moveSan);

  if (!moveObj) {
    return {
      actionText: `Di chuyển quân cờ đến ô ${moveSan}`,
      icon: '♟️',
      notationDetail: `kí hiệu là \`${moveSan}\``,
      combinedText: `**Di chuyển quân cờ** *(kí hiệu là \`${moveSan}\`)*`
    };
  }

  const pieceName = getPieceNameVi(moveObj.piece);
  const icon = PIECE_ICONS[moveObj.piece.toLowerCase()] || '♟️';
  const toSq = moveObj.to;
  const isCapture = !!moveObj.captured;
  const isCheck = moveSan.includes('+');

  let actionText = '';
  const notationParts: string[] = [];

  if (moveObj.piece !== 'p') {
    notationParts.push(`**${moveObj.piece.toUpperCase()}** chỉ quân ${pieceName}`);
  }

  if (isCapture) {
    const capturedName = getPieceNameVi(moveObj.captured || 'p');
    actionText = `${pieceName} ăn quân ${capturedName} ở ô ${toSq}`;
    notationParts.push(`**x** là ăn quân`);
  } else {
    switch (moveObj.piece) {
      case 'p':
        actionText = `Tốt tiến lên ô ${toSq}`;
        break;
      case 'n':
        actionText = `Mã nhảy lên ô ${toSq}`;
        break;
      case 'b':
        actionText = `Tượng di chuyển ra ô ${toSq}`;
        break;
      case 'r':
        actionText = `Xe di chuyển ra ô ${toSq}`;
        break;
      case 'q':
        actionText = `Hậu tiến ra ô ${toSq}`;
        break;
      case 'k':
        actionText = `Vua di chuyển sang ô ${toSq}`;
        break;
      default:
        actionText = `${pieceName} di chuyển ra ô ${toSq}`;
        break;
    }
  }

  notationParts.push(`**${toSq}** là ô cần đến`);

  if (isCheck) {
    notationParts.push(`dấu **+** là chiếu Vua`);
  }

  const notationDetail = `kí hiệu là \`${moveSan}\`, với ${notationParts.join(', ')}`;
  const combinedText = `**${actionText}** *(kí hiệu là \`${moveSan}\`, với ${notationParts.join(', ')})*`;

  return {
    actionText,
    icon,
    notationDetail,
    combinedText
  };
}

/**
 * Analyzes position and returns comprehensive strategic advice for the current game stage
 */
export function getStrategicHint(fen: string, playerName: string = 'bé', playerColor: 'w' | 'b' = 'w'): StrategicHintResult {
  const chess = new Chess(fen);
  const stage = getGameStage(fen);
  const bestMoves = getPlayerBestMoves(fen, playerColor);

  let stageTitle = '';
  let stageStrategy = '';
  let masterAdvice = '';

  if (stage === 'khai_cuoc') {
    stageTitle = '🌱 Giai đoạn Khai Cuộc';
    stageStrategy = 'Tập trung chiếm giữ khu vực trung tâm bàn cờ, phát triển quân Mã & Tượng, và Nhập thành sớm để bảo vệ Vua!';
    masterAdvice = 'Ghi nhớ bí kíp Khai cuộc: "Mã trước Tượng sau - Chiếm giữ trung tâm - Nhập thành ẩn Vua"! Đừng vội dâng Hậu ra sớm kẻo bị đối phương tấn công.';
  } else if (stage === 'trung_cuoc') {
    stageTitle = '⚔️ Giai đoạn Trung Cuộc';
    stageStrategy = 'Điều động lực lượng phối hợp tấn công, chiếm các cột mở cho Xe, và tìm cơ hội thực hiện các đòn chiến thuật (chiếu, đòn đôi, giằng quân).';
    masterAdvice = 'Mẹo Trung cuộc: Đưa Xe ra cột trống, dùng Tượng kiểm soát đường chéo dài và tìm cách ăn hơn quân hoặc chiếu ép Vua đối phương!';
  } else {
    stageTitle = '👑 Giai đoạn Tàn Cuộc';
    stageStrategy = 'Hợp lực cùng Vua tiến ra trung tâm, hỗ trợ dâng Tốt thông lên hàng cuối để Phong Hậu và ép Vua địch vào góc chiếu hết!';
    masterAdvice = 'Bí kíp Tàn cuộc: Trong tàn cuộc, Vua là dũng sĩ dũng cảm! Hãy đưa Vua lên trung tâm mở đường cho Tốt tiến lên biến thành Hậu!';
  }

  const recommendedMoves = bestMoves.map((san) => {
    const explanation = generateMoveReasoning(chess, san, stage);
    return { san, explanation };
  });

  return {
    stage,
    stageTitle,
    stageStrategy,
    recommendedMoves,
    masterAdvice
  };
}

/**
 * Explains why a specific move is good based on chess principles
 */
function generateMoveReasoning(chess: Chess, moveSan: string, stage: 'khai_cuoc' | 'trung_cuoc' | 'tan_cuoc'): string {
  const moves = chess.moves({ verbose: true });
  const moveObj = moves.find(m => m.san === moveSan);

  if (!moveObj) {
    return `Nước đi ${moveSan} giúp củng cố thế cờ và kiểm soát vị trí quan trọng.`;
  }

  const pieceName = getPieceNameVi(moveObj.piece);
  const toSq = moveObj.to;
  const isCapture = !!moveObj.captured;
  const isCheck = moveSan.includes('+');
  const isMate = moveSan.includes('#');
  const isCastle = moveSan === 'O-O' || moveSan === 'O-O-O';
  const isCenter = CENTER_SQUARES.includes(toSq);
  const isExtCenter = EXTENDED_CENTER.includes(toSq);

  const benefits: string[] = [];

  if (isMate) {
    return `Nước đi chiếu hết tuyệt vời! Kết thúc ván đấu và mang về chiến thắng! 🎉`;
  }

  if (isCastle) {
    return `Nhập thành giấu Vua vào góc an toàn và kết nối 2 quân Xe sẵn sàng tham chiến! 🛡️`;
  }

  if (isCapture) {
    const capturedName = getPieceNameVi(moveObj.captured || 'p');
    benefits.push(`Ăn được quân ${capturedName} của đối thủ để tích lũy lợi thế về quân số.`);
  }

  if (isCheck) {
    benefits.push(`Chiếu Vua đối phương, buộc đối thủ phải xử lý nguy hiểm!`);
  }

  if (stage === 'khai_cuoc') {
    if (moveObj.piece === 'p' && isCenter) {
      benefits.push(`Đẩy Tốt chiếm giữ trung tâm bàn cờ (${toSq}), mở đường cho Tượng và Hậu phát triển!`);
    } else if ((moveObj.piece === 'n' || moveObj.piece === 'b') && (isCenter || isExtCenter)) {
      benefits.push(`Phát triển quân ${pieceName} ra vị trí ${toSq} tích cực, kiểm soát khu vực trung tâm.`);
    } else {
      benefits.push(`Nước đi ${pieceName} giúp dàn quân hợp lý, chuẩn bị cho các đòn tấn công tiếp theo.`);
    }
  } else if (stage === 'trung_cuoc') {
    if (moveObj.piece === 'r') {
      benefits.push(`Đưa Xe ra vị trí ${toSq} kiểm soát cột quan trọng, tăng áp lực lên đồn địch.`);
    } else if (moveObj.piece === 'q') {
      benefits.push(`Điều động Hậu (${toSq}) gia tăng sức mạnh tấn công liên hoàn.`);
    } else {
      benefits.push(`Củng cố đội hình, kiểm soát ô ${toSq} và gây sức ép lên các quân cờ của đối thủ.`);
    }
  } else {
    // Endgame
    if (moveObj.piece === 'k') {
      benefits.push(`Đưa Vua ra trung tâm (${toSq}) làm lá chắn hỗ trợ các quân cờ và Tốt phong Hậu!`);
    } else if (moveObj.piece === 'p') {
      benefits.push(`Dâng Tốt thông tiến nhanh về hàng cuối để Phong Hậu!`);
    } else {
      benefits.push(`Thắt chặt vòng vây xung quanh Vua đối phương để chuẩn bị chiếu hết.`);
    }
  }

  return benefits.join(' ');
}

/**
 * Explains an opponent move in detail from the perspective of the opponent piece itself
 */
export function explainMoveTactics(
  fen: string,
  moveData: { san?: string; pieceName?: string; color?: string; from?: string; to?: string; isCapture?: boolean },
  playerName: string = 'bé'
): { text: string; characterName: string; pieceName: string; color: string } {
  const chess = new Chess(fen);

  const san = moveData.san || '';
  const pieceType = (moveData.pieceName || 'p').toLowerCase();
  const pieceColor = moveData.color || 'b';

  const pieceVi = getPieceNameVi(pieceType);
  const colorVi = pieceColor === 'w' ? 'Trắng' : 'Đen';
  const characterName = `${pieceVi} ${colorVi}`;

  const toSq = moveData.to || san.replace(/[^a-h1-8]/g, '') || '';
  const friendlyMove = formatFriendlyMoveText(chess, san);

  const benefits: string[] = [];

  if (moveData.isCapture) {
    benefits.push(`Ăn quân cờ của bé ở ô **${toSq}** để gia tăng sức mạnh cho phe Đen.`);
  }

  if (CENTER_SQUARES.includes(toSq)) {
    benefits.push(`Tiến vào & kiểm soát ô trung tâm **${toSq}**, mở rộng không gian hoạt động.`);
  } else if (EXTENDED_CENTER.includes(toSq)) {
    benefits.push(`Kiểm soát ô chiến lược **${toSq}** trên bàn cờ.`);
  }

  if (san.includes('+')) {
    benefits.push(`Tung đòn **chiếu Vua**, buộc bé phải lo phòng thủ!`);
  }

  if (benefits.length === 0) {
    benefits.push(`Mở rộng thế cờ, di chuyển đến vị trí tích cực hơn để chuẩn bị tấn công.`);
  }

  const text = `Ta là **${characterName}**, ta vừa di chuyển: ${friendlyMove.combinedText}.\n\n✨ **Mục đích nước đi của ta:**\n${benefits.map(b => '• ' + b).join('\n')}\n\n💡 *Bé ${playerName} hãy cẩn thận quan sát và chọn nước đi hay nhất để đáp trả ta nhé!*`;

  return {
    text,
    characterName,
    pieceName: pieceType,
    color: pieceColor
  };
}

/**
 * Intelligent Rule-Based Q&A for Coach Chat (Instant, reliable, standard Vietnamese)
 */
export function answerCoachQuestion(
  userText: string,
  fen: string,
  playerName: string = 'bé'
): string {
  const text = userText.toLowerCase().trim();
  const chess = new Chess(fen);
  const stage = getGameStage(fen);
  const bestMoves = getWhiteBestMoves(fen);
  const bestMove = bestMoves.length > 0 ? bestMoves[0] : null;

  const legalMoves = chess.moves({ verbose: true });

  // 1. Hỏi về quân Tốt
  if (text.includes('tốt') || text.includes('quân tốt') || text.includes('dâng tốt') || text.includes('đẩy tốt') || text.includes('lên tốt')) {
    const pawnMoves = legalMoves.filter(m => m.piece === 'p');
    const recommendedPawn = legalMoves.find(m => m.piece === 'p' && (m.to === 'e4' || m.to === 'd4' || m.to === 'e5' || m.to === 'd5' || m.captured)) || pawnMoves[0];

    if (recommendedPawn) {
      const friendlyMove = formatFriendlyMoveText(chess, recommendedPawn.san);
      return `♟️ **Mẹo di chuyển quân Tốt cho ${playerName}:**\n\nNước Tốt Sư phụ khuyên con đi lúc này: ${friendlyMove.combinedText}.\n\n💡 **Tác dụng chiến thuật:** Dâng Tốt chiếm giữ khu vực trung tâm bàn cờ, mở đường cho Tượng và Hậu tiến ra làm chủ trận đấu!`;
    } else {
      return `♟️ **Mẹo dùng quân Tốt:**\n- Tốt đi thẳng (nước đầu đi 2 ô, các nước sau đi 1 ô) và **ăn chéo 1 ô**.\n- Ở Khai cuộc, hãy dâng các Tốt trung tâm (e4, d4) để mở đường cho quân nhẹ. Khi Tốt tiến tới hàng cuối cùng sẽ được **Phong Hậu** siêu mạnh!`;
    }
  }

  // 2. Hỏi về quân Mã
  if (text.includes('mã') || text.includes('quân mã') || text.includes('nhảy mã')) {
    const knightMoves = legalMoves.filter(m => m.piece === 'n');
    const recommendedKnight = legalMoves.find(m => m.piece === 'n' && (m.to === 'f3' || m.to === 'c3' || m.to === 'f6' || m.to === 'c6' || m.captured)) || knightMoves[0];

    if (recommendedKnight) {
      const friendlyMove = formatFriendlyMoveText(chess, recommendedKnight.san);
      return `🐴 **Mẹo di chuyển quân Mã cho ${playerName}:**\n\nNước Mã Sư phụ khuyên con đi lúc này: ${friendlyMove.combinedText}.\n\n💡 **Tác dụng chiến thuật:** Đưa Mã ra ô tích cực, kiểm soát khu vực trung tâm và sẵn sàng hỗ trợ các quân khác!`;
    } else {
      return `🐴 **Mẹo dùng quân Mã:** Mã nhảy theo hình chữ L và là quân duy nhất có thể **nhảy qua đầu quân khác**! Hãy đưa Mã lên các ô trung tâm (c3, f3, c6, f6) để kiểm soát tối đa không gian bàn cờ.`;
    }
  }

  // 3. Hỏi về quân Tượng
  if (text.includes('tượng') || text.includes('quân tượng')) {
    const bishopMoves = legalMoves.filter(m => m.piece === 'b');
    const recommendedBishop = legalMoves.find(m => m.piece === 'b' && (m.to === 'c4' || m.to === 'b5' || m.to === 'e2' || m.to === 'd3' || m.captured)) || bishopMoves[0];

    if (recommendedBishop) {
      const friendlyMove = formatFriendlyMoveText(chess, recommendedBishop.san);
      return `📐 **Mẹo di chuyển quân Tượng cho ${playerName}:**\n\nNước Tượng Sư phụ khuyên con đi lúc này: ${friendlyMove.combinedText}.\n\n💡 **Tác dụng chiến thuật:** Đưa Tượng ra đường chéo mở để nhắm thẳng vào các mục tiêu yếu của đối phương!`;
    } else {
      return `📐 **Mẹo dùng quân Tượng:** Tượng đi chéo không giới hạn ô. Hãy giữ các đường chéo dài thông thoáng để Tượng ngắm bắn từ xa cực kỳ nguy hiểm!`;
    }
  }

  // 4. Hỏi về quân Xe
  if (text.includes('xe') || text.includes('quân xe')) {
    const rookMoves = legalMoves.filter(m => m.piece === 'r');
    if (rookMoves.length > 0) {
      const friendlyMove = formatFriendlyMoveText(chess, rookMoves[0].san);
      return `🏰 **Mẹo di chuyển quân Xe cho ${playerName}:**\n\nNước Xe Sư phụ khuyên con đi lúc này: ${friendlyMove.combinedText}.\n\n💡 **Tác dụng chiến thuật:** Đưa Xe ra cột mở để kiểm soát toàn bộ hàng dọc trên bàn cờ!`;
    } else {
      return `🏰 **Mẹo dùng quân Xe:** Xe đi ngang và dọc rất mạnh. Ở Khai cuộc, hãy Nhập thành giấu Vua để đưa Xe ra các cột trống càn quét đối phương!`;
    }
  }

  // 5. Hỏi về quân Hậu
  if (text.includes('hậu') || text.includes('quân hậu')) {
    const queenMoves = legalMoves.filter(m => m.piece === 'q');
    if (queenMoves.length > 0) {
      const friendlyMove = formatFriendlyMoveText(chess, queenMoves[0].san);
      return `👸 **Mẹo di chuyển quân Hậu cho ${playerName}:**\n\nNước Hậu gợi ý cho con: ${friendlyMove.combinedText}.\n\n💡 **Tác dụng chiến thuật:** Hậu có tầm hoạt động rất rộng, tuy nhiên hãy cẩn thận tránh ra Hậu quá sớm ở Khai cuộc kẻo bị quân nhỏ đối phương đuổi bắt nhé!`;
    } else {
      return `👸 **Mẹo dùng quân Hậu:** Hậu là quân mạnh nhất (kết hợp Xe + Tượng). Đợi các quân nhẹ (Mã, Tượng) ra trước rồi hãy đưa Hậu ra xông trận!`;
    }
  }

  // 6. Hỏi về Vua / Nhập thành
  if (text.includes('vua') || text.includes('nhập thành')) {
    const castleMove = legalMoves.find(m => m.san === 'O-O' || m.san === 'O-O-O');
    if (castleMove) {
      const friendlyMove = formatFriendlyMoveText(chess, castleMove.san);
      return `♔ **An toàn cho Vua:** Sư phụ khuyên con hãy **${friendlyMove.combinedText}** ngay lúc này để đưa Vua vào chỗ an toàn và đưa Xe ra tham chiến!`;
    } else {
      return `♔ **Bảo vệ Vua:** Ở Khai cuộc & Trung cuộc, hãy giấu Vua bằng **Nhập thành**. Ở Tàn cuộc, đưa Vua ra trung tâm xông trận!`;
    }
  }

  // 7. Hỏi về Khai cuộc
  if (text.includes('khai cuộc') || text.includes('đầu trận') || text.includes('bắt đầu')) {
    return `🌱 **Chiến lược Khai Cuộc cho ${playerName}:**\n1. **Chiếm trung tâm:** Nhích các Tốt e4, d4 để mở đường cho Tượng và Hậu.\n2. **Phát triển quân nhẹ:** Đưa Mã (Nf3, Nc3) và Tượng (Bc4, Bb5) ra vị trí tích cực.\n3. **Nhập thành sớm:** Giấu Vua vào góc an toàn và đưa Xe ra nghênh chiến.\n❌ *Tránh di chuyển 1 quân nhiều lần hoặc dâng Hậu quá sớm!*`;
  }

  // 8. Hỏi về Trung cuộc
  if (text.includes('trung cuộc') || text.includes('giữa trận') || text.includes('tấn công')) {
    return `⚔️ **Chiến lược Trung Cuộc cho ${playerName}:**\n1. **Chiếm cột mở:** Đưa các quân Xe ra các cột trống không có Tốt cản.\n2. **Sử dụng đòn chiến thuật:**\n   - *Đòn đôi (Fork):* Dùng Mã hoặc Tượng tấn công 2 quân cùng lúc.\n   - *Giằng quân (Pin):* Khống chế quân địch không thể di chuyển.\n3. **Tập trung hỏa lực:** Phối hợp Hậu + Xe + Tượng vào cánh Vua đối phương!`;
  }

  // 9. Hỏi về Tàn cuộc
  if (text.includes('tàn cuộc') || text.includes('cuối trận') || text.includes('phong hậu')) {
    return `👑 **Chiến lược Tàn Cuộc cho ${playerName}:**\n1. **Vua xông trận:** Đưa Vua ra trung tâm bàn cờ làm dũng sĩ hỗ trợ tấn công!\n2. **Đẩy Tốt thông:** Đẩy Tốt tiến xuống hàng cuối cùng để biến thành Hậu mạnh nhất.\n3. **Ép Vua địch:** Dùng Hậu và Xe dồn Vua địch ra mép bàn cờ để chiếu hết!`;
  }

  // 10. Hỏi gợi ý / nước đi nên đi
  if (text.includes('gợi ý') || text.includes('đi nước nào') || text.includes('nên đi') || text.includes('đi đâu') || text.includes('giúp') || text.includes('mẹo')) {
    if (bestMove) {
      const friendlyMove = formatFriendlyMoveText(chess, bestMove);
      const reasoning = generateMoveReasoning(chess, bestMove, stage);
      const stageNameVi = stage === 'khai_cuoc' ? 'Khai cuộc' : stage === 'trung_cuoc' ? 'Trung cuộc' : 'Tàn cuộc';
      return `Nước đi Sư phụ khuyên con: ${friendlyMove.combinedText}.\n\n💡 **Tác dụng chiến thuật:** ${reasoning}\n\n🌱 *Mẹo ${stageNameVi}: Hãy đi đúng nguyên tắc chiến thuật và tự tin thi đấu nhé!*`;
    } else {
      return `Nước đi hiện tại rất kịch tính! Con hãy kiểm tra xem có quân nào của mình đang bị đe dọa không nhé!`;
    }
  }

  // 11. Hỏi về chiếu hết / cách thắng
  if (text.includes('thắng') || text.includes('chiếu hết') || text.includes('chiếu vua')) {
    return `🏆 **Làm sao để Chiếu Hết và Giành Chiến Thắng?**\n- Chiếu hết là khi Vua đối phương bị chiếu mà **không thể chạy, không thể đỡ, và không thể ăn** quân đang chiếu.\n- **Mẹo đơn giản:** Dùng Hậu + Xe ép Vua đối phương lùi dần ra mép bàn cờ (hàng 8 hoặc cột h/a) rồi tung đòn quyết định!`;
  }

  // 12. General contextual answer incorporating board analysis
  if (bestMove) {
    const friendlyMove = formatFriendlyMoveText(chess, bestMove);
    const reasoning = generateMoveReasoning(chess, bestMove, stage);
    const stageNameVi = stage === 'khai_cuoc' ? 'Khai cuộc' : stage === 'trung_cuoc' ? 'Trung cuộc' : 'Tàn cuộc';
    return `Trận đấu đang ở giai đoạn **${stageNameVi}**.\n\nNước đi Sư phụ khuyên con: ${friendlyMove.combinedText}.\n\n💡 **Tác dụng chiến thuật:** ${reasoning}`;
  }

  return `Sư phụ Thỏ luôn ở đây đồng hành cùng ${playerName}! Con cứ tự tin đi nước cờ của mình nhé! Con cũng có thể đặt câu hỏi trực tiếp với ta ở ô chat bên dưới. 🐰✨`;
}
