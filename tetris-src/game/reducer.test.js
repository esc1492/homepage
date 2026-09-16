import test from 'node:test';
import assert from 'node:assert/strict';

import { COLS, ROWS, speedForLevel } from './constants.js';
import {
  createBoard,
  createInitialState,
  fits,
  randomPiece,
  reduce,
  rotateMatrix,
} from './reducer.js';

/** rng 헬퍼 — 항상 같은 값을 돌려주어 결과를 결정적으로 만듭니다. */
const always = (v) => () => v;

/** rng() = 0 → id 1 (I), rng() = 0.99 → id 7 (Z) */
const I_PIECE = always(0);
const Z_PIECE = always(0.99);

function stateWith(overrides = {}) {
  return { ...createInitialState(), status: 'playing', ...overrides };
}

/** 지정한 행들의 1..COLS-1 열을 채웁니다 (0열은 비워 둠). */
function fillRows(board, rows, value = 1) {
  for (const r of rows) {
    for (let c = 1; c < COLS; c++) board[r][c] = value;
  }
  return board;
}

test('randomPiece: 0 을 포함한 어떤 rng 값에서도 1..7 만 반환한다', () => {
  // 원본의 Math.ceil(Math.random()*7) 은 rng()===0 일 때 id 0 → SHAPES[0]=[] 로 크래시했습니다.
  for (const v of [0, 0.001, 0.14, 0.5, 0.857, 0.99, 0.999999]) {
    const piece = randomPiece(always(v));
    assert.ok(
      piece.id >= 1 && piece.id <= 7,
      `rng=${v} 에서 id=${piece.id} 가 범위를 벗어났습니다`,
    );
    assert.ok(Array.isArray(piece.m) && piece.m.length > 0);
  }
});

test('randomPiece: 모양 배열을 복사해서 원본 SHAPES 를 오염시키지 않는다', () => {
  const a = randomPiece(I_PIECE);
  a.m[0][0] = 99;
  const b = randomPiece(I_PIECE);
  assert.equal(b.m[0][0], 1);
});

test('randomPiece: x 는 보드 중앙에 맞춰진다', () => {
  // I (4칸): floor(10/2) - floor(4/2) = 5 - 2 = 3
  assert.equal(randomPiece(I_PIECE).x, 3);
  // Z (3칸): 5 - 1 = 4
  assert.equal(randomPiece(Z_PIECE).x, 4);
});

test('rotateMatrix: T 조각을 90도 회전한다', () => {
  assert.deepEqual(
    rotateMatrix([
      [0, 3, 0],
      [3, 3, 3],
    ]),
    [
      [3, 0],
      [3, 3],
      [3, 0],
    ],
  );
});

test('fits: 좌우/바닥 경계를 벗어나면 false', () => {
  const board = createBoard();
  const piece = { id: 1, m: [[1]], x: 0, y: 0 };

  assert.equal(fits(board, piece, -1, 0), false, '왼쪽 벽');
  assert.equal(fits(board, { ...piece, x: COLS - 1 }, 1, 0), false, '오른쪽 벽');
  assert.equal(fits(board, { ...piece, y: ROWS - 1 }, 0, 1), false, '바닥');
  assert.equal(fits(board, piece, 0, 0), true, '제자리');
});

test('fits: 이미 채워진 칸과 겹치면 false', () => {
  const board = createBoard();
  board[5][5] = 3;
  const piece = { id: 1, m: [[1]], x: 5, y: 4 };
  assert.equal(fits(board, piece, 0, 1), false);
});

test('start: 빈 보드와 재생 상태, piece/next 를 준비한다', () => {
  const s = reduce(createInitialState(), { type: 'start', rng: I_PIECE });

  assert.equal(s.status, 'playing');
  assert.equal(s.score, 0);
  assert.equal(s.level, 1);
  assert.equal(s.lines, 0);
  assert.equal(s.locks, 0);
  assert.ok(s.piece && s.next);
  assert.equal(
    s.board.flat().every((v) => v === 0),
    true,
  );
});

