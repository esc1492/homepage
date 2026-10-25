/**
 * 스도쿠 순수 로직.
 *
 * sudoku.com 분석에서 가져온 것: 보드는 81자 문자열('0' = 빈칸), 셀은 `{val, editable}`,
 * 메모는 셀마다 9칸(숫자 또는 비어 있음). sudoku.com 은 퍼즐·정답을 서버에서 받지만
 * 이 게임은 서버가 없으므로 생성과 유일해 보장까지 여기서 합니다.
 *
 * DOM·브라우저 API 를 import 하지 않으므로 `node --test sudoku/core.test.mjs` 로 검증합니다.
 */

export const SIZE = 9;
export const CELLS = 81;

const ALL_DIGITS = 0x1ff; // 1..9 비트

const rowOf = (i) => Math.floor(i / SIZE);
const colOf = (i) => i % SIZE;
const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

const POPCOUNT = new Uint8Array(512);
for (let i = 1; i < 512; i++) POPCOUNT[i] = POPCOUNT[i >> 1] + (i & 1);

const DIGIT_OF_BIT = new Uint8Array(512);
for (let d = 1; d <= SIZE; d++) DIGIT_OF_BIT[1 << (d - 1)] = d;

/** 각 칸의 같은 행·열·3x3 이웃 20칸. (분석: 같은 행/열/박스 셀 수집 함수) */
export const PEERS = (() => {
  const out = [];
  for (let i = 0; i < CELLS; i++) {
    const r = rowOf(i);
    const c = colOf(i);
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    const set = new Set();
    for (let k = 0; k < SIZE; k++) {
      set.add(r * SIZE + k);
      set.add(k * SIZE + c);
    }
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) set.add((br + dr) * SIZE + bc + dc);
    }
    set.delete(i);
    out.push(Object.freeze([...set]));
  }
  return Object.freeze(out);
})();

export const DIFFICULTIES = Object.freeze([
  { key: 'easy', label: '쉬움', clues: 42 },
  { key: 'medium', label: '보통', clues: 36 },
  { key: 'hard', label: '어려움', clues: 32 },
  { key: 'expert', label: '전문가', clues: 29 },
  { key: 'evil', label: '마스터', clues: 26 },
  { key: 'extreme', label: '극한', clues: 24 },
]);

export function difficultySpec(key) {
  return DIFFICULTIES.find((d) => d.key === key) || DIFFICULTIES[0];
}

/** '0'..'9' 81자 문자열 → 숫자 배열(0 = 빈칸). */
export function parseBoard(str) {
  const out = new Int8Array(CELLS);
  const s = String(str ?? '');
  for (let i = 0; i < CELLS; i++) {
    const ch = s.charCodeAt(i) - 48;
    out[i] = ch >= 0 && ch <= 9 ? ch : 0;
  }
  return out;
}

/** 숫자 배열 → 81자 문자열. */
export function boardToString(values) {
  let s = '';
  for (let i = 0; i < CELLS; i++) s += String(values[i] | 0);
  return s;
}

/**
 * Mission 문자열 → 셀 배열. 분석의 `{val, editable}` 형태를 그대로 따릅니다:
 * 원래 0 이던 칸만 사용자가 고칠 수 있습니다.
 */
export function buildCells(mission) {
  const values = parseBoard(mission);
  return Array.from(values, (val) => ({ val, editable: val === 0 }));
}

/** 행·열·3x3 안의 중복 칸 인덱스 집합. 0 은 무시합니다. */
export function findConflicts(values) {
  const bad = new Set();
  const scan = (indices) => {
    const seen = new Map();
    for (const i of indices) {
      const v = values[i];
      if (!v) continue;
      if (seen.has(v)) {
        bad.add(i);
        bad.add(seen.get(v));
      } else {
        seen.set(v, i);
      }
    }
  };
  for (let r = 0; r < SIZE; r++) scan(Array.from({ length: SIZE }, (_, k) => r * SIZE + k));
  for (let c = 0; c < SIZE; c++) scan(Array.from({ length: SIZE }, (_, k) => k * SIZE + c));
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const cells = [];
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) cells.push((br * 3 + dr) * SIZE + bc * 3 + dc);
      }
      scan(cells);
    }
  }
  return bad;
}

/** 와일드카드 없이 81칸이 정답과 일치하는가. */
export function isSolved(values, solution) {
  for (let i = 0; i < CELLS; i++) if (values[i] !== solution[i]) return false;
  return true;
}

