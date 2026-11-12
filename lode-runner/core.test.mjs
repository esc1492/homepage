import test from "node:test";
import assert from "node:assert/strict";
import { Game, parseLevel, TILE, HOLE_MS, DIG_MS, TRAP_MS, SPEED } from "./core.mjs";

function blank() {
  return Array.from({ length: 16 }, () => Array(28).fill(0));
}
function floorRow(rows, r, from = 0, to = 27) {
  for (let c = from; c <= to; c++) rows[r][c] = TILE.BRICK;
}

test("parseLevel extracts player, guards, gold", () => {
  const rows = blank();
  rows[4][10] = TILE.PLAYER;
  rows[4][15] = TILE.ENEMY;
  rows[4][12] = TILE.GOLD;
  rows[3][3] = TILE.GOLD;
  const p = parseLevel(rows);
  assert.deepEqual(p.player, { c: 10, r: 4 });
  assert.equal(p.guards.length, 1);
  assert.deepEqual(p.guards[0], { c: 15, r: 4 });
  assert.equal(p.gold, 2);
  assert.equal(p.tiles[4 * 28 + 10], TILE.EMPTY);
});

test("player walks along a floor", () => {
  const rows = blank();
  floorRow(rows, 5);
  rows[4][10] = TILE.PLAYER;
  const g = new Game(rows);
  for (let i = 0; i < 3; i++) g.update(SPEED.walk + 1, { dir: 1 });
  assert.equal(g.player.c, 13);
});

