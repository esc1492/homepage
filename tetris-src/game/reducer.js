// 순수 게임 로직. React 를 import 하지 않으므로 그대로 단위 테스트할 수 있습니다.
// 원본 tetris_streamlit.py 의 전역 변수(board/piece/next/score/level/lines/running)와
// place/drop/hardDrop/doRotate/valid/rotate 함수를 상태 + 액션으로 옮긴 것입니다.

import {
  COLS,
  ROWS,
  SHAPES,
  PIECE_KINDS,
  LINE_SCORES,
  LINES_PER_LEVEL,
} from './constants.js';

export function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

/**
 * 난수원을 인자로 받아 결정적 테스트가 가능하도록 했습니다.
 *
 * 원본은 `Math.ceil(Math.random() * 7)` 이었는데, Math.random() 이 정확히 0 을
 * 반환하면 ceil(0) = 0 이 되어 SHAPES[0] = [] 를 참조하고 `m[0].length` 에서
 * TypeError 로 죽습니다(확률은 극히 낮지만 실제 경로). 1..7 을 만드는 아래 식은
 * 그 경계가 없고 분포도 동일합니다.
 */
export function randomPiece(rng = Math.random) {
  const id = 1 + Math.floor(rng() * PIECE_KINDS);
  const m = SHAPES[id].map((row) => [...row]);
  return { id, m, x: Math.floor(COLS / 2) - Math.floor(m[0].length / 2), y: 0 };
}

export function rotateMatrix(m) {
  return m[0].map((_, c) => m.map((row) => row[c]).reverse());
}

/** 원본 valid() — dx/dy 만큼 이동했을 때 놓을 수 있는지 */
export function fits(board, piece, dx = 0, dy = 0, m = piece.m) {
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[r].length; c++) {
      if (!m[r][c]) continue;
      const x = piece.x + c + dx;
      const y = piece.y + r + dy;
      if (x < 0 || x >= COLS || y >= ROWS) return false;
      if (y >= 0 && board[y][x]) return false;
    }
  }
  return true;
}

export function createInitialState() {
  return {
    board: createBoard(),
    piece: null,
    next: null,
    score: 0,
    level: 1,
    lines: 0,
    locks: 0, // 고정 횟수 — 효과음 트리거 판별용 (reducer 에서 사운드를 낼 수 없으므로)
    status: 'idle', // 'idle' | 'playing' | 'over'
  };
}

function startGame(rng) {
  return {
    ...createInitialState(),
    piece: randomPiece(rng),
    next: randomPiece(rng),
    status: 'playing',
  };
}

/** 원본 place() — 피스를 보드에 고정하고, 줄을 지우고, 다음 피스를 꺼냅니다. */
function lockPiece(state, rng) {
  const { piece } = state;
  const board = state.board.map((row) => [...row]);

  piece.m.forEach((row, ri) =>
    row.forEach((v, ci) => {
      if (v && piece.y + ri >= 0) board[piece.y + ri][piece.x + ci] = v;
    }),
  );

  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(0));
      cleared++;
      r++; // 자리가 밀렸으므로 같은 인덱스를 다시 검사
    }
  }

  let { score, level, lines } = state;
  if (cleared) {
    // 점수는 '삭제 전' 레벨로 계산한 뒤 레벨을 갱신합니다 (원본과 동일한 순서).
    score += (LINE_SCORES[cleared] || 0) * level;
    lines += cleared;
    level = Math.floor(lines / LINES_PER_LEVEL) + 1;
  }

  const spawned = state.next;
  const over = !fits(board, spawned);

  return {
    board,
    piece: spawned,
    next: randomPiece(rng),
    score,
    level,
    lines,
    locks: state.locks + 1,
    status: over ? 'over' : 'playing',
  };
}

/** 원본 drop() — 한 칸 내리고, 못 내리면 고정합니다. */
function stepDown(state, rng) {
  if (state.status !== 'playing') return state;
  if (fits(state.board, state.piece, 0, 1)) {
    return { ...state, piece: { ...state.piece, y: state.piece.y + 1 } };
  }
  return lockPiece(state, rng);
}

/** 원본 hardDrop() — 바닥까지 내린 뒤 고정합니다. */
function hardDrop(state, rng) {
  if (state.status !== 'playing') return state;
  let y = state.piece.y;
  while (fits(state.board, { ...state.piece, y }, 0, 1)) y++;
  return lockPiece({ ...state, piece: { ...state.piece, y } }, rng);
}

/** 원본 doRotate() — 벽에 막히면 좌우로 한 칸 밀어봅니다(월킥). */
function rotatePiece(state) {
  if (state.status !== 'playing') return state;
  const m = rotateMatrix(state.piece.m);
  const { piece, board } = state;

  if (fits(board, piece, 0, 0, m)) {
    return { ...state, piece: { ...piece, m } };
  }
  if (fits(board, piece, 1, 0, m)) {
    return { ...state, piece: { ...piece, m, x: piece.x + 1 } };
  }
  if (fits(board, piece, -1, 0, m)) {
    return { ...state, piece: { ...piece, m, x: piece.x - 1 } };
  }
  return state;
}

function movePiece(state, dx) {
  if (state.status !== 'playing') return state;
  if (!fits(state.board, state.piece, dx, 0)) return state;
  return { ...state, piece: { ...state.piece, x: state.piece.x + dx } };
}

/**
 * @param {object} state
 * @param {{type: string, dx?: number, rng?: () => number}} action
 */
export function reduce(state, action) {
  const rng = action.rng ?? Math.random;

  switch (action.type) {
    case 'start':
      return startGame(rng);
    case 'drop':
      return stepDown(state, rng);
    case 'move':
      return movePiece(state, action.dx);
    case 'rotate':
      return rotatePiece(state);
    case 'hardDrop':
      return hardDrop(state, rng);
    default:
      return state;
  }
}