test('move: 벽에 닿으면 더 이상 움직이지 않는다', () => {
  const piece = { id: 1, m: [[1]], x: 0, y: 0 };
  let s = stateWith({ piece, next: randomPiece(I_PIECE) });

  s = reduce(s, { type: 'move', dx: -1 });
  assert.equal(s.piece.x, 0, '왼쪽 끝에서 고정');

  s = { ...s, piece: { ...s.piece, x: COLS - 1 } };
  s = reduce(s, { type: 'move', dx: 1 });
  assert.equal(s.piece.x, COLS - 1, '오른쪽 끝에서 고정');
});

test('drop: 빈 공간이 있으면 한 칸 내려간다', () => {
  const piece = { id: 1, m: [[1]], x: 0, y: 0 };
  const s = stateWith({ piece, next: randomPiece(I_PIECE) });
  const next = reduce(s, { type: 'drop', rng: I_PIECE });

  assert.equal(next.piece.y, 1);
  assert.equal(next.locks, 0, '고정되지 않았으므로 locks 은 그대로');
});

test('drop: 바닥에 닿으면 보드에 고정하고 locks 를 올린다', () => {
  const piece = { id: 1, m: [[1]], x: 0, y: ROWS - 1 };
  const s = stateWith({ piece, next: randomPiece(I_PIECE) });
  const next = reduce(s, { type: 'drop', rng: I_PIECE });

  assert.equal(next.board[ROWS - 1][0], 1);
  assert.equal(next.locks, 1);
  assert.notEqual(next.piece, piece, '다음 피스로 교체됨');
});

test('hardDrop: 바닥까지 내린 뒤 즉시 고정한다', () => {
  const piece = { id: 1, m: [[1]], x: 2, y: 0 };
  const s = stateWith({ piece, next: randomPiece(I_PIECE) });
  const next = reduce(s, { type: 'hardDrop', rng: I_PIECE });

  assert.equal(next.board[ROWS - 1][2], 1);
  assert.equal(next.locks, 1);
});

test('줄 삭제: 1줄 → 100점, 레벨은 그대로', () => {
  const board = fillRows(createBoard(), [ROWS - 1]);
  const s = stateWith({
    board,
    piece: { id: 1, m: [[1]], x: 0, y: ROWS - 1 },
    next: randomPiece(I_PIECE),
  });
  const next = reduce(s, { type: 'drop', rng: I_PIECE });

  assert.equal(next.score, 100);
  assert.equal(next.lines, 1);
  assert.equal(next.level, 1);
  assert.equal(
    next.board.flat().every((v) => v === 0),
    true,
    '보드가 비워짐',
  );
});

test('줄 삭제: 4줄 동시 삭제 → 800점', () => {
  const rows = [ROWS - 4, ROWS - 3, ROWS - 2, ROWS - 1];
  const board = fillRows(createBoard(), rows);
  const s = stateWith({
    board,
    // 세로로 세운 I 조각이 0열을 4칸 채웁니다
    piece: { id: 1, m: [[1], [1], [1], [1]], x: 0, y: ROWS - 4 },
    next: randomPiece(I_PIECE),
  });
  const next = reduce(s, { type: 'drop', rng: I_PIECE });

  assert.equal(next.score, 800);
  assert.equal(next.lines, 4);
  assert.equal(next.level, 1);
});

test('줄 삭제: 점수는 삭제 전 레벨로 계산된다', () => {
  const board = fillRows(createBoard(), [ROWS - 1]);
  const s = stateWith({
    board,
    level: 3,
    piece: { id: 1, m: [[1]], x: 0, y: ROWS - 1 },
    next: randomPiece(I_PIECE),
  });
  const next = reduce(s, { type: 'drop', rng: I_PIECE });

  assert.equal(next.score, 300, '100 * 레벨3');
});