test("player falls when stepping off a ledge", () => {
  const rows = blank();
  floorRow(rows, 5, 0, 10);
  rows[4][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.update(SPEED.walk + 1, { dir: 1 }); // step to c=11, unsupported
  assert.equal(g.player.c, 11);
  g.update(SPEED.fall * 2, { dir: 1 }); // gravity takes over
  assert.ok(g.player.r > 4, "player should fall");
});

test("player climbs a ladder", () => {
  const rows = blank();
  for (let r = 0; r <= 6; r++) rows[r][10] = TILE.LADDER;
  floorRow(rows, 7);
  rows[6][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.update(SPEED.climb + 1, { up: true });
  assert.equal(g.player.r, 5);
});

test("digging creates a hole and refilling kills a guard in it", () => {
  const rows = blank();
  floorRow(rows, 5);
  rows[4][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.dig(-1);
  const idx = 5 * 28 + 9;
  assert.ok(g.holes.has(idx), "hole should exist");
  assert.equal(g.tileAt(9, 5), 10);
  const guard = { c: 9, r: 5, pc: 9, pr: 5, dir: 1, timer: 0, digUntil: 0, trappedAt: 0, moving: false };
  g.guards.push(guard);
  g.time = HOLE_MS + 1;
  g.updateHoles();
  assert.equal(g.guards.length, 0, "guard dies when the hole refills");
  assert.equal(g.score, 75);
});

test("hole refill kills the player standing in it", () => {
  const rows = blank();
  floorRow(rows, 5);
  rows[4][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.dig(-1);
  g.player.c = 9; g.player.r = 5;
  g.time = HOLE_MS + 1;
  g.updateHoles();
  assert.equal(g.state, "dead");
  assert.equal(g.lives, 4);
});

test("collecting gold adds score and reveals hidden ladders", () => {
  const rows = blank();
  floorRow(rows, 5);
  rows[4][10] = TILE.PLAYER;
  rows[4][11] = TILE.GOLD;
  rows[3][12] = TILE.HIDDEN;
  const g = new Game(rows);
  g.update(SPEED.walk + 1, { dir: 1 });
  assert.equal(g.goldLeft, 0);
  assert.equal(g.score, 250);
  assert.equal(g.tileAt(12, 3), TILE.LADDER, "hidden ladder revealed");
});

test("reaching the top after all gold completes the level", () => {
  const rows = blank();
  for (let r = 0; r <= 6; r++) rows[r][10] = TILE.LADDER;
  floorRow(rows, 7);
  rows[6][10] = TILE.PLAYER;
  rows[4][10] = TILE.GOLD;
  const g = new Game(rows);
  for (let i = 0; i < 12; i++) g.update(SPEED.climb + 1, { up: true });
  assert.equal(g.goldLeft, 0);
  assert.equal(g.state, "complete");
  assert.equal(g.score, 250 + 1500);
});

test("guards path toward the player", () => {
  const rows = blank();
  floorRow(rows, 5);
  rows[4][5] = TILE.ENEMY;
  rows[4][10] = TILE.PLAYER;
  const g = new Game(rows);
  const step = g.bfsStep(5, 4, 10, 4);
  assert.ok(step);
  assert.equal(step.c, 6);
  assert.equal(step.r, 4);
});

test("guard walks into a hole instead of stopping at its edge", () => {
  const rows = blank();
  floorRow(rows, 5);
  rows[4][5] = TILE.ENEMY;
  rows[4][12] = TILE.PLAYER;
  const g = new Game(rows);
  const guard = g.guards[0];
  g.holes.set(5 * 28 + 7, { refillAt: 99999 }); // col 7 의 바닥에 구멍
  g.stepGuard(guard);
  assert.equal(guard.c, 6, "구멍 쪽으로 걸어가야 합니다");
  g.stepGuard(guard);
  assert.equal(guard.c, 7, "구멍 바로 위 칸까지 이동");
  g.stepGuard(guard);
  assert.equal(guard.r, 5, "구멍 위에서는 빠져야 합니다");
  assert.equal(g.guardAt(7, 5), guard);
});

test("player can walk over a hole that has a trapped guard", () => {
  const rows = blank();
  floorRow(rows, 5);
  rows[4][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.dig(-1); // hole at (9,5)
  g.guards.push({ c: 9, r: 5, pc: 9, pr: 5, dir: 1, timer: 0, digUntil: 0, trappedAt: 0, moving: false });
  g.update(DIG_MS + 1, {});
  g.update(SPEED.walk + 1, { dir: -1 });
  assert.equal(g.player.c, 9);
  assert.equal(g.player.r, 4, "player stays on the floor above the trapped guard");
});

test("trapped guard climbs out after the trap time", () => {
  const rows = blank();
  floorRow(rows, 5);
  rows[4][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.dig(-1); // hole at (9,5)
  const guard = { c: 9, r: 4, pc: 9, pr: 4, dir: 1, timer: 0, digUntil: 0, trappedAt: 0, moving: false };
  g.guards.push(guard);
  g.stepGuard(guard);
  assert.equal(guard.r, 5, "구멍으로 떨어져야 합니다");
  assert.equal(g.score, 75, "가둔 점수 +75");
  g.stepGuard(guard);
  assert.equal(guard.r, 5, "시간이 지나기 전에는 못 나옵니다");
  g.time = TRAP_MS + 1;
  g.stepGuard(guard);
  assert.equal(guard.r, 4, "시간이 지나면 기어 나옵니다");
});

test("guard still in the hole when it refills dies", () => {
  const rows = blank();
  floorRow(rows, 5);
  rows[4][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.dig(-1); // hole at (9,5)
  const guard = { c: 9, r: 4, pc: 9, pr: 4, dir: 1, timer: 0, digUntil: 0, trappedAt: 0, moving: false };
  g.guards.push(guard);
  g.stepGuard(guard); // 떨어짐 (+75)
  g.time = HOLE_MS + 1; // 기어 나오기 전에 구멍이 메워짐
  g.updateHoles();
  assert.equal(g.guards.length, 0, "구멍이 메워지면 죽습니다");
  assert.equal(g.score, 150, "가둔 75 + 죽은 75");
});

test("player trapped in a hole cannot climb out", () => {
  const rows = blank();
  floorRow(rows, 5);
  rows[4][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.dig(-1); // hole at (9,5)
  g.player.c = 9; g.player.r = 5;
  g.update(SPEED.walk * 3, { up: true });
  assert.equal(g.player.c, 9);
  assert.equal(g.player.r, 5, "구멍에 갇혀 나올 수 없습니다");
});

test("player falls into an empty hole", () => {
  const rows = blank();
  floorRow(rows, 5);
  rows[4][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.dig(-1);
  g.update(DIG_MS + 1, {});
  g.update(SPEED.walk + 1, { dir: -1 }); // step onto (9,4), unsupported
  assert.equal(g.player.c, 9);
  g.update(SPEED.fall + 10, { dir: -1 });
  assert.ok(g.player.r > 4, "player falls into the hole");
});

test("a short key tap still produces one step", () => {
  const rows = blank();
  floorRow(rows, 5);
  rows[4][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.update(30, { dir: 1 }); // 아주 짧게 눌렀다가 뗌
  g.update(SPEED.walk, {}); // 다음 걸음 시점에는 키가 없음
  assert.equal(g.player.c, 11, "짧게 눌러도 한 칸은 움직여야 합니다");
});

test("a tap older than the input buffer is ignored", () => {
  const rows = blank();
  floorRow(rows, 5);
  rows[4][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.update(30, { dir: 1 });
  g.update(SPEED.walk * 3, {}); // 버퍼가 만료된 뒤
  assert.equal(g.player.c, 10, "오래된 입력으로 움직이면 안 됩니다");
});
