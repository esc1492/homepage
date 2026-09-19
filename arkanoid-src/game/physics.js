// 틱당 한 번 도는 물리. 원본 226–341, 362–404, 730–802행.
// React 도 DOM 도 import 하지 않습니다.
//
// 부수효과(소리)는 events 배열에 문자열로 쌓입니다 — 엔진은 소리를 낼 수 없습니다.
// 의존 방향은 world.js 단방향입니다 (world 는 physics 를 import 하지 않습니다).

import {
  BEAD_R,
  CEILING_Y,
  EV,
  H,
  ITEM_SPEED,
  KEY_SPEED,
  LASER_COOLDOWN,
  LASER_SPEED,
  PADDLE_W,
  W,
  WALL_LEFT,
  WALL_RIGHT,
} from './constants.js';
import {
  activateItem,
  ballSpeed,
  checkLevelComplete,
  dropItem,
  loseLife,
  triggerLevelSkip,
} from './world.js';

export function clampPaddle(world) {
  const { paddle } = world;
  paddle.x = Math.max(WALL_LEFT + BEAD_R, Math.min(WALL_RIGHT - paddle.w - BEAD_R, paddle.x));
}

/**
 * CSS 클라이언트 좌표 → 패들 x.
 *
 * ⚠️ 원본은 `bc.width / rect.width` 로 환산했는데, 그건 canvas 의 width 속성이 논리 크기(400)라서
 * 맞는 식이었습니다. 이 포트는 setupCanvas 가 `canvas.width = cssW * dpr` 로 백킹 스토어를 키우므로
 * canvas.width 를 쓰면 2배 화면에서 패들이 손가락의 2배 위치로 날아갑니다.
 * 논리 상수 W 를 씁니다. 테스트 가능하도록 여기에 둡니다.
 */
export function paddleXFromClientX(clientX, rectLeft, rectWidth, paddleW) {
  return (clientX - rectLeft) * (W / rectWidth) - paddleW / 2;
}

export function glueBallToPaddle(world) {
  const { paddle, ball } = world;
  ball.x = paddle.x + paddle.w / 2;
  ball.y = paddle.y - ball.r - 1;
}

/**
 * input 은 틱마다 재사용되는 스크래치 객체입니다.
 * targetX 는 **소비 후 null 로 지웁니다** — 지우지 않으면 포인터가 멈춰 있어도 매 틱
 * 패들을 다시 끌어당겨 키보드 조작을 덮어씁니다.
 */
export function stepPaddle(world, input) {
  const { paddle } = world;
  if (input.left) paddle.x -= KEY_SPEED;
  if (input.right) paddle.x += KEY_SPEED;
  paddle.x += input.dir * KEY_SPEED;
  if (input.targetX !== null && input.targetX !== undefined) {
    paddle.x = input.targetX;
    input.targetX = null;
  }
  clampPaddle(world);
}

export function stepEffects(world, events) {
  const a = world.activeEffects;

  if (a.L) {
    if (--a.L <= 0) {
      // ⚠️ 원본도 여기서 return 합니다 — L 이 만료되는 틱에는 E·S 감소가 건너뛰어집니다.
      delete a.L;
      world.lasers = [];
      world.laserCooldown = 0;
      return;
    }
    if (--world.laserCooldown <= 0) {
      world.lasers.push({
        x: world.paddle.x + world.paddle.w / 2 - 1,
        y: world.paddle.y - 10,
        w: 2,
        h: 10,
        dy: LASER_SPEED,
      });
      world.laserCooldown = LASER_COOLDOWN;
    }
  }

  if (a.E && --a.E <= 0) {
    world.paddle.w = PADDLE_W;
    delete a.E;
  }
  if (a.S && --a.S <= 0) delete a.S;
}

