import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DIFFICULTIES,
  chord,
  makeGameWithMines,
  neighborsOf,
  newGame,
  placeMines,
  reveal,
  toggleFlag,
} from './minesweeper.js';

/** 항상 같은 값을 내는 rng — 셔플 결과를 고정합니다. */
const stubRng = (value = 0) => () => value;

test('난이도 3종은 클래식 규격이다 (9×9·10 / 16×16·40 / 30×16·99)', () => {
  assert.deepEqual(
    [DIFFICULTIES.beginner.rows, DIFFICULTIES.beginner.cols, DIFFICULTIES.beginner.mines],
    [9, 9, 10],
  );
  assert.deepEqual(
    [DIFFICULTIES.intermediate.rows, DIFFICULTIES.intermediate.cols, DIFFICULTIES.intermediate.mines],
    [16, 16, 40],
  );
  assert.deepEqual(
    [DIFFICULTIES.expert.rows, DIFFICULTIES.expert.cols, DIFFICULTIES.expert.mines],
    [16, 30, 99],
  );
});

test('newGame 은 닫힌 빈 보드를 만든다', () => {
  const game = newGame('beginner');
  assert.equal(game.status, 'ready');
  assert.equal(game.minePlaced, false);
  assert.equal(game.cells.length, 81);
  assert.ok(game.cells.every((c) => !c.revealed && !c.flagged && !c.mine));
});

test('첫 클릭은 절대 지뢰가 아니다 (여러 난이도·rng)', () => {
  for (const key of ['beginner', 'intermediate', 'expert']) {
    for (let seed = 0; seed < 20; seed++) {
      const game = newGame(key);
      const idx = (seed * 37) % game.cells.length;
      const next = reveal(game, idx, stubRng(seed / 20));
      assert.equal(next.cells[idx].mine, false, `${key} seed=${seed}`);
      assert.equal(next.minePlaced, true);
      assert.equal(next.status === 'playing' || next.status === 'won', true);
      assert.equal(next.cells.filter((c) => c.mine).length, next.mines);
    }
  }
});

test('첫 클릭 3×3 구역에도 지뢰가 없다 (넉넉한 보드)', () => {
  const game = newGame('intermediate');
  const center = 8 * 16 + 8;
  const next = reveal(game, center, stubRng(0.5));
  for (const j of [center, ...neighborsOf(center, 16, 16)]) {
    assert.equal(next.cells[j].mine, false, `칸 ${j}는 안전해야 합니다`);
  }
});

test('모서리 neighborsOf 는 3칸이다', () => {
  assert.equal(neighborsOf(0, 9, 9).length, 3);
  assert.equal(neighborsOf(40, 9, 9).length, 8);
});

test('0칸을 열면 빈 영역이 한 번에 열린다', () => {
  // 지뢰를 우하단 구석(80)에만 둔 9×9 — 0번을 열면 80 외 전부 열린다
  const game = makeGameWithMines(9, 9, [80]);
  const next = reveal(game, 0);
  assert.equal(next.revealedSafe, 81 - 1);
  assert.equal(next.status, 'won');
});

test('숫자칸은 adjacent 를 그대로 보여준다', () => {
  const game = makeGameWithMines(3, 3, [0, 1]);
  const next = reveal(game, 4);
  assert.equal(next.cells[4].revealed, true);
  assert.equal(next.cells[4].adjacent, 2);
  assert.equal(next.revealedSafe, 1);
  assert.equal(next.status, 'playing');
});

test('지뢰를 열면 패배하고 전 지뢰가 공개된다', () => {
  const game = makeGameWithMines(3, 3, [0, 8]);
  const next = reveal(game, 0);
  assert.equal(next.status, 'lost');
  assert.equal(next.exploded, 0);
  assert.equal(next.cells[0].revealed, true);
  assert.equal(next.cells[8].revealed, true);
});

