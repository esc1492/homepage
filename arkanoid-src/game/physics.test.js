import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BALL_R,
  BEAD_R,
  CEILING_Y,
  H,
  PADDLE_W,
  PADDLE_WIDE,
  WALL_LEFT,
  WALL_RIGHT,
} from './constants.js';
import { makeBrick } from './levels.js';
import { clampPaddle, paddleXFromClientX, stepBall } from './physics.js';
import { ballSpeed, createWorld } from './world.js';

const magnitude = (b) => Math.hypot(b.dx, b.dy);

/** 공·브릭·패들을 지정해 한 틱 돌립니다. */
function scenario({ ball, bricks, effects }) {
  const w = createWorld({ rng: () => 0 });
  w.screen = 'playing';
  if (bricks) w.bricks = bricks;
  if (effects) w.activeEffects = effects;
  Object.assign(w.ball, ball);
  const events = [];
  stepBall(w, events);
  return { w, events };
}

test('clampPaddle 은 양 끝에서 paddle.w 를 따라간다', () => {
  const w = createWorld({ rng: () => 0 });

  w.paddle.x = -100;
  clampPaddle(w);
  assert.equal(w.paddle.x, WALL_LEFT + BEAD_R); // 18

  w.paddle.x = 9999;
  clampPaddle(w);
  assert.equal(w.paddle.x, WALL_RIGHT - PADDLE_W - BEAD_R); // 302

  // 넓어진 패들은 오른쪽 한계가 달라집니다 (E 아이템의 핵심).
  w.paddle.w = PADDLE_WIDE;
  w.paddle.x = 9999;
  clampPaddle(w);
  assert.equal(w.paddle.x, WALL_RIGHT - PADDLE_WIDE - BEAD_R); // 262
});

test('paddleXFromClientX 는 논리 폭 W 로 환산한다 — canvas.width 를 보지 않는다', () => {
  // 같은 손가락 위치는 화면 배율과 무관하게 같은 패들 위치여야 합니다.
  assert.equal(paddleXFromClientX(200, 0, 400, PADDLE_W), 160);
  // CSS 로 절반 크기로 줄어든 캔버스
  assert.equal(paddleXFromClientX(100, 0, 200, PADDLE_W), 160);
  // rect.left 보정
  assert.equal(paddleXFromClientX(300, 100, 400, PADDLE_W), 160);

  // ⚠️ DPR 회귀 가드: 인자가 4개뿐이라 canvas.width(2배 화면에서 800)를 참조할 방법이
  //    없습니다. 원본의 `bc.width / rect.width` 를 그대로 옮기면 여기서 2배가 됐습니다.
  assert.equal(paddleXFromClientX.length, 4);
});

test('패들 반사는 속도 크기를 보존하고 항상 위로 보낸다', () => {
  // 패들은 x 160..240 (기본 위치), y 540.
  // 충돌 판정은 이동 **뒤** 좌표로 하므로 접촉 순간의 x 를 맞추려면 dx 만큼 당겨 둡니다.
  for (const contactX of [160, 180, 200, 220, 240]) {
    const { w, events } = scenario({
      ball: { x: contactX - 3, y: 532, r: BALL_R, dx: 3, dy: 4 },
    });

    assert.equal(w.ball.x, contactX, `접촉 x=${contactX}`);
    assert.ok(Math.abs(magnitude(w.ball) - 5) < 1e-9, `x=${contactX} 속도 크기`);
    assert.ok(w.ball.dy < 0, `x=${contactX} 반사 후 위로`);
    assert.equal(w.ball.y, w.paddle.y - w.ball.r);
    assert.ok(events.includes('paddleHit'));
  }
});

test('패들 중앙에 맞으면 수평 성분이 0 이 된다', () => {
  // 충돌 판정은 공이 이동한 **뒤**에 하므로, x 를 미리 당겨 두어야 접촉 순간 중심이 됩니다.
  const { w } = scenario({ ball: { x: 197, y: 532, r: BALL_R, dx: 3, dy: 4 } });
  assert.equal(w.ball.x, 200);
  assert.ok(Math.abs(w.ball.dx) < 1e-9);
  assert.ok(w.ball.dy < 0);
});

test('S 아이템이 걸려 있으면 반사 후 속도가 ballSpeed 로 제한된다', () => {
  const { w } = scenario({
    ball: { x: 200, y: 532, r: BALL_R, dx: 3, dy: 4 },
    effects: { S: 10 },
  });

  const limit = ballSpeed(w); // 4 * 0.5 = 2
  assert.ok(magnitude(w.ball) <= limit + 1e-9, `${magnitude(w.ball)} <= ${limit}`);
});

test('C 아이템: 공을 잡으면 불리언이 소비되고 공이 멈춘다', () => {
  const { w, events } = scenario({
    ball: { x: 200, y: 532, r: BALL_R, dx: 3, dy: 4 },
    effects: { C: true },
  });

  assert.equal(w.ball.caught, true);
  assert.equal(w.ball.dx, 0);
  assert.equal(w.ball.dy, 0);
  assert.equal('C' in w.activeEffects, false);
  assert.ok(events.includes('paddleHit'));
});

