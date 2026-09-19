// 월드 상태와 틱 단위가 아닌 액션들. 원본 219–360행.
// React 도 DOM 도 import 하지 않습니다.
//
// 의존 방향은 physics.js → world.js 단방향입니다. ballSpeed 가 world 에 있는 이유가 이것으로,
// physics 가 world 를 import 하는 한 방향만 유지해 순환 import 를 피합니다.

import {
  BALL_BASE,
  BALL_R,
  ENLARGE_DURATION,
  EV,
  H,
  ITEM_DROP_CHANCE,
  ITEM_SIZE,
  ITEM_TYPES,
  ITEM_W,
  ITEM_WEIGHTS,
  LASER_DURATION,
  LEVEL_ADVANCE_TICKS,
  LEVEL_COUNT,
  LIFE_RESPAWN_TICKS,
  PADDLE_H,
  PADDLE_W,
  PADDLE_WIDE,
  PADDLE_Y,
  PORTAL_H,
  PORTAL_W,
  SLOW_DURATION,
  W,
  WALL_RIGHT,
} from './constants.js';
import { genLevel } from './levels.js';

/** 매 호출이 새 가변 월드를 만듭니다. `rng` 는 테스트에서 상수로 주입할 수 있습니다. */
export function createWorld(options = {}) {
  const world = {
    screen: 'ready',
    score: 0,
    lives: 3,
    round: 1,
    bricks: [],
    paddle: { x: W / 2 - PADDLE_W / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H },
    ball: { x: W / 2, y: PADDLE_Y - BALL_R - 1, r: BALL_R, dx: 0, dy: 0, caught: false },
    items: [],
    lasers: [],
    extraBalls: [],
    activeEffects: {},
    portal: null,
    laserCooldown: 0,
    transition: null,
    // 마지막 레벨에서 B 포탈을 한 번은 반드시 보게 합니다. checkLevelComplete 는 골드 브릭이
    // 남아 있는 한 레벨을 끝내지 않으므로, 포탈이 안 나오면 클리어가 불가능합니다.
    portalGranted: false,
    isMobile: false,
    rng: options.rng ?? Math.random,
  };

  world.bricks = genLevel(0);
  resetBall(world);
  return world;
}

/** 라운드에 따른 공 속도(px/틱). S 아이템이 걸려 있으면 절반. */
export function ballSpeed(world) {
  const s = BALL_BASE * (1 + (world.round - 1) * 0.12);
  return world.activeEffects.S ? s * 0.5 : s;
}

export function resetBall(world) {
  const { paddle, ball } = world;
  ball.x = paddle.x + paddle.w / 2;
  ball.y = paddle.y - ball.r - 1;
  ball.dx = 0;
  ball.dy = 0;
  ball.caught = false;
  world.screen = 'ready';
}

export function startGame(world) {
  world.score = 0;
  world.lives = 3;
  world.round = 1;
  // 원본과 같은 순서 — x 를 먼저 계산하고 w 를 되돌립니다.
  world.paddle.x = W / 2 - world.paddle.w / 2;
  world.paddle.w = PADDLE_W;
  world.extraBalls = [];
  world.items = [];
  world.lasers = [];
  world.activeEffects = {};
  world.portal = null;
  world.laserCooldown = 0;
  world.transition = null;
  world.portalGranted = false;
  world.bricks = genLevel(0);
  resetBall(world);
}

export function launchBall(world, events) {
  if (world.screen !== 'ready') return;
  const spd = ballSpeed(world);
  const ang = (world.rng() - 0.5) * 0.7;
  world.ball.dx = spd * Math.sin(ang) || 0.1; // 완전 수직 발사 방지
  world.ball.dy = -spd * Math.cos(ang);
  world.screen = 'playing';
  events.push(EV.ballLaunched);
}

export function releaseBall(world, events) {
  if (!world.ball.caught) return;
  const spd = ballSpeed(world);
  const ang = (world.rng() - 0.5) * 0.7;
  world.ball.dx = spd * Math.sin(ang) || 0.1;
  world.ball.dy = -Math.abs(spd * Math.cos(ang));
  world.ball.caught = false;
  events.push(EV.ballLaunched);
}

export function loseLife(world, events) {
  world.lives--;
  events.push(EV.lifeLost); // 원본은 여기서도 'wall' 소리를 냅니다
  if (world.lives <= 0) {
    world.screen = 'gameOver';
    // ⚠️ 원본은 여기서 이전 생명 감소의 setTimeout 을 그대로 둡니다. 그 타이머가 800ms 뒤에
    //    resetBall 을 불러 gameState 를 'ready' 로 되돌리므로, 게임오버가 저절로 풀립니다.
    //    틱 카운터로 옮기면서 함께 고칩니다.
    world.transition = null;
    events.push(EV.gameOver);
  } else {
    world.screen = 'lost';
    world.transition = { kind: 'respawn', ticksLeft: LIFE_RESPAWN_TICKS };
  }
}

