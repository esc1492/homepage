import test from 'node:test';
import assert from 'node:assert/strict';

import { BRICK_H, BRICK_LEFT, BRICK_TOP, BRICK_W, COLS, LEVEL_COUNT, ROWS } from './constants.js';
import { genLevel } from './levels.js';
import { checkLevelComplete, createWorld, triggerLevelSkip } from './world.js';

const at = (bricks, row, col) => bricks.find((b) => b.row === row && b.col === col);

test('레벨 0 은 6×12 전칸을 1-HP 로 채운다', () => {
  const bricks = genLevel(0);
  assert.equal(bricks.length, ROWS * COLS);

  for (const b of bricks) {
    assert.equal(b.hp, 1);
    assert.equal(b.maxHp, 1);
    assert.equal(b.destructible, true);
    assert.equal(b.visible, true);
    assert.equal(b.x, BRICK_LEFT + b.col * BRICK_W);
    assert.equal(b.y, BRICK_TOP + b.row * BRICK_H);
  }
});

test('레벨 1 은 다이아몬드 — 모든 브릭이 중심에서 맨해튼 거리 3.5 이내', () => {
  const bricks = genLevel(1);
  assert.ok(bricks.length > 0);

  for (const b of bricks) {
    const d = Math.abs(b.col - (COLS - 1) / 2) + Math.abs(b.row - (ROWS - 1) / 2);
    assert.ok(d <= 3.5, `(${b.row},${b.col}) 거리 ${d}`);
  }

  assert.equal(at(bricks, 0, 0), undefined);
  assert.ok(at(bricks, 2, 5));
  assert.ok(at(bricks, 3, 6));
});

test('레벨 2 는 체커보드이고 2·3행만 실버(2HP)', () => {
  const bricks = genLevel(2);
  assert.ok(bricks.length > 0);

  for (const b of bricks) {
    assert.equal((b.row + b.col) % 2, 0, `(${b.row},${b.col})`);
    const expectSilver = b.row === 2 || b.row === 3;
    assert.equal(b.maxHp, expectSilver ? 2 : 1);
    if (expectSilver) assert.equal(b.color, '#9E9E9E');
  }
});

test('레벨 4 는 0행 가운데 10칸이 파괴 불가 골드다', () => {
  const gold = genLevel(4).filter((b) => !b.destructible);

  assert.equal(gold.length, 10);
  for (const b of gold) {
    assert.equal(b.row, 0);
    assert.ok(b.col >= 1 && b.col <= 10);
    assert.equal(b.hp, 99);
    assert.equal(b.maxHp, 99);
    assert.equal(b.visible, true);
  }
});

test('레벨 4 는 63칸이고 구멍이 9곳이다', () => {
  const bricks = genLevel(4);
  assert.equal(bricks.length, 63);

  const holes = [
    [5, 0], [5, 2], [5, 4], [5, 6], [5, 8], [5, 10],
    [2, 0], [2, 11],
    [4, 4],
  ];
  for (const [row, col] of holes) {
    assert.equal(at(bricks, row, col), undefined, `(${row},${col}) 는 구멍이어야 합니다`);
  }

  const silver = bricks.filter((b) => b.maxHp === 2);
  assert.equal(silver.length, 23);
  assert.equal(bricks.filter((b) => b.maxHp === 1).length, 30);
});

test('genLevel 은 호출마다 새 브릭 객체를 만든다', () => {
  const first = genLevel(0);
  const second = genLevel(0);

  assert.notEqual(first[0], second[0]);
  first[0].visible = false;
  assert.equal(second[0].visible, true);
});

test('소프트락 불변식: 레벨 4 는 파괴 가능 브릭을 다 부숴도 끝나지 않는다', () => {
  const world = createWorld({ rng: () => 0 });
  world.round = LEVEL_COUNT;
  world.screen = 'playing';
  world.bricks = genLevel(LEVEL_COUNT - 1);

  // 완벽한 플레이를 가정 — 파괴 가능한 브릭을 전부 없앱니다.
  for (const b of world.bricks) if (b.destructible) b.visible = false;
  assert.ok(world.bricks.some((b) => b.visible), '골드 브릭은 남아 있어야 합니다');

  const round = world.round;
  checkLevelComplete(world, []);

  assert.equal(world.round, round, '클리어되면 안 됩니다');
  assert.equal(world.screen, 'playing');
  assert.equal(world.transition, null);
});

test('소프트락 탈출구: 포탈(triggerLevelSkip)은 레벨 4 를 통과시킨다', () => {
  const world = createWorld({ rng: () => 0 });
  world.round = LEVEL_COUNT;
  world.screen = 'playing';
  world.bricks = genLevel(LEVEL_COUNT - 1);
  for (const b of world.bricks) if (b.destructible) b.visible = false;

  const events = [];
  triggerLevelSkip(world, events);

  assert.equal(world.round, LEVEL_COUNT + 1);
  assert.equal(world.screen, 'win');
  assert.deepEqual(events, ['win']);
});
