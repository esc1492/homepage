// 클래식 지뢰찾기 순수 게임 로직. React 도 DOM 도 import 하지 않습니다 — node --test 로 검증됩니다.
//
// 상태는 불변 스냅샷입니다. reveal / toggleFlag / chord 는 새 게임 객체를 돌려주고,
// 입력이 무효하면 같은 참조를 그대로 돌려줍니다 (컴포넌트가 setState 를 건너뛸 수 있게).

export const DIFFICULTIES = {
  beginner: { rows: 9, cols: 9, mines: 10, label: '초급' },
  intermediate: { rows: 16, cols: 16, mines: 40, label: '중급' },
  expert: { rows: 16, cols: 30, mines: 99, label: '고급' },
};

export function newGame(key = 'beginner') {
  const def = DIFFICULTIES[key] ?? DIFFICULTIES.beginner;
  const total = def.rows * def.cols;
  return {
    key,
    rows: def.rows,
    cols: def.cols,
    mines: def.mines,
    // ready: 첫 클릭 전 (지뢰 미배치) | playing | won | lost
    status: 'ready',
    minePlaced: false,
    exploded: -1,
    revealedSafe: 0,
    flags: 0,
    cells: Array.from({ length: total }, () => ({
      mine: false,
      adjacent: 0,
      revealed: false,
      flagged: false,
      wrong: false,
    })),
  };
}

/** 테스트·디버깅용: 지뢰 위치를 직접 지정해 배치済み 게임을 만듭니다. */
export function makeGameWithMines(rows, cols, mineIndices) {
  const total = rows * cols;
  const game = {
    key: 'custom',
    rows,
    cols,
    mines: mineIndices.length,
    status: 'playing',
    minePlaced: true,
    exploded: -1,
    revealedSafe: 0,
    flags: 0,
    cells: Array.from({ length: total }, () => ({
      mine: false,
      adjacent: 0,
      revealed: false,
      flagged: false,
      wrong: false,
    })),
  };
  for (const i of mineIndices) game.cells[i].mine = true;
  computeAdjacent(game);
  return game;
}

export function neighborsOf(index, rows, cols) {
  const r = Math.floor(index / cols);
  const c = index % cols;
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc);
    }
  }
  return out;
}

function clone(game) {
  return { ...game, cells: game.cells.map((c) => ({ ...c })) };
}

function computeAdjacent(game) {
  const { rows, cols, cells } = game;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].mine) continue;
    let n = 0;
    for (const j of neighborsOf(i, rows, cols)) if (cells[j].mine) n++;
    cells[i].adjacent = n;
  }
}

/**
 * 첫 클릭 안전 보장: safeIndex 와 그 이웃에는 지뢰를 두지 않습니다.
 * 보드가 빽빽해 제외 구역을 다 비울 수 없으면 클릭 칸만 비웁니다.
 */
export function placeMines(game, safeIndex, rng = Math.random) {
  const total = game.rows * game.cols;
  const safeZone = new Set([safeIndex, ...neighborsOf(safeIndex, game.rows, game.cols)]);
  let candidates = [];
  for (let i = 0; i < total; i++) if (!safeZone.has(i)) candidates.push(i);
  if (candidates.length < game.mines) {
    candidates = [];
    for (let i = 0; i < total; i++) if (i !== safeIndex) candidates.push(i);
  }
  // Fisher–Yates (rng 주입 → 테스트 결정성)
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const count = Math.min(game.mines, candidates.length);
  for (let k = 0; k < count; k++) game.cells[candidates[k]].mine = true;
  computeAdjacent(game);
  game.minePlaced = true;
}

/** 0칸 플러드필. 지뢰를 밟으면 true 를 돌려줍니다. */
function floodReveal(game, start) {
  const stack = [start];
  let hitMine = false;
  while (stack.length > 0) {
    const i = stack.pop();
    const cell = game.cells[i];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.mine) {
      hitMine = true;
      continue;
    }
    game.revealedSafe++;
    if (cell.adjacent === 0) {
      for (const j of neighborsOf(i, game.rows, game.cols)) {
        const n = game.cells[j];
        if (!n.revealed && !n.flagged) stack.push(j);
      }
    }
  }
  return hitMine;
}

function applyLoss(next, exploded) {
  next.status = 'lost';
  next.exploded = exploded;
  for (const cell of next.cells) {
    if (cell.mine) cell.revealed = true;
    else if (cell.flagged) cell.wrong = true;
  }
}

function applyWin(next) {
  next.status = 'won';
  let flags = 0;
  for (const cell of next.cells) {
    if (cell.mine && !cell.flagged) cell.flagged = true;
    if (cell.flagged) flags++;
  }
  next.flags = flags;
}

function checkWin(next) {
  if (next.revealedSafe === next.cells.length - next.mines) applyWin(next);
}

/** 좌클릭: 칸 열기. 이미 열린 숫자칸을 누르면 chord 로 위임합니다. */
export function reveal(game, index, rng = Math.random) {
  if (game.status === 'won' || game.status === 'lost') return game;
  const cell = game.cells[index];
  if (!cell || cell.revealed || cell.flagged) return game;
  const next = clone(game);
  if (!next.minePlaced) {
    placeMines(next, index, rng);
    next.status = 'playing';
  }
  if (next.cells[index].mine) {
    next.cells[index].revealed = true;
    applyLoss(next, index);
    return next;
  }
  floodReveal(next, index);
  checkWin(next);
  return next;
}

/** 우클릭·🚩모드: 깃발 토글 */
export function toggleFlag(game, index) {
  if (game.status === 'won' || game.status === 'lost') return game;
  const cell = game.cells[index];
  if (!cell || cell.revealed) return game;
  const next = clone(game);
  next.cells[index].flagged = !next.cells[index].flagged;
  next.flags += next.cells[index].flagged ? 1 : -1;
  return next;
}

/** 열린 숫자칸 클릭: 주변 깃발이 숫자와 일치하면 나머지 이웃을 엽니다. */
export function chord(game, index) {
  if (game.status === 'won' || game.status === 'lost') return game;
  const cell = game.cells[index];
  if (!cell || !cell.revealed || cell.adjacent === 0) return game;
  const around = neighborsOf(index, game.rows, game.cols);
  const flagged = around.filter((j) => game.cells[j].flagged).length;
  if (flagged !== cell.adjacent) return game;
  const targets = around.filter((j) => !game.cells[j].revealed && !game.cells[j].flagged);
  if (targets.length === 0) return game;
  const next = clone(game);
  let hitMine = false;
  for (const t of targets) {
    if (floodReveal(next, t)) hitMine = true;
  }
  if (hitMine) {
    applyLoss(next, targets.find((t) => next.cells[t].mine) ?? index);
    return next;
  }
  checkWin(next);
  return next;
}
