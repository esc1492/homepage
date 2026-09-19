import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ENLARGE_DURATION,
  H,
  ITEM_DROP_CHANCE,
  ITEM_WEIGHTS,
  LASER_DURATION,
  LEVEL_ADVANCE_TICKS,
  LEVEL_COUNT,
  LIFE_RESPAWN_TICKS,
  PADDLE_W,
  PADDLE_WIDE,
  PORTAL_H,
  PORTAL_W,
  SLOW_DURATION,
  WALL_RIGHT,
} from './constants.js';
import { makeBrick } from './levels.js';
import {
  activateItem,
  ballSpeed,
  checkLevelComplete,
  createWorld,
  dropItem,
  launchBall,
  loseLife,
  startGame,
} from './world.js';

/** 앞에서부터 소비하고, 다 쓰면 마지막 값을 계속 돌려주는 결정적 rng. */
function rngSeq(values) {
  let i = 0;
  return () => (i < values.length ? values[i++] : values[values.length - 1]);
}

const oneHpBrick = () => makeBrick(2, 5, 1, 1);

test('createWorld 는 원본 초기 상태를 만든다', () => {
  const w = createWorld({ rng: () => 0 });

  assert.equal(w.screen, 'ready');
  assert.equal(w.score, 0);
  assert.equal(w.lives, 3);
  assert.equal(w.round, 1);
  assert.equal(w.bricks.length, 72);
  assert.equal(w.paddle.w, PADDLE_W);
  assert.equal(w.ball.caught, false);
  assert.deepEqual(w.items, []);
  assert.deepEqual(w.lasers, []);
  assert.deepEqual(w.extraBalls, []);
  assert.deepEqual(w.activeEffects, {});
  assert.equal(w.portal, null);
  assert.equal(w.laserCooldown, 0);
  assert.equal(w.transition, null);
  assert.equal(w.portalGranted, false);
});

test('startGame 은 모든 필드를 되돌린다', () => {
  const w = createWorld({ rng: () => 0 });
  w.score = 4321;
  w.lives = 1;
  w.round = 4;
  w.paddle.w = PADDLE_WIDE;
  w.portal = { x: 1, y: 2, w: 3, h: 4 };
  w.portalGranted = true;
  w.activeEffects = { L: 100, C: true };
  w.transition = { kind: 'respawn', ticksLeft: 10 };
  w.items = [{ x: 0 }];

  startGame(w);

  assert.equal(w.score, 0);
  assert.equal(w.lives, 3);
  assert.equal(w.round, 1);
  assert.equal(w.paddle.w, PADDLE_W);
  assert.equal(w.portal, null);
  assert.equal(w.portalGranted, false);
  assert.deepEqual(w.activeEffects, {});
  assert.equal(w.transition, null);
  assert.deepEqual(w.items, []);
  assert.equal(w.bricks.length, 72);
  assert.equal(w.screen, 'ready');
});

test('launchBall 은 ready 에서만 동작하고 위쪽으로 발사한다', () => {
  const w = createWorld({ rng: () => 0.75 });
  const events = [];

  launchBall(w, events);
  assert.equal(w.screen, 'playing');
  assert.ok(w.ball.dy < 0);
  assert.ok(Math.abs(Math.hypot(w.ball.dx, w.ball.dy) - ballSpeed(w)) < 1e-9);
  assert.deepEqual(events, ['ballLaunched']);

  // 두 번째 호출은 무시됩니다
  const before = { dx: w.ball.dx, dy: w.ball.dy };
  launchBall(w, []);
  assert.equal(w.ball.dx, before.dx);
  assert.equal(w.ball.dy, before.dy);
});

