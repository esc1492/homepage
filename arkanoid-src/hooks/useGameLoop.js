'use client';

import { useEffect, useRef } from 'react';

import { MAX_FRAME_DELTA_MS, MAX_TICKS_PER_FRAME, TICK_MS } from '../game/constants.js';

/**
 * requestAnimationFrame + 고정 타임스텝 누적기.
 *
 * 원본은 rAF 콜백의 타임스탬프를 쓰지 않고 프레임마다 고정 px 를 더했기 때문에 120Hz 화면에서
 * 게임이 정확히 2배로 빨랐습니다. 여기서는 물리를 초당 60회 고정 스텝으로 돌립니다 —
 * 그래서 60틱은 화면 주사율과 무관하게 항상 1초 분량입니다.
 *
 * 테트리스와 달리 `if` 가 아니라 `while` 입니다. 테트리스 간격은 ≥80ms 라 프레임당 1틱이면
 * 충분하지만, 16.667ms 틱에서는 30fps 화면(33ms)도 2틱을 돌려야 60Hz 시뮬레이션이 유지됩니다.
 *
 * 그리기는 틱 수와 무관하게 rAF 프레임당 한 번입니다.
 */
export function useGameLoop({ onTick, onDraw }) {
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const accRef = useRef(0);
  const tickRef = useRef(onTick);
  const drawRef = useRef(onDraw);

  // 매 렌더 후 최신 콜백으로 갱신합니다 (렌더 중 ref 쓰기를 피합니다).
  useEffect(() => {
    tickRef.current = onTick;
    drawRef.current = onDraw;
  });

  useEffect(() => {
    const loop = (ts) => {
      // 첫 프레임의 delta 는 0 입니다.
      if (!lastRef.current) lastRef.current = ts;
      // 탭 복귀 시 수 초치 delta 가 한 번에 들어와 물리가 폭주하는 것을 막습니다.
      // MAX_FRAME_DELTA_MS 는 MAX_TICKS_PER_FRAME 에서 파생된 값입니다 (constants.js 참조).
      const dt = Math.min(ts - lastRef.current, MAX_FRAME_DELTA_MS);
      lastRef.current = ts;
      accRef.current += dt;

      let ticks = 0;
      while (accRef.current >= TICK_MS && ticks < MAX_TICKS_PER_FRAME) {
        accRef.current -= TICK_MS;
        ticks++;
        tickRef.current();
      }
      // 상한에 걸렸으면 남은 누적분을 버립니다 — 영원히 따라잡기를 시도하지 않도록.
      if (ticks >= MAX_TICKS_PER_FRAME) accRef.current = 0;

      drawRef.current();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    // React StrictMode 는 개발 모드에서 effect 를 두 번 실행합니다.
    // 정리하지 않으면 rAF 루프가 2개 돌아 게임이 2배로 빨라집니다 — 우리가 고치려는 증상과
    // 똑같이 보이므로, 속도 문제를 확인할 때는 반드시 프로덕션 빌드에서 보십시오.
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
}