test('브릭 충돌: 최소 관통축이 x 면 dx 만 뒤집고 왼쪽으로 밀어낸다', () => {
  const brick = makeBrick(2, 5); // x 169..200, y 134..150
  const { w, events } = scenario({
    bricks: [brick],
    ball: { x: 167, y: 143, r: BALL_R, dx: 1, dy: 1 },
  });

  assert.equal(w.ball.dx, -1);
  assert.equal(w.ball.dy, 1, 'dy 는 그대로여야 합니다');
  assert.equal(w.ball.x, 162); // b.x - r
  assert.equal(brick.visible, false);
  assert.ok(events.includes('brickBroken'));
});

test('브릭 충돌: 최소 관통축이 y 면 dy 만 뒤집고 위로 밀어낸다', () => {
  const brick = makeBrick(2, 5);
  const { w } = scenario({
    bricks: [brick],
    ball: { x: 184, y: 131, r: BALL_R, dx: 0, dy: 1 },
  });

  assert.equal(w.ball.dx, 0);
  assert.equal(w.ball.dy, -1);
  assert.equal(w.ball.y, 127); // b.y - r
});

test('브릭 충돌: 아래에서 올라와 맞으면 아래로 밀어낸다', () => {
  const brick = makeBrick(2, 5);
  const { w } = scenario({
    bricks: [brick],
    ball: { x: 184, y: 152, r: BALL_R, dx: 0, dy: -1 },
  });

  assert.equal(w.ball.y, 157); // b.y + b.h + r
  assert.equal(w.ball.dy, 1);
});

test('한 틱에는 브릭 하나만 맞는다', () => {
  const left = makeBrick(2, 5);
  const right = makeBrick(2, 6);
  const { w } = scenario({
    bricks: [left, right],
    ball: { x: 185, y: 143, r: BALL_R, dx: 0, dy: 1 },
  });

  assert.equal(left.visible, false);
  assert.equal(right.hp, 1, '두 번째 브릭은 손대지 않아야 합니다');
});

test('파괴 불가 브릭은 hp 를 지키고 wallHit 을 낸다', () => {
  const gold = makeBrick(0, 1, 99, 99, '#B8860B', { destructible: false });
  const { w, events } = scenario({
    bricks: [gold],
    ball: { x: 40, y: 110, r: BALL_R, dx: 1, dy: 0 },
  });

  assert.equal(gold.hp, 99);
  assert.equal(gold.visible, true);
  assert.ok(events.includes('wallHit'));
  assert.ok(!events.includes('brickBroken'));
  assert.equal(w.score, 0);
});

test('천장은 54 이고 벽은 14 / 386 이다', () => {
  const ceiling = scenario({ bricks: [], ball: { x: 200, y: CEILING_Y + BALL_R + 1, r: BALL_R, dx: 0, dy: -2 } });
  assert.equal(ceiling.w.ball.y, CEILING_Y + BALL_R);
  assert.equal(ceiling.w.ball.dy, 2);

  const high = scenario({ bricks: [], ball: { x: 200, y: 300, r: BALL_R, dx: 0, dy: -2 } });
  assert.equal(high.w.ball.y, 298, '천장 근처가 아니면 건드리지 않습니다');
  assert.equal(high.w.ball.dy, -2);

  const left = scenario({ bricks: [], ball: { x: WALL_LEFT + BALL_R + 1, y: 300, r: BALL_R, dx: -2, dy: 0 } });
  assert.equal(left.w.ball.x, WALL_LEFT + BALL_R);
  assert.equal(left.w.ball.dx, 2);

  const right = scenario({ bricks: [], ball: { x: WALL_RIGHT - BALL_R - 1, y: 300, r: BALL_R, dx: 2, dy: 0 } });
  assert.equal(right.w.ball.x, WALL_RIGHT - BALL_R);
  assert.equal(right.w.ball.dx, -2);
});

test('바닥: 추가 공이 남아 있으면 생명 대신 그 공을 물려받는다', () => {
  const w = createWorld({ rng: () => 0 });
  w.screen = 'playing';
  w.bricks = [];
  w.extraBalls = [{ x: 100, y: 200, r: BALL_R, dx: 1, dy: -1 }];
  Object.assign(w.ball, { x: 200, y: H - BALL_R - 1, r: BALL_R, dx: 0, dy: 2 });

  const events = [];
  stepBall(w, events);

  assert.equal(w.lives, 3, '생명을 잃으면 안 됩니다');
  assert.equal(w.extraBalls.length, 0);
  assert.equal(w.ball.x, 100);
  assert.equal(w.ball.y, 200);
  assert.equal(w.ball.dx, 1);
  assert.equal(w.ball.dy, -1);
  assert.ok(!events.includes('lifeLost'));
});

test('바닥: 추가 공이 없으면 생명을 잃는다', () => {
  const w = createWorld({ rng: () => 0 });
  w.screen = 'playing';
  w.bricks = [];
  Object.assign(w.ball, { x: 200, y: H - BALL_R - 1, r: BALL_R, dx: 0, dy: 2 });

  const events = [];
  stepBall(w, events);

  assert.equal(w.lives, 2);
  assert.equal(w.screen, 'lost');
  assert.ok(events.includes('lifeLost'));
});