test('레벨: 10줄마다 1씩 오른다', () => {
  const board = fillRows(createBoard(), [ROWS - 1]);
  const s = stateWith({
    board,
    lines: 9,
    piece: { id: 1, m: [[1]], x: 0, y: ROWS - 1 },
    next: randomPiece(I_PIECE),
  });
  const next = reduce(s, { type: 'drop', rng: I_PIECE });

  assert.equal(next.lines, 10);
  assert.equal(next.level, 2);
});

test('게임오버: 새 피스가 들어갈 자리가 없으면 over', () => {
  const board = createBoard();
  // 다음 피스(O, x=4)가 놓일 자리만 막습니다.
  // 0행을 통째로 채우면 '완성된 줄'로 인식되어 삭제되므로 부분만 채워야 합니다.
  board[0][4] = 1;
  board[0][5] = 1;

  const s = stateWith({
    board,
    piece: { id: 1, m: [[1]], x: 0, y: ROWS - 1 },
    next: { id: 2, m: [[2, 2], [2, 2]], x: 4, y: 0 },
  });
  const next = reduce(s, { type: 'drop', rng: I_PIECE });

  assert.equal(next.status, 'over');
});

test('over 상태에서는 이동/회전/하강이 무시된다', () => {
  const piece = { id: 3, m: [[0, 3, 0], [3, 3, 3]], x: 3, y: 5 };
  const over = stateWith({ status: 'over', piece, next: randomPiece(I_PIECE) });

  assert.equal(reduce(over, { type: 'move', dx: 1 }), over);
  assert.equal(reduce(over, { type: 'rotate' }), over);
  assert.equal(reduce(over, { type: 'drop', rng: I_PIECE }), over);
  assert.equal(reduce(over, { type: 'hardDrop', rng: I_PIECE }), over);
});

test('rotate: 벽에 막히면 한 칸 밀어서 회전한다 (월킥)', () => {
  // J 는 3x2 → 회전하면 2x3 이 됩니다. 오른쪽 끝(x=8)에 두면 회전 폭 3이
  // 벽을 넘어 0킥/우측킥은 실패하고, 좌측으로 한 칸 민 -1 킥만 성공합니다.
  const piece = { id: 4, m: [[4, 0], [4, 0], [4, 4]], x: COLS - 2, y: 5 };
  const s = stateWith({ piece, next: randomPiece(I_PIECE) });
  const next = reduce(s, { type: 'rotate' });

  assert.deepEqual(next.piece.m, [
    [4, 4, 4],
    [4, 0, 0],
  ]);
  assert.equal(next.piece.x, COLS - 3, '왼쪽으로 밀려 들어감');
});

test('rotate: 벽에 붙은 I 조각은 한 칸 킥으로도 빠져나오지 못한다', () => {
  // 폭이 4라 x=9 에서는 -1 킥(x=8)으로도 여전히 넘칩니다 — 원본과 동일한 동작입니다.
  const piece = { id: 1, m: [[1], [1], [1], [1]], x: COLS - 1, y: 5 };
  const s = stateWith({ piece, next: randomPiece(I_PIECE) });

  assert.equal(reduce(s, { type: 'rotate' }), s);
});

test('rotate: 어디에도 들어가지 못하면 상태를 바꾸지 않는다', () => {
  const board = createBoard();
  // 세로 I 조각 주변을 막아 회전 불가능하게 만듭니다.
  const piece = { id: 1, m: [[1], [1], [1], [1]], x: 0, y: ROWS - 4 };
  for (let r = ROWS - 4; r < ROWS; r++) board[r][1] = 2;
  const s = stateWith({ board, piece, next: randomPiece(I_PIECE) });

  assert.equal(reduce(s, { type: 'rotate' }), s);
});

test('speedForLevel: 800ms 에서 시작해 80ms 에서 멈춘다', () => {
  assert.equal(speedForLevel(1), 800);
  assert.equal(speedForLevel(5), 520);
  assert.equal(speedForLevel(11), 100);
  assert.equal(speedForLevel(12), 80, '하한 80ms');
  assert.equal(speedForLevel(99), 80);
});