test('깃발이 꽂힌 칸은 열리지 않는다', () => {
  const game = makeGameWithMines(3, 3, [0]);
  const flagged = toggleFlag(game, 0);
  assert.equal(flagged.cells[0].flagged, true);
  assert.equal(flagged.flags, 1);
  const same = reveal(flagged, 0);
  assert.equal(same, flagged, '무효 입력은 같은 참조를 돌려줍니다');
});

test('깃발 토글은 두 번 하면 원복된다', () => {
  const game = makeGameWithMines(3, 3, [0]);
  const once = toggleFlag(game, 4);
  const twice = toggleFlag(once, 4);
  assert.equal(twice.cells[4].flagged, false);
  assert.equal(twice.flags, 0);
});

test('이미 열린 칸에는 깃발을 꽂을 수 없다', () => {
  const game = makeGameWithMines(3, 3, [8]);
  const opened = reveal(game, 0);
  const same = toggleFlag(opened, 0);
  assert.equal(same, opened);
});

test('chord: 깃발이 숫자와 일치하면 이웃이 열린다', () => {
  // 4×4, 지뢰는 네 모서리 [0, 3, 12, 15]. 5의 adjacent=1 → 0에 깃발 후 5를 chord.
  // 이웃이 전부 숫자칸이라 캐스케이드 없이 7칸만 열리고 게임은 계속된다.
  const game = makeGameWithMines(4, 4, [0, 3, 12, 15]);
  const opened = reveal(game, 5);
  assert.equal(opened.cells[5].adjacent, 1);
  const flagged = toggleFlag(opened, 0);
  const next = chord(flagged, 5);
  for (const i of [1, 2, 4, 6, 8, 9, 10]) {
    assert.equal(next.cells[i].revealed, true, `칸 ${i}는 열려야 합니다`);
  }
  assert.equal(next.cells[0].revealed, false, '깃발 칸은 닫혀 있어야 합니다');
  assert.equal(next.status, 'playing');
});

test('chord: 깃발이 부족하면 아무 일도 없다', () => {
  const game = makeGameWithMines(3, 3, [0]);
  const opened = reveal(game, 4);
  const same = chord(opened, 4);
  assert.equal(same, opened);
});

test('chord: 깃발이 잘못 꽂혔으면 지뢰를 밟아 패배한다', () => {
  // 지뢰 [0, 2]. 가운데 adjacent=2. 0(진짜)과 1(가짜)에 깃발 후 chord → 2가 열린다
  const game = makeGameWithMines(3, 3, [0, 2]);
  const opened = reveal(game, 4);
  assert.equal(opened.cells[4].adjacent, 2);
  const f1 = toggleFlag(opened, 0);
  const f2 = toggleFlag(f1, 1);
  const next = chord(f2, 4);
  assert.equal(next.status, 'lost');
});

test('전 안전칸을 열면 승리하고 지뢰에 자동 깃발이 꽂힌다', () => {
  const game = makeGameWithMines(2, 2, [3]);
  const a = reveal(game, 0);
  const b = reveal(a, 1);
  const c = reveal(b, 2);
  assert.equal(c.status, 'won');
  assert.equal(c.cells[3].flagged, true);
  assert.equal(c.flags, 1);
});

test('종료 후 입력은 모두 무시된다', () => {
  const lost = reveal(makeGameWithMines(3, 3, [0]), 0);
  assert.equal(reveal(lost, 4), lost);
  assert.equal(toggleFlag(lost, 4), lost);
  assert.equal(chord(lost, 4), lost);
});

test('placeMines 는 빽빽한 보드에서도 클릭 칸만은 비운다', () => {
  // 2×2에 지뢰 3개 — 클릭 칸(0) 제외 후보가 3칸이라 정확히 3개 배치
  const game = { ...newGame('beginner'), rows: 2, cols: 2, mines: 3, key: 'custom' };
  game.cells = game.cells.slice(0, 4);
  placeMines(game, 0, stubRng(0));
  assert.equal(game.cells[0].mine, false);
  assert.equal(game.cells.filter((c) => c.mine).length, 3);
});