/** 초 단위 → MM:SS. */
export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// ── 생성기 ──────────────────────────────────────────────────────────────

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 무작위 완성 격자. MRV(후보가 가장 적은 칸 우선) + 후보 순서 섞기. */
export function generateSolution(rng = Math.random) {
  const grid = new Int8Array(CELLS);
  const rows = new Uint16Array(SIZE);
  const cols = new Uint16Array(SIZE);
  const boxes = new Uint16Array(SIZE);

  const fill = () => {
    let best = -1;
    let bestMask = 0;
    let bestCount = SIZE + 1;
    for (let i = 0; i < CELLS; i++) {
      if (grid[i]) continue;
      const mask = ALL_DIGITS & ~(rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)]);
      const n = POPCOUNT[mask];
      if (n === 0) return false;
      if (n < bestCount) {
        bestCount = n;
        best = i;
        bestMask = mask;
        if (n === 1) break;
      }
    }
    if (best < 0) return true;

    const digits = [];
    for (let m = bestMask; m; m &= m - 1) digits.push(DIGIT_OF_BIT[m & -m]);
    shuffle(digits, rng);

    const r = rowOf(best);
    const c = colOf(best);
    const b = boxOf(best);
    for (const d of digits) {
      const bit = 1 << (d - 1);
      grid[best] = d;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
      if (fill()) return true;
      grid[best] = 0;
      rows[r] ^= bit;
      cols[c] ^= bit;
      boxes[b] ^= bit;
    }
    return false;
  };

  fill();
  return grid;
}

/**
 * 해의 개수를 limit 까지만 셉니다(유일해 판정은 limit=2).
 * 0 = 모순, 1 = 유일, 2 = 복수.
 */
export function countSolutions(values, limit = 2) {
  const grid = Int8Array.from(values);
  const rows = new Uint16Array(SIZE);
  const cols = new Uint16Array(SIZE);
  const boxes = new Uint16Array(SIZE);
  for (let i = 0; i < CELLS; i++) {
    const v = grid[i];
    if (!v) continue;
    const bit = 1 << (v - 1);
    const r = rowOf(i);
    const c = colOf(i);
    const b = boxOf(i);
    if (rows[r] & bit || cols[c] & bit || boxes[b] & bit) return 0;
    rows[r] |= bit;
    cols[c] |= bit;
    boxes[b] |= bit;
  }

  let count = 0;
  const walk = () => {
    let best = -1;
    let bestMask = 0;
    let bestCount = SIZE + 1;
    for (let i = 0; i < CELLS; i++) {
      if (grid[i]) continue;
      const mask = ALL_DIGITS & ~(rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)]);
      const n = POPCOUNT[mask];
      if (n === 0) return;
      if (n < bestCount) {
        bestCount = n;
        best = i;
        bestMask = mask;
        if (n === 1) break;
      }
    }
    if (best < 0) {
      count++;
      return;
    }
    const r = rowOf(best);
    const c = colOf(best);
    const b = boxOf(best);
    for (let m = bestMask; m; m &= m - 1) {
      const bit = m & -m;
      grid[best] = DIGIT_OF_BIT[bit];
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
      walk();
      grid[best] = 0;
      rows[r] ^= bit;
      cols[c] ^= bit;
      boxes[b] ^= bit;
      if (count >= limit) return;
    }
  };

  walk();
  return count;
}

function carve(solution, targetClues, rng) {
  const puzzle = Int8Array.from(solution);
  const order = shuffle(Array.from({ length: CELLS }, (_, i) => i), rng);
  let clues = CELLS;
  for (const i of order) {
    if (clues <= targetClues) break;
    const backup = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) === 1) clues--;
    else puzzle[i] = backup;
  }
  return puzzle;
}

function countClues(values) {
  let n = 0;
  for (let i = 0; i < CELLS; i++) if (values[i]) n++;
  return n;
}

/**
 * 퍼즐 생성. 유일해가 보장되지 않는 제거는 되돌리므로, 결과 퍼즐은 항상 해가 하나입니다.
 * 목표 빈칸 수에 도달하지 못하면 도달한 것 중 가장 어려운(빈칸이 많은) 시도를 씁니다.
 */
export function generatePuzzle({ difficulty = 'easy', rng = Math.random, maxAttempts = 4 } = {}) {
  const spec = difficultySpec(difficulty);
  let best = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solution = generateSolution(rng);
    const puzzle = carve(solution, spec.clues, rng);
    const clues = countClues(puzzle);
    if (!best || clues < best.clues) best = { puzzle, solution, clues };
    if (clues <= spec.clues) break;
  }
  return {
    difficulty: spec.key,
    puzzle: boardToString(best.puzzle),
    solution: boardToString(best.solution),
    clues: best.clues,
  };
}
