import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BALL_R,
  KEY_SPEED,
  LASER_DURATION,
  LEVEL_COUNT,
  LIFE_RESPAWN_TICKS,
  PADDLE_W,
  PADDLE_WIDE,
} from './constants.js';
import { genLevel, makeBrick } from './levels.js';
import { stepWorld } from './step.js';
import { createWorld } from './world.js';

const input = (over = {}) => ({ left: false, right: false, dir: 0, targetX: null, ...over });

/** 벽·브릭·패들에 닿지 않는 빈 무대. */
function arena(ball) {
  const w = createWorld({ rng: () => 0 });
  w.screen = 'playing';
  w.bricks = [];
  Object.assign(w.ball, ball);
  return w;
}

test('고정 타임스텝: 틱 수가 곧 게임 시간이다 (120Hz 회귀 테스트)', () => {
  // stepWorld 는 타임스탬프를 받지 않습니다. 그래서 rAF 가 60번 돌든 120번 돌든
  // 60틱은 정확히 60 * 속도만큼 진행합니다 — 원본은 120Hz 에서 2배로 갔습니다.
  const w = arena({ x: 200, y: 300, r: BALL_R, dx: 1.5, dy: -2, caught: false });
  const inp = input();

  for (let i = 0; i < 60; i++) stepWorld(w, inp);

  assert.equal(w.ball.x, 200 + 60 * 1.5);
  assert.equal(w.ball.y, 300 - 60 * 2);
});

test('고정 타임스텝: 60틱 두 번은 120틱 한 번과 같다', () => {
  const once = arena({ x: 200, y: 300, r: BALL_R, dx: 1.5, dy: -2, caught: false });
  const twice = arena({ x: 200, y: 300, r: BALL_R, dx: 1.5, dy: -2, caught: false });
  const inp = input();

  for (let i = 0; i < 120; i++) stepWorld(once, inp);
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < 60; i++) stepWorld(twice, inp);
  }

  assert.equal(twice.ball.x, once.ball.x);
  assert.equal(twice.ball.y, once.ball.y);
});

test('갱신 순서: 패들이 공보다 먼저 움직인다', () => {
  const w = arena({ x: 0, y: 0, r: BALL_R, dx: 0, dy: 0, caught: true });
  w.ball.caught = true;
  const startX = w.paddle.x;

  stepWorld(w, input({ left: true }));

  assert.equal(w.paddle.x, startX - KEY_SPEED);
  // 공이 패들에 붙어 있다면 **움직인 뒤의** 패들 위치를 따라야 합니다.
  assert.equal(w.ball.x, w.paddle.x + w.paddle.w / 2);
  assert.equal(w.ball.y, w.paddle.y - w.ball.r - 1);
});

test('키보드 델타는 틱당 정확히 ±6 이다', () => {
  const w = arena({ x: 0, y: 0, r: BALL_R, dx: 0, dy: 0, caught: false });
  const startX = w.paddle.x;

  for (let i = 0; i < 3; i++) stepWorld(w, input({ left: true }));
  assert.equal(w.paddle.x, startX - 3 * KEY_SPEED);

  for (let i = 0; i < 2; i++) stepWorld(w, input({ dir: 1 }));
  assert.equal(w.paddle.x, startX - 3 * KEY_SPEED + 2 * KEY_SPEED);
});

test('포인터 목표는 한 번만 소비된다', () => {
  const w = arena({ x: 0, y: 0, r: BALL_R, dx: 0, dy: 0, caught: false });
  const inp = input({ targetX: 250 });

  stepWorld(w, inp);
  assert.equal(w.paddle.x, 250);
  assert.equal(inp.targetX, null, '소비 후 비워야 합니다');

  // targetX 가 그대로 남아 있으면 포인터가 멈춰 있어도 매 틱 패들을 다시 끌어당겨
  // 키보드 조작을 덮어씁니다.
  stepWorld(w, inp);
  assert.equal(w.paddle.x, 250);
});

test('전환 카운트다운: 47틱까지는 멈춰 있고 48틱째에 부활한다', () => {
  const w = createWorld({ rng: () => 0 });
  w.screen = 'lost';
  w.transition = { kind: 'respawn', ticksLeft: LIFE_RESPAWN_TICKS };
  w.ball.dy = -5;
  w.ball.y = 300;

  const inp = input();
  for (let i = 0; i < LIFE_RESPAWN_TICKS - 1; i++) stepWorld(w, inp);

  assert.equal(w.screen, 'lost');
  assert.equal(w.ball.y, 300, '전환 중에는 물리가 돌면 안 됩니다');

  stepWorld(w, inp);
  assert.equal(w.screen, 'ready');
  assert.equal(w.ball.dy, 0);
  assert.equal(w.ball.y, w.paddle.y - w.ball.r - 1);
});