test('dropItem: 주사위와 가드를 구분한다 (상수 rng 주입)', () => {
  // 항상 드롭하는 rng 라도 실버·골드는 떨어뜨리지 않습니다.
  const always = createWorld({ rng: () => 0 });
  dropItem(always, makeBrick(3, 0, 2, 2, '#9E9E9E'), []);
  dropItem(always, makeBrick(0, 1, 99, 99, '#B8860B', { destructible: false }), []);
  assert.equal(always.items.length, 0, '실버·골드는 드롭하지 않습니다');

  // 1-HP 는 같은 rng 에서 드롭합니다.
  dropItem(always, oneHpBrick(), []);
  assert.equal(always.items.length, 1);

  // 화면에 하나 있으면 더 안 나옵니다.
  dropItem(always, oneHpBrick(), []);
  assert.equal(always.items.length, 1);

  // 확률 게이트 — 0.99 는 ITEM_DROP_CHANCE 를 넘습니다.
  const never = createWorld({ rng: () => 0.99 });
  assert.ok(0.99 > ITEM_DROP_CHANCE);
  dropItem(never, oneHpBrick(), []);
  assert.equal(never.items.length, 0);
});

test('dropItem: 가중치 경계값이 아이템 종류를 정한다', () => {
  // 첫 호출은 확률(반드시 통과하도록 0), 두 번째가 종류 굴림입니다.
  const cases = [
    [0.0, 'D'],
    [0.32, 'E'],
    [0.48, 'C'],
    [0.64, 'S'],
    [0.8, 'L'],
    [0.92, 'B'],
    [0.99, 'P'],
  ];

  for (const [roll, expected] of cases) {
    const w = createWorld({ rng: rngSeq([0, roll]) });
    dropItem(w, oneHpBrick(), []);
    assert.equal(w.items.length, 1, `roll ${roll}`);
    assert.equal(w.items[0].type, expected, `roll ${roll}`);
  }
});

test('가중치 합은 95 이고 누적 순서가 계약이다', () => {
  assert.equal(ITEM_WEIGHTS.reduce((sum, e) => sum + e.w, 0), 95);
  assert.deepEqual(ITEM_WEIGHTS.map((e) => e.type), ['D', 'E', 'C', 'S', 'L', 'B', 'P']);
});

test('마지막 레벨은 첫 1-HP 브릭에서 B 포탈을 확정 지급한다', () => {
  // 0.99 는 평소라면 확률 게이트에서 떨어집니다.
  const w = createWorld({ rng: () => 0.99 });
  w.round = LEVEL_COUNT;

  dropItem(w, oneHpBrick(), []);
  assert.equal(w.items.length, 1);
  assert.equal(w.items[0].type, 'B');
  assert.equal(w.portalGranted, true);

  // 보장은 한 번뿐 — 이후에는 평소 확률로 돌아갑니다.
  w.items = [];
  dropItem(w, oneHpBrick(), []);
  assert.equal(w.items.length, 0);
});

test('포탈 보장은 화면에 아이템이 있으면 소비되지 않고 남는다', () => {
  const w = createWorld({ rng: () => 0.99 });
  w.round = LEVEL_COUNT;
  w.items = [{ x: 0 }];

  dropItem(w, oneHpBrick(), []);
  assert.equal(w.portalGranted, false, '게이트에 막혔으니 보장이 남아야 합니다');

  w.items = [];
  dropItem(w, oneHpBrick(), []);
  assert.equal(w.items[0].type, 'B');
});

test('activateItem 은 종류별로 정확히 적용된다', () => {
  const w = createWorld({ rng: () => 0.5 });

  activateItem(w, 'L');
  assert.equal(w.activeEffects.L, LASER_DURATION);

  // ⚠️ C 는 카운터가 아니라 불리언입니다.
  activateItem(w, 'C');
  assert.equal(w.activeEffects.C, true);

  activateItem(w, 'E');
  assert.equal(w.paddle.w, PADDLE_WIDE);
  assert.equal(w.activeEffects.E, ENLARGE_DURATION);

  activateItem(w, 'S');
  assert.equal(w.activeEffects.S, SLOW_DURATION);

  const lives = w.lives;
  activateItem(w, 'P');
  assert.equal(w.lives, lives + 1);

  activateItem(w, 'B');
  assert.equal(w.portal.x, WALL_RIGHT - PORTAL_W - 2);
  assert.equal(w.portal.y, H / 2 - PORTAL_H / 2);
  assert.equal(w.portal.w, PORTAL_W);
  assert.equal(w.portal.h, PORTAL_H);

  activateItem(w, 'D');
  assert.equal(w.extraBalls.length, 2);
  for (const eb of w.extraBalls) assert.ok(eb.dy < 0);
});