export function stepItems(world, events) {
  if (world.items.length === 0) return;
  const { paddle } = world;

  for (let i = world.items.length - 1; i >= 0; i--) {
    const it = world.items[i];
    it.y += ITEM_SPEED;

    if (
      it.y + it.h >= paddle.y &&
      it.y <= paddle.y + paddle.h &&
      it.x + it.w >= paddle.x &&
      it.x <= paddle.x + paddle.w
    ) {
      activateItem(world, it.type);
      world.items.splice(i, 1);
      events.push(EV.itemCollected);
      continue;
    }

    if (it.y > H) world.items.splice(i, 1);
  }
}

export function stepLasers(world, events) {
  for (let i = world.lasers.length - 1; i >= 0; i--) {
    const l = world.lasers[i];
    l.y += l.dy;
    if (l.y + l.h < 0) {
      world.lasers.splice(i, 1);
      continue;
    }

    for (let j = 0; j < world.bricks.length; j++) {
      const b = world.bricks[j];
      if (!b.visible) continue;

      if (l.x + l.w > b.x && l.x < b.x + b.w && l.y + l.h > b.y && l.y < b.y + b.h) {
        if (b.destructible && b.maxHp < 99) {
          b.hp--;
          if (b.hp <= 0) {
            b.visible = false;
            world.score += 10 * world.round;
            events.push(EV.brickBroken);
            dropItem(world, b);
          }
        } else {
          events.push(EV.wallHit);
        }
        world.lasers.splice(i, 1);
        checkLevelComplete(world, events);
        break;
      }
    }
  }
}

/** 공 하나의 벽·패들·브릭·포탈 처리. stepBall 과 stepExtraBalls 가 공유합니다. */
function bounceOffPaddle(world, b) {
  const { paddle } = world;
  const hit = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
  const ang = (hit * Math.PI) / 3;
  const spd = Math.sqrt(b.dx * b.dx + b.dy * b.dy);
  b.dx = spd * Math.sin(ang);
  b.dy = -Math.abs(spd * Math.cos(ang));
  b.y = paddle.y - b.r;
  if (world.activeEffects.S) {
    const ms = ballSpeed(world);
    const cs = Math.sqrt(b.dx * b.dx + b.dy * b.dy);
    if (cs > ms) {
      b.dx *= ms / cs;
      b.dy *= ms / cs;
    }
  }
}

function overlapsPaddle(world, b) {
  const { paddle } = world;
  return (
    b.dy > 0 &&
    b.y + b.r >= paddle.y &&
    b.y + b.r <= paddle.y + paddle.h + 4 &&
    b.x >= paddle.x &&
    b.x <= paddle.x + paddle.w
  );
}

/** 원이 브릭과 겹치면 최소 관통축으로 반사하고 피해를 줍니다. 겹친 브릭 하나만 처리합니다. */
function resolveBrickHit(world, b, events) {
  for (let i = 0; i < world.bricks.length; i++) {
    const brick = world.bricks[i];
    if (!brick.visible) continue;

    const cx = Math.max(brick.x, Math.min(b.x, brick.x + brick.w));
    const cy = Math.max(brick.y, Math.min(b.y, brick.y + brick.h));
    const dx = b.x - cx;
    const dy = b.y - cy;
    if (dx * dx + dy * dy >= b.r * b.r) continue;

    const ox = Math.min(b.x + b.r - brick.x, brick.x + brick.w - (b.x - b.r));
    const oy = Math.min(b.y + b.r - brick.y, brick.y + brick.h - (b.y - b.r));
    if (ox < oy) {
      b.dx = -b.dx;
      if (b.x < brick.x + brick.w / 2) b.x = brick.x - b.r;
      else b.x = brick.x + brick.w + b.r;
    } else {
      b.dy = -b.dy;
      if (b.y < brick.y + brick.h / 2) b.y = brick.y - b.r;
      else b.y = brick.y + brick.h + b.r;
    }

    if (brick.destructible && brick.maxHp < 99) {
      brick.hp--;
      if (brick.hp <= 0) {
        brick.visible = false;
        world.score += 10 * world.round;
        events.push(EV.brickBroken);
        dropItem(world, brick);
      } else {
        events.push(EV.wallHit);
      }
    } else {
      events.push(EV.wallHit);
    }

    checkLevelComplete(world, events);
    return; // 한 틱에 브릭 하나만
  }
}