test('레벨 전환은 브릭과 아이템을 모두 새로 만든다', () => {
  const w = createWorld({ rng: () => 0 });
  w.screen = 'levelComplete';
  w.round = 2;
  w.transition = { kind: 'advanceLevel', ticksLeft: 1 };
  w.bricks = [];
  w.extraBalls = [{ x: 0, y: 0, r: 1, dx: 1, dy: 1 }];
  w.items = [{ x: 0, y: 0, w: 1, h: 1, type: 'D' }];
  w.lasers = [{ x: 0, y: 0, w: 1, h: 1, dy: -1 }];
  w.activeEffects = { L: 5 };
  w.portal = { x: 1, y: 2, w: 3, h: 4 };
  w.laserCooldown = 7;
  w.paddle.w = PADDLE_WIDE;

  stepWorld(w, input());

  assert.equal(w.screen, 'ready');
  assert.equal(w.round, 2);
  assert.equal(w.bricks.length, genLevel(1).length);
  assert.deepEqual(w.extraBalls, []);
  assert.deepEqual(w.items, []);
  assert.deepEqual(w.lasers, []);
  assert.deepEqual(w.activeEffects, {});
  assert.equal(w.portal, null);
  assert.equal(w.laserCooldown, 0);
  assert.equal(w.paddle.w, PADDLE_W);
});

test('사건은 일어난 순서대로 쌓인다 — 벽이 먼저, 브릭이 나중', () => {
  const w = createWorld({ rng: () => 0 });
  w.screen = 'playing';
  // 0행 0열 브릭은 x 14..45 에 있어 왼쪽 벽 바로 옆입니다.
  // 브릭을 하나 더 남겨 두어야 레벨이 클리어되지 않습니다.
  w.bricks = [makeBrick(0, 0), makeBrick(0, 3)];
  Object.assign(w.ball, { x: 23, y: 110, r: BALL_R, dx: -3, dy: 0, caught: false });

  const events = stepWorld(w, input());

  assert.deepEqual(events, ['wallHit', 'brickBroken']);
});

test('C 아이템은 카운터가 아니라 불리언이라 100틱이 지나도 사라지지 않는다', () => {
  const w = createWorld({ rng: () => 0 });
  w.screen = 'playing';
  w.activeEffects = { C: true };
  w.ball.caught = true;

  const inp = input();
  for (let i = 0; i < 100; i++) stepWorld(w, inp);

  assert.equal(w.activeEffects.C, true, 'stepEffects 가 -- 로 지우면 안 됩니다');
  assert.equal(w.ball.caught, true);
});

test('레이저는 LASER_COOLDOWN 틱마다 하나씩 나가고 만료되면 정리된다', () => {
  const w = createWorld({ rng: () => 0 });
  w.screen = 'playing';
  w.activeEffects = { L: LASER_DURATION };
  w.laserCooldown = 0;
  w.ball.caught = true;

  const inp = input();
  stepWorld(w, inp);
  assert.equal(w.lasers.length, 1);

  // 첫 발사 뒤 16틱이 지나면 두 번째가 나갑니다.
  for (let i = 0; i < 16; i++) stepWorld(w, inp);
  assert.equal(w.lasers.length, 2);

  // L 이 만료되는 순간 레이저가 모두 정리됩니다.
  w.activeEffects.L = 1;
  stepWorld(w, inp);
  assert.equal('L' in w.activeEffects, false);
  assert.deepEqual(w.lasers, []);
  assert.equal(w.laserCooldown, 0);
});

test('마지막 레벨에서는 첫 브릭 파괴가 포탈을 확실히 만든다', () => {
  const w = createWorld({ rng: () => 0.99 }); // 평소엔 절대 안 나오는 값
  w.round = LEVEL_COUNT;
  w.screen = 'playing';
  w.bricks = [makeBrick(2, 5)];
  Object.assign(w.ball, { x: 167, y: 143, r: BALL_R, dx: 1, dy: 1, caught: false });

  stepWorld(w, input());

  assert.equal(w.items.length, 1);
  assert.equal(w.items[0].type, 'B');
});
