import { useCallback, useEffect, useRef } from 'react';

import { MAX_FRAME_DELTA_MS, speedForLevel } from '../game/constants.js';

/**
 * requestAnimationFrame 기반 게임 루프.
 *
 * - 하강 타이밍: delta 를 누적해 speedForLevel(level) 을 넘을 때마다 onTick()
 * - 그리기: 매 프레임 onDraw() — React 렌더를 거치지 않습니다
 *
 * setInterval 이 아니라 rAF 를 쓰는 이유:
 *  1. 백그라운드 탭에서 자동으로 멈춰 게임이 알아서 일시정지됩니다.
 *  2. 타임스탬프 기반이라 타이머 드리프트가 없습니다.
 *  3. 그리기 주기와 정확히 일치해 티어링이 없습니다.
 *
 * effect 의존성을 [] 로 두고 콜백은 ref 로 받습니다. 루프를 재시작하지 않기 위함이며,
 * 한 프레임 늦게 반영되어도 reduce() 가 status !== 'playing' 을 무시하므로 안전합니다.
 */
export function useGameLoop({ playing, level, onTick, onDraw }) {
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const accRef = useRef(0);

  const playingRef = useRef(playing);
  const levelRef = useRef(level);
  const tickRef = useRef(onTick);
  const drawRef = useRef(onDraw);

  // 매 렌더 후 최신 값으로 갱신 (렌더 중 ref 쓰기를 피합니다)
  useEffect(() => {
    playingRef.current = playing;
    levelRef.current = level;
    tickRef.current = onTick;
    drawRef.current = onDraw;
  });

  useEffect(() => {
    const loop = (ts) => {
      if (!lastRef.current) lastRef.current = ts;
      // 탭 복귀 시 수 초치 delta 가 한 번에 들어와 하강이 폭주하는 것을 막습니다.
      const dt = Math.min(ts - lastRef.current, MAX_FRAME_DELTA_MS);
      lastRef.current = ts;

      if (playingRef.current) {
        accRef.current += dt;
        const interval = speedForLevel(levelRef.current);
        if (accRef.current >= interval) {
          accRef.current -= interval;
          tickRef.current();
        }
      }

      drawRef.current();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    // React StrictMode 는 effect 를 두 번 실행합니다.
    // 정리하지 않으면 rAF 루프가 2개 돌아 하강 속도가 2배가 됩니다.
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /** 소프트 드롭 직후 호출 — 다음 자동 하강까지의 시간을 초기화합니다. */
  const resetTimer = useCallback(() => {
    accRef.current = 0;
  }, []);

  return { resetTimer };
}