export function stepBall(world, events) {
  const { ball } = world;

  if (ball.caught) {
    glueBallToPaddle(world);
    return;
  }

  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x - ball.r <= WALL_LEFT) {
    ball.x = WALL_LEFT + ball.r;
    ball.dx = -ball.dx;
    events.push(EV.wallHit);
  }

  // ⚠️ 포탈 검사가 오른쪽 벽 검사보다 **먼저**입니다 (원본 순서).
  if (
    world.portal &&
    ball.x + ball.r >= world.portal.x &&
    ball.x - ball.r <= world.portal.x + world.portal.w &&
    ball.y + ball.r >= world.portal.y &&
    ball.y - ball.r <= world.portal.y + world.portal.h
  ) {
    world.portal = null;
    triggerLevelSkip(world, events);
    return;
  }

  if (ball.x + ball.r >= WALL_RIGHT) {
    ball.x = WALL_RIGHT - ball.r;
    ball.dx = -ball.dx;
    events.push(EV.wallHit);
  }
  if (ball.y - ball.r <= CEILING_Y) {
    ball.y = CEILING_Y + ball.r;
    ball.dy = -ball.dy;
    events.push(EV.wallHit);
  }

  if (ball.y + ball.r >= H) {
    if (world.extraBalls.length > 0) {
      // 추가 공이 남아 있으면 생명을 잃지 않고 그 공이 주 공이 됩니다.
      const eb = world.extraBalls.pop();
      ball.x = eb.x;
      ball.y = eb.y;
      ball.dx = eb.dx;
      ball.dy = eb.dy;
      return;
    }
    loseLife(world, events);
    return;
  }

  if (overlapsPaddle(world, ball)) {
    if (world.activeEffects.C) {
      ball.dx = 0;
      ball.dy = 0;
      ball.caught = true;
      delete world.activeEffects.C;
      events.push(EV.paddleHit);
      return;
    }
    bounceOffPaddle(world, ball);
    events.push(EV.paddleHit);
  }

  resolveBrickHit(world, ball, events);
}

export function stepExtraBalls(world, events) {
  for (let i = world.extraBalls.length - 1; i >= 0; i--) {
    const eb = world.extraBalls[i];
    eb.x += eb.dx;
    eb.y += eb.dy;

    if (eb.x - eb.r <= WALL_LEFT) {
      eb.x = WALL_LEFT + eb.r;
      eb.dx = -eb.dx;
      events.push(EV.wallHit);
    }
    if (eb.x + eb.r >= WALL_RIGHT) {
      eb.x = WALL_RIGHT - eb.r;
      eb.dx = -eb.dx;
      events.push(EV.wallHit);
    }
    if (eb.y - eb.r <= CEILING_Y) {
      eb.y = CEILING_Y + eb.r;
      eb.dy = -eb.dy;
      events.push(EV.wallHit);
    }
    if (eb.y + eb.r >= H) {
      world.extraBalls.splice(i, 1);
      continue;
    }

    // 원본은 추가 공의 패들 반사에는 소리를 내지 않습니다.
    if (overlapsPaddle(world, eb)) bounceOffPaddle(world, eb);

    if (
      world.portal &&
      eb.x + eb.r >= world.portal.x &&
      eb.x - eb.r <= world.portal.x + world.portal.w &&
      eb.y + eb.r >= world.portal.y &&
      eb.y - eb.r <= world.portal.y + world.portal.h
    ) {
      world.portal = null;
      triggerLevelSkip(world, events);
      return;
    }

    resolveBrickHit(world, eb, events);
  }
}
