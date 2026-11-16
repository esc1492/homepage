import test from "node:test";
import assert from "node:assert/strict";
import { Game, parseLevel, TILE, HOLE_MS, DIG_MS, TRAP_MS, SPEED, digStage, refillStage, REFILL_MS, REFILL_STAGES } from "./core.mjs";

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

test("brick directly below a ladder cannot be dug", () => {
  const rows = blank();
  floorRow(rows, 6);
  rows[5][9] = TILE.LADDER; // 벽돌 (9,6) 바로 위가 사다리
  rows[5][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.dig(-1);
  assert.equal(g.holes.size, 0, "사다리 밑 벽돌은 구멍이 파지면 안 됩니다");
  g.dig(1); // 반대쪽 (11,6) 은 위가 비어 있음
  assert.ok(g.holes.has(6 * 28 + 11), "사다리가 없는 쪽은 팔려야 합니다");
});

test("dig records its start time and walks the animation stages", () => {
  const rows = blank();
  floorRow(rows, 6);
  rows[5][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.time = 500;
  g.dig(-1);
  const hole = g.holes.get(6 * 28 + 9);
  assert.equal(hole.dugAt, 500, "판 시각을 기억해야 합니다");
  assert.equal(digStage(hole.dugAt, 500), 0);
  assert.equal(digStage(hole.dugAt, 565), 0);
  assert.equal(digStage(hole.dugAt, 566), 1);
  assert.equal(digStage(hole.dugAt, 632), 2);
  assert.equal(digStage(hole.dugAt, 698), 3, "여기서부터는 두 배 느립니다");
  assert.equal(digStage(hole.dugAt, 831), 4);
  assert.equal(digStage(hole.dugAt, 964), 5);
  assert.equal(digStage(hole.dugAt, 1097), -1, "애니메이션이 끝나면 구멍만 남습니다");
});

test("hole refill walks its stages and crushes its occupant at the halfway point", () => {
  const rows = blank();
  floorRow(rows, 5);
  rows[4][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.dig(-1); // hole at (9,5)
  const idx = 5 * 28 + 9;
  const hole = g.holes.get(idx);
  assert.equal(hole.refillAt, HOLE_MS);
  assert.equal(refillStage(hole.refillAt, HOLE_MS - REFILL_MS - 1), -1, "아직 메워지기 전");
  assert.equal(refillStage(hole.refillAt, HOLE_MS - REFILL_MS), 0);
  assert.equal(refillStage(hole.refillAt, HOLE_MS - 1), REFILL_STAGES - 1);
  assert.equal(refillStage(hole.refillAt, HOLE_MS), -1, "다 메워지면 끝");
  const guard = { c: 9, r: 5, pc: 9, pr: 5, dir: 1, timer: 0, digUntil: 0, trappedAt: 0, moving: false };
  g.guards.push(guard);
  g.time = HOLE_MS - REFILL_MS / 2 - 1;
  g.updateHoles();
  assert.equal(g.guards.length, 1, "절반 전에는 경비병이 살아 있습니다");
  assert.ok(g.holes.has(idx), "구멍은 아직 남아 있습니다");
  g.time = HOLE_MS - REFILL_MS / 2;
  g.updateHoles();
  assert.equal(g.guards.length, 0, "절반에서 경비병이 죽습니다");
  assert.equal(g.score, 75);
  assert.ok(g.holes.has(idx), "메워질 때까지 구멍은 남아 있습니다");
  g.time = HOLE_MS;
  g.updateHoles();
  assert.equal(g.holes.size, 0, "다 메워지면 구멍이 사라집니다");
});

test("a guard that enters the hole after halfway dies when it closes", () => {
  const rows = blank();
  floorRow(rows, 5);
  rows[4][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.dig(-1); // hole at (9,5)
  const idx = 5 * 28 + 9;
  const hole = g.holes.get(idx);
  g.time = hole.refillAt - REFILL_MS / 2; // 절반 시점에 아무도 없어 crushed 만 켜집니다
  g.updateHoles();
  g.guards.push({ c: 9, r: 5, pc: 9, pr: 5, dir: 1, timer: 0, digUntil: 0, trappedAt: 0, moving: false });
  g.time = hole.refillAt - 1;
  g.updateHoles();
  assert.equal(g.guards.length, 1, "메워지기 직전까지는 살아 있습니다");
  g.time = hole.refillAt;
  g.updateHoles();
  assert.equal(g.guards.length, 0, "벽돌이 닫히는 순간 죽습니다");
  assert.equal(g.score, 75);
  assert.equal(g.holes.size, 0);
});

test("hole refill kills the player standing in it", () => {
  const rows = blank();
  floorRow(rows, 15); // 아래가 막힌 바닥 구멍
  rows[14][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.dig(-1);
  g.player.c = 9; g.player.r = 15;
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

test("player trapped in a bottom hole cannot climb out", () => {
  const rows = blank();
  floorRow(rows, 15); // 아래가 막힌 바닥 구멍
  rows[14][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.dig(-1); // hole at (9,15)
  g.player.c = 9; g.player.r = 15;
  g.update(SPEED.walk * 3, { up: true });
  assert.equal(g.player.c, 9);
  assert.equal(g.player.r, 15, "구멍에 갇혀 나올 수 없습니다");
});

test("bottom-row hole traps the player instead of dropping him off the board", () => {
  const rows = blank();
  floorRow(rows, 14); // 마지막 벽돌 줄 — 아래 15행은 비어 있고 그 밖으로는 보드 끝
  rows[13][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.dig(-1); // hole at (9,14)
  g.update(DIG_MS + 1, {});
  g.update(SPEED.walk + 1, { dir: -1 });
  for (let i = 0; i < 20; i++) g.update(SPEED.fall, { dir: -1 });
  assert.equal(g.player.r, 14, "보드 밖으로 떨어지지 않고 구멍에 갇혀야 합니다");
});

test("player falls through a hole dug in a middle floor", () => {
  const rows = blank();
  floorRow(rows, 5);
  floorRow(rows, 10); // 아래 층
  rows[4][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.dig(-1); // hole at (9,5)
  g.update(DIG_MS + 1, {});
  g.update(SPEED.walk + 1, { dir: -1 }); // step onto (9,4), unsupported
  assert.equal(g.player.c, 9);
  for (let i = 0; i < 20; i++) g.update(SPEED.fall, { dir: -1 });
  assert.ok(g.player.r > 5, "구멍에 갇히지 않고 통과해야 합니다");
  assert.equal(g.player.r, 9, "아래 층 위에 내려서야 합니다");
  assert.equal(g.state, "playing");
});

test("player falling onto a bar hangs from it instead of standing above", () => {
  const rows = blank();
  floorRow(rows, 9);
  for (let c = 10; c <= 19; c++) rows[11][c] = TILE.BAR;
  rows[8][12] = TILE.PLAYER;
  const g = new Game(rows);
  g.dig(1); // hole at (13,9)
  for (let i = 0; i < 40; i++) g.update(16, {}); // 파기 모션
  for (let i = 0; i < 400; i++) {
    g.update(16, { dir: 1 });
    if (g.player.r >= 11) break;
  }
  assert.equal(g.player.r, 11, "줄이 있는 행까지 내려와야 합니다");
  assert.equal(g.tileAt(g.player.c, g.player.r), TILE.BAR, "줄을 잡아야 합니다");
});

test("pressing down drops the player off a bar", () => {
  const rows = blank();
  floorRow(rows, 14);
  for (let c = 10; c <= 19; c++) rows[11][c] = TILE.BAR;
  rows[11][13] = TILE.BAR;
  rows[10][13] = TILE.PLAYER; // 줄 칸으로 내려와 매달린 상태
  const g = new Game(rows);
  g.player.c = 13; g.player.r = 11; g.player.x = 13;
  for (let i = 0; i < 60; i++) g.update(16, { down: true });
  assert.equal(g.player.r, 13, "줄을 놓고 14행 바닥 위까지 떨어져야 합니다");
});

test("hole directly above a bar lets the player grab the bar", () => {
  const rows = blank();
  floorRow(rows, 1);
  for (let c = 8; c <= 17; c++) rows[2][c] = TILE.BAR;
  rows[0][12] = TILE.PLAYER;
  const g = new Game(rows);
  g.dig(-1); // hole at (11,1) — 바로 아래 (11,2) 가 줄
  for (let i = 0; i < 40; i++) g.update(16, {});
  for (let i = 0; i < 200; i++) {
    g.update(16, { dir: -1 });
    if (g.player.r >= 2) break;
  }
  assert.equal(g.player.r, 2, "줄이 있는 칸으로 내려와야 합니다");
  assert.equal(g.tileAt(g.player.c, g.player.r), TILE.BAR, "줄을 잡아야 합니다");
});

test("pressing down on a bar above a brick keeps the player hanging", () => {
  const rows = blank();
  for (let c = 10; c <= 19; c++) rows[11][c] = TILE.BAR;
  rows[12][13] = TILE.BRICK; // 줄 바로 아래가 벽돌
  rows[10][13] = TILE.PLAYER;
  const g = new Game(rows);
  g.player.c = 13; g.player.r = 11; g.player.x = 13;
  for (let i = 0; i < 60; i++) g.update(16, { down: true });
  assert.equal(g.player.r, 11, "벽돌 속으로 들어가면 안 됩니다");
});

test("a short key tap moves only a fraction of a tile and stops there", () => {
  const rows = blank();
  floorRow(rows, 5);
  rows[4][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.update(30, { dir: 1 }); // 아주 짧게 눌렀다가 뗌
  const tapped = g.player.x;
  assert.ok(tapped > 10 && tapped < 11, `조금만 움직여야 합니다 (x=${tapped})`);
  g.update(SPEED.walk * 3, {}); // 키를 뗀 뒤
  assert.equal(g.player.x, tapped, "손을 뗀 뒤에는 미끄러지지 않아야 합니다");
  assert.equal(g.player.c, 10, "반 칸을 넘지 않았으므로 칸도 그대로");
});

test("holding a direction keeps moving while the key is down", () => {
  const rows = blank();
  floorRow(rows, 5);
  rows[4][10] = TILE.PLAYER;
  const g = new Game(rows);
  g.update(SPEED.walk, { dir: 1 });
  assert.equal(g.player.c, 11, "한 칸 시간만큼 누르면 한 칸 갑니다");
  g.update(SPEED.walk * 2, { dir: 1 });
  assert.equal(g.player.c, 13, "계속 누르면 계속 갑니다");
});
