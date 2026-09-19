// 원본 arkanoid_streamlit.py GAME_HTML_TEMPLATE 의 상수 (118–144행).
// React 도 DOM 도 import 하지 않습니다 — node --test 로 그대로 검증됩니다.

// 보드
export const W = 400;
export const H = 580;

export const BALL_R = 7;
export const PADDLE_W = 80;
export const PADDLE_H = 12;
export const PADDLE_Y = 540;
export const BALL_BASE = 4;

export const COLS = 12;
export const ROWS = 6;
export const BRICK_W = 31;
export const BRICK_H = 16;
export const GAP = 0;
export const BRICK_LEFT = (W - COLS * BRICK_W - (COLS - 1) * GAP) / 2; // 14
export const BRICK_TOP = 102;

export const WALL_LEFT = 14;
export const WALL_RIGHT = 386;
export const BEAD_R = 4;
export const CEILING_Y = 54;

export const BRICK_COLORS = ['#FFD700', '#4CAF50', '#FF9800', '#F44336', '#2196F3', '#9C27B0'];

// 아이템
export const ITEM_SIZE = 18;
export const ITEM_W = 42;
export const ITEM_SPEED = 1.6;
export const ITEM_DROP_CHANCE = 0.12;

export const ITEM_TYPES = {
  D: { color: '#44CC44', letter: 'D' },
  E: { color: '#4488FF', letter: 'E' },
  C: { color: '#4488FF', letter: 'C' },
  S: { color: '#4488FF', letter: 'S' },
  L: { color: '#FF6B6B', letter: 'L' },
  B: { color: '#FFD700', letter: 'B' },
  P: { color: '#FFD700', letter: 'P' },
};

// 가중치 합 95. 누적 순서가 뽑힐 타입을 정하므로 테스트로 순서를 고정합니다.
// (world.js 의 dropItem 은 이 목록을 훑으며 누적합을 빼므로, 합이 얼마든 마지막 항목까지 간다.)
export const ITEM_WEIGHTS = [
  { type: 'D', w: 30 },
  { type: 'E', w: 15 },
  { type: 'C', w: 15 },
  { type: 'S', w: 15 },
  { type: 'L', w: 10 },
  { type: 'B', w: 5 },
  { type: 'P', w: 5 },
];

export const PADDLE_WIDE = 120;
export const LASER_DURATION = 480;
export const ENLARGE_DURATION = 600;
export const SLOW_DURATION = 480;
export const LASER_COOLDOWN = 16;
export const PORTAL_W = 14;
export const PORTAL_H = 48;

export const LEVEL_COUNT = 5;

// 조작 — 모두 px/틱 입니다
export const KEY_SPEED = 6;
export const LASER_SPEED = -7;
export const TAP_SLOP = 12;

/**
 * 고정 타임스텝.
 *
 * 원본 loop() 는 rAF 타임스탬프를 쓰지 않고 프레임마다 고정 px 를 더해, 120Hz 디스플레이에서
 * 게임이 정확히 2배로 빨랐습니다. 물리를 초당 60회 고정 스텝으로 돌려 상수를 그대로 살립니다.
 */
export const TICK_HZ = 60;
export const TICK_MS = 1000 / TICK_HZ; // 16.667
export const MAX_TICKS_PER_FRAME = 5;

/**
 * ⚠️ 테트리스의 200ms 를 그대로 쓰면 안 됩니다.
 *
 * 테트리스 틱 간격은 ≥80ms 라 200ms 가 2.5틱이지만, 여기 틱은 16.667ms 라 200ms 는 12틱입니다.
 * 라운드 5에서 공은 틱당 5.92px 을 가므로 한 프레임에 최대 71px 을 순간이동해 브릭(높이 16px)과
 * 패들을 그냥 통과합니다. 그래서 손으로 고르지 않고 틱 상한에서 파생합니다.
 */
export const MAX_FRAME_DELTA_MS = MAX_TICKS_PER_FRAME * TICK_MS; // 83.33

// 원본의 setTimeout(resetBall, 800) / setTimeout(..., 1200) 을 틱으로 환산한 값.
// 둘 다 정확히 나눠떨어집니다 — TICK_HZ 가 바뀌어도 ms 가 기준이 되도록 반올림합니다.
export const LIFE_RESPAWN_TICKS = Math.round(800 / TICK_MS); // 48
export const LEVEL_ADVANCE_TICKS = Math.round(1200 / TICK_MS); // 72

// 틱 진행 중 발생한 사건. 엔진은 소리를 낼 수 없으므로 데이터로 돌려주고
// ArkanoidGame.jsx 가 mp3 로 매핑합니다.
export const EV = {
  paddleHit: 'paddleHit',
  wallHit: 'wallHit',
  brickBroken: 'brickBroken',
  ballLaunched: 'ballLaunched',
  itemCollected: 'itemCollected',
  lifeLost: 'lifeLost',
  levelComplete: 'levelComplete',
  gameOver: 'gameOver',
  win: 'win',
};
