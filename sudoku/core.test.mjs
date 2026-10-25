import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CELLS,
  DIFFICULTIES,
  PEERS,
  boardToString,
  buildCells,
  countSolutions,
  difficultySpec,
  findConflicts,
  formatTime,
  generatePuzzle,
  generateSolution,
  isSolved,
  parseBoard,
} from './core.mjs';

/** 결정론적 테스트용 PRNG. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const row = (v, r) => Array.from({ length: 9 }, (_, c) => v[r * 9 + c]);
const col = (v, c) => Array.from({ length: 9 }, (_, r) => v[r * 9 + c]);
const box = (v, br, bc) =>
  Array.from({ length: 9 }, (_, k) => v[(br * 3 + Math.floor(k / 3)) * 9 + bc * 3 + (k % 3)]);

function assertValidComplete(values, label) {
  for (let unit = 0; unit < 9; unit++) {
    for (const [name, arr] of [
      ['행', row(values, unit)],
      ['열', col(values, unit)],
      ['박스', box(values, Math.floor(unit / 3), unit % 3)],
    ]) {
      assert.deepEqual([...arr].sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 7, 8, 9], `${label}: ${unit}번 ${name}`);
    }
  }
}

test('PEERS: 20칸이고 자기 자신을 포함하지 않는다', () => {
  assert.equal(PEERS.length, CELLS);
  for (let i = 0; i < CELLS; i++) {
    assert.equal(PEERS[i].length, 20);
    assert.ok(!PEERS[i].includes(i));
    for (const p of PEERS[i]) assert.ok(PEERS[p].includes(i), `대칭 아님: ${i} ↔ ${p}`);
  }
});

test('parseBoard / boardToString 왕복, 비숫자는 0', () => {
  const s = '0'.repeat(80) + '9';
  assert.equal(boardToString(parseBoard(s)), s);
  assert.equal(parseBoard('abc')[0], 0);
  assert.equal(parseBoard('')[0], 0);
});

test('buildCells: 0 만 편집 가능하다', () => {
  const cells = buildCells('10' + '0'.repeat(79));
  assert.deepEqual(cells[0], { val: 1, editable: false });
  assert.deepEqual(cells[1], { val: 0, editable: true });
  assert.equal(cells.length, CELLS);
});

test('generateSolution: 완성되고 규칙에 맞다', () => {
  for (const seed of [1, 7, 42]) {
    assertValidComplete(generateSolution(mulberry32(seed)), `seed ${seed}`);
  }
});

test('generatePuzzle: 유일해·정답 부분집합·목표 힌트 수', () => {
  for (const key of ['easy', 'medium', 'hard']) {
    const p = generatePuzzle({ difficulty: key, rng: mulberry32(1234) });
    const puzzle = parseBoard(p.puzzle);
    const solution = parseBoard(p.solution);
    assert.equal(puzzle.length, CELLS);
    assert.equal(countSolutions(puzzle, 2), 1, `${key}: 해가 유일해야 한다`);
    for (let i = 0; i < CELLS; i++) {
      assert.ok(puzzle[i] === 0 || puzzle[i] === solution[i], `${key}: ${i}번 힌트가 정답과 다르다`);
    }
    assert.ok(p.clues <= difficultySpec(key).clues, `${key}: 목표 힌트 수(${difficultySpec(key).clues}) 미달`);
  }
});

test('generatePuzzle: 난이도가 높을수록 힌트가 적다', () => {
  const clues = DIFFICULTIES.map((d) => d.clues);
  for (let i = 1; i < clues.length; i++) assert.ok(clues[i] < clues[i - 1]);
});

test('generatePuzzle: 같은 시드는 같은 퍼즐', () => {
  const a = generatePuzzle({ difficulty: 'medium', rng: mulberry32(99) });
  const b = generatePuzzle({ difficulty: 'medium', rng: mulberry32(99) });
  assert.equal(a.puzzle, b.puzzle);
  assert.equal(a.solution, b.solution);
});

test('countSolutions: 빈 보드는 2(복수), 모순 보드는 0', () => {
  assert.equal(countSolutions(new Int8Array(CELLS), 2), 2);
  const contradictions = new Int8Array(CELLS);
  contradictions[0] = 5;
  contradictions[1] = 5;
  assert.equal(countSolutions(contradictions, 2), 0);
});

test('findConflicts: 행·열·박스 중복을 모두 잡고 0 은 무시한다', () => {
  const v = new Int8Array(CELLS);
  v[0] = 7;
  v[8] = 7; // 같은 행(0) …
  v[72] = 7; // 같은 열(0)
  v[10] = 7; // 같은 박스(좌상)에 이미 7 있음 → 10도 충돌
  const bad = findConflicts(v);
  for (const i of [0, 8, 72, 10]) assert.ok(bad.has(i), `${i} 충돌 누락`);
  assert.equal(findConflicts(new Int8Array(CELLS)).size, 0);
});

test('isSolved / formatTime', () => {
  const v = parseBoard('123456789'.repeat(9));
  assert.equal(isSolved(v, v), true);
  const w = Int8Array.from(v);
  w[40] = 0;
  assert.equal(isSolved(w, v), false);
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(-3), '00:00');
});
