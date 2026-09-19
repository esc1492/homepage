// 한 틱. 원본 loop() 의 물리 절반 (805–812행) 에 해당합니다.
// React 도 DOM 도 import 하지 않습니다.
//
// ⚠️ 이 함수는 타임스탬프를 받지 않습니다. 그래서 60틱은 화면 주사율과 무관하게 항상
// 1초 분량입니다 — 120Hz 디스플레이에서 2배로 빨랐던 원본 버그가 구조적으로 불가능해집니다.

import {
  glueBallToPaddle,
  stepBall,
  stepEffects,
  stepExtraBalls,
  stepItems,
  stepLasers,
  stepPaddle,
} from './physics.js';
import { resolveTransition } from './world.js';

/**
 * @param world 가변 월드 (제자리에서 갱신됩니다)
 * @param input 틱마다 재사용되는 스크래치 객체 { left, right, dir, targetX }
 * @returns 이번 틱에 일어난 사건 이름의 배열 (순서 보장)
 */
export function stepWorld(world, input) {
  const events = [];

  // 1. 전환 카운트다운 — 화면 상태와 무관하게 진행됩니다 ('lost'·'levelComplete' 가 바로 그 시점).
  if (world.transition) {
    world.transition.ticksLeft--;
    if (world.transition.ticksLeft <= 0) resolveTransition(world, events);
  }

  // 2. 패들은 화면 상태와 무관하게 항상 움직입니다 (원본 loop 와 동일).
  stepPaddle(world, input);

  // 3. 'ready' 에서는 공이 패들 위에 붙어 따라옵니다 (원본 updateBall 의 ready 분기).
  if (world.screen === 'ready') glueBallToPaddle(world);

  // 4. 그 외 상태에서는 물리를 멈춥니다.
  if (world.screen !== 'playing') return events;

  // 5. ⚠️ 순서를 바꾸지 마십시오 — 원본 loop 의 순서입니다.
  stepEffects(world, events);
  stepItems(world, events);
  stepLasers(world, events);
  stepBall(world, events);
  stepExtraBalls(world, events);

  return events;
}