test('수직 발사 가드: 각도가 0 이어도 공은 완전 수직으로 가지 않는다', () => {
  // rng 0.5 → (0.5-0.5)*0.7 = 0 rad. dx 가 0 이 되면 || 0.1 이 걸립니다 (원본 그대로).
  const w = createWorld({ rng: () => 0.5 });
  launchBall(w, []);

  assert.equal(w.ball.dx, 0.1);
  assert.ok(w.ball.dy < 0);
});

test('loseLife: 목숨이 남으면 respawn 전환, 0이면 게임오버', () => {
  const w = createWorld({ rng: () => 0 });
  const events = [];

  loseLife(w, events); // 3 → 2
  assert.equal(w.lives, 2);
  assert.equal(w.screen, 'lost');
  assert.equal(w.transition.kind, 'respawn');
  assert.equal(w.transition.ticksLeft, LIFE_RESPAWN_TICKS);
  assert.ok(events.includes('lifeLost'));
  assert.ok(!events.includes('gameOver'));

  loseLife(w, []); // 2 → 1
  assert.equal(w.lives, 1);
  assert.equal(w.screen, 'lost');

  const lastEvents = [];
  loseLife(w, lastEvents); // 1 → 0
  assert.equal(w.lives, 0);
  assert.equal(w.screen, 'gameOver');
  assert.ok(lastEvents.includes('gameOver'));
  // 원본은 이전 생명 감소의 타이머를 남겨 800ms 뒤 게임오버가 스스로 풀렸습니다.
  assert.equal(w.transition, null, '게임오버에는 대기 중인 전환이 없어야 합니다');
});

test('checkLevelComplete: 다 부수면 다음 라운드로, 마지막이면 win', () => {
  const w = createWorld({ rng: () => 0 });
  w.screen = 'playing';
  for (const b of w.bricks) b.visible = false;

  const events = [];
  checkLevelComplete(w, events);
  assert.equal(w.round, 2);
  assert.equal(w.screen, 'levelComplete');
  assert.equal(w.transition.kind, 'advanceLevel');
  assert.equal(w.transition.ticksLeft, LEVEL_ADVANCE_TICKS);
  assert.deepEqual(events, ['levelComplete']);

  const last = createWorld({ rng: () => 0 });
  last.screen = 'playing';
  last.round = LEVEL_COUNT;
  last.bricks = last.bricks.map((b) => ({ ...b, visible: false }));

  const winEvents = [];
  checkLevelComplete(last, winEvents);
  assert.equal(last.round, LEVEL_COUNT + 1);
  assert.equal(last.screen, 'win');
  assert.equal(last.transition, null);
  assert.deepEqual(winEvents, ['win']);
});

test('checkLevelComplete: 하나라도 남아 있으면 아무 일도 없다', () => {
  const w = createWorld({ rng: () => 0 });
  w.screen = 'playing';
  for (const b of w.bricks) b.visible = false;
  w.bricks[40].visible = true;

  checkLevelComplete(w, []);
  assert.equal(w.round, 1);
  assert.equal(w.screen, 'playing');
  assert.equal(w.transition, null);
});

test('ballSpeed 는 라운드에 따라 오르고 S 에서 절반', () => {
  const w = createWorld({ rng: () => 0 });

  w.round = 1;
  assert.equal(ballSpeed(w), 4);
  w.round = 5;
  assert.ok(Math.abs(ballSpeed(w) - 5.92) < 1e-9);

  w.activeEffects.S = 10;
  assert.ok(Math.abs(ballSpeed(w) - 2.96) < 1e-9);
});