export function checkLevelComplete(world, events) {
  for (let i = 0; i < world.bricks.length; i++) {
    if (world.bricks[i].visible) return;
  }
  advanceRound(world, events);
}

/** 포탈에 들어갔을 때의 레벨 건너뛰기. 원본 triggerLevelSkip 은 playing 일 때만 동작합니다. */
export function triggerLevelSkip(world, events) {
  if (world.screen !== 'playing') return;
  advanceRound(world, events);
}

function advanceRound(world, events) {
  world.round++;
  if (world.round > LEVEL_COUNT) {
    world.screen = 'win';
    events.push(EV.win);
    return;
  }
  world.screen = 'levelComplete';
  events.push(EV.levelComplete);
  // 원본의 setTimeout(..., 1200) 을 틱 카운터로 바꾼 것 — 언마운트 후 발화하지 않습니다.
  world.transition = { kind: 'advanceLevel', ticksLeft: LEVEL_ADVANCE_TICKS };
}

/** transition 카운트다운이 0 이 되었을 때 stepWorld 가 호출합니다. */
export function resolveTransition(world, events) {
  const t = world.transition;
  world.transition = null;
  if (!t) return;

  if (t.kind === 'advanceLevel') {
    world.bricks = genLevel(world.round - 1);
    world.extraBalls = [];
    world.items = [];
    world.lasers = [];
    world.activeEffects = {};
    world.portal = null;
    world.laserCooldown = 0;
    world.ball.caught = false;
    world.paddle.w = PADDLE_W;
  }
  resetBall(world);
}

export function dropItem(world, brick) {
  // 화면에 아이템은 하나뿐입니다.
  if (world.items.length > 0) return;
  if (brick.maxHp !== 1) return; // 실버(2HP)·골드(99HP)는 떨어뜨리지 않습니다

  let type;
  if (world.round === LEVEL_COUNT && !world.portalGranted) {
    // 마지막 레벨의 골드 브릭은 파괴할 수 없어 포탈이 유일한 통과 수단입니다. 그런데
    // 1-HP 브릭 30개 × 12% × B 가중치 5% 로는 기대값이 3개 남짓이라 대부분 막힙니다.
    // 확률·종류 굴림을 건너뛰고 한 번은 반드시 B 를 지급합니다.
    // items.length 게이트는 위에서 이미 통과했으므로 "한 번에 하나" 불변식은 유지되고,
    // 플래그는 아직 서지 않았으니 보장이 사라지지도 않습니다.
    type = 'B';
    world.portalGranted = true;
  } else {
    if (world.rng() > ITEM_DROP_CHANCE) return;
    let total = 0;
    for (let i = 0; i < ITEM_WEIGHTS.length; i++) total += ITEM_WEIGHTS[i].w;
    let r = world.rng() * total;
    for (let i = 0; i < ITEM_WEIGHTS.length; i++) {
      r -= ITEM_WEIGHTS[i].w;
      if (r <= 0) {
        type = ITEM_WEIGHTS[i].type;
        break;
      }
    }
  }

  world.items.push({
    x: brick.x + brick.w / 2 - ITEM_W / 2,
    y: brick.y + brick.h / 2 - ITEM_SIZE / 2,
    w: ITEM_W,
    h: ITEM_SIZE,
    type,
    color: ITEM_TYPES[type].color,
    letter: ITEM_TYPES[type].letter,
  });
}

export function activateItem(world, type) {
  switch (type) {
    case 'L':
      world.activeEffects.L = LASER_DURATION;
      break;
    case 'C':
      // 카운터가 아니라 불리언입니다 — stepEffects 가 감소시키면 안 됩니다.
      world.activeEffects.C = true;
      break;
    case 'E':
      world.paddle.w = PADDLE_WIDE;
      world.activeEffects.E = ENLARGE_DURATION;
      break;
    case 'D':
      for (let i = 0; i < 2; i++) {
        const spd = ballSpeed(world);
        const ang = (world.rng() - 0.5) * 0.8 + (i === 0 ? -0.5 : 0.5);
        world.extraBalls.push({
          x: world.ball.x,
          y: world.ball.y,
          r: BALL_R,
          dx: spd * Math.sin(ang) || 0.1,
          dy: -Math.abs(spd * Math.cos(ang)),
        });
      }
      break;
    case 'S':
      world.activeEffects.S = SLOW_DURATION;
      break;
    case 'B':
      world.portal = {
        x: WALL_RIGHT - PORTAL_W - 2,
        y: H / 2 - PORTAL_H / 2,
        w: PORTAL_W,
        h: PORTAL_H,
      };
      break;
    case 'P':
      world.lives++;
      break;
    default:
      break;
  }
}
