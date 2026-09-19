'use client';

import { useCallback, useEffect, useRef } from 'react';

import { H, W } from '../game/constants.js';
import { drawScene, setupCanvas } from '../game/render.js';
import { stepWorld } from '../game/step.js';
import { createWorld, launchBall, releaseBall, startGame } from '../game/world.js';
import { useAudio } from '../hooks/useAudio.js';
import { useGameLoop } from '../hooks/useGameLoop.js';
import { useKeyboard } from '../hooks/useKeyboard.js';
import { usePointer } from '../hooks/usePointer.js';
import ControlBar from './ControlBar.jsx';

/** 사건 → 효과음 파일. 원본의 playSound 호출 위치를 그대로 옮긴 것입니다. */
const EVENT_SOUND = {
  paddleHit: 'swipe',
  ballLaunched: 'drop',
  itemCollected: 'drop',
  brickBroken: 'change',
  wallHit: 'break',
  lifeLost: 'break',
  // levelComplete / gameOver / win 은 원본에 소리가 없습니다.
};

/**
 * 알카노이드.
 *
 * ⚠️ 여기에는 useState 가 없습니다. HUD·오버레이·점수·목숨이 전부 캔버스에 그려지므로
 *    (원본 drawHUD 가 목숨을 미니 패들로 그립니다) 매 프레임 React 가 다시 그릴 것이 없습니다.
 *    월드는 ref 안의 가변 객체이고 rAF 루프가 직접 갱신합니다 — 초당 60회 복사할 이유가 없고,
 *    패들↔공 커플링이 순서에 민감해 React 스케줄러를 끼우면 얻는 것 없이 변수만 늘어납니다.
 *    대신 game/ 모듈이 React·DOM 을 모르게 두어 node --test 로 검증합니다.
 */
export default function ArkanoidGame() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const bgRef = useRef(null);
  const worldRef = useRef(null);
  const inputRef = useRef({ left: false, right: false, dir: 0, targetX: null });

  // 지연 초기화 — createWorld 는 DOM 을 모르므로 SSR 프리렌더에서도 안전합니다.
  // (navigator 를 읽는 isMobile 은 마운트 후 effect 에서 설정합니다.)
  if (worldRef.current === null) worldRef.current = createWorld();

  const { play, unlock } = useAudio();

  const playEvents = useCallback(
    (events) => {
      for (const event of events) {
        const name = EVENT_SOUND[event];
        if (name) play(name);
      }
    },
    [play],
  );

  const onTick = useCallback(() => {
    playEvents(stepWorld(worldRef.current, inputRef.current));
  }, [playEvents]);

  const onDraw = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return; // 캔버스 준비 전 — 다음 프레임에 다시 시도합니다
    drawScene(ctx, worldRef.current, { bg: bgRef.current });
  }, []);

  useGameLoop({ onTick, onDraw });

  /** 발사 / 잡은 공 놓기 / 재시작 — 탭·Space·Enter·LAUNCH 버튼이 모두 여기로 옵니다. */
  const handleAction = useCallback(() => {
    const world = worldRef.current;
    const events = [];

    if (world.screen === 'ready') {
      launchBall(world, events);
    } else if (world.screen === 'playing' && world.ball.caught) {
      releaseBall(world, events);
    } else if (world.screen === 'gameOver' || world.screen === 'win') {
      startGame(world);
    }

    playEvents(events);
    unlock();
  }, [playEvents, unlock]);

  const handleDir = useCallback((dir) => {
    inputRef.current.dir = dir;
  }, []);

  usePointer({ canvasRef, worldRef, inputRef, onTap: handleAction });
  useKeyboard({ inputRef, onAction: handleAction });

  // 캔버스 준비 + DPR 보정
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const setup = () => {
      ctxRef.current = setupCanvas(canvas, W, H);
    };
    setup();
    // 기기 회전 등으로 devicePixelRatio 가 바뀌면 다시 맞춥니다.
    window.addEventListener('resize', setup);
    return () => window.removeEventListener('resize', setup);
  }, []);

  // 배경 이미지 (원본은 base64 인라인이었습니다)
  useEffect(() => {
    const img = new Image();
    img.src = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/bg/arkanoid.webp`;
    bgRef.current = img;
    return () => {
      bgRef.current = null;
    };
  }, []);

  // 원본은 ('ontouchstart' in window) || navigator.maxTouchPoints > 0 으로 READY 안내 문구를
  // 골랐습니다. navigator 는 브라우저 전용이라 effect 에서 읽습니다.
  useEffect(() => {
    worldRef.current.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // 첫 제스처에서 오디오 잠금을 풉니다 (일부 브라우저는 Audio 요소 단위로 잠급니다).
  useEffect(() => {
    const once = () => {
      unlock();
      window.removeEventListener('pointerdown', once);
      window.removeEventListener('keydown', once);
    };
    window.addEventListener('pointerdown', once);
    window.addEventListener('keydown', once);
    return () => {
      window.removeEventListener('pointerdown', once);
      window.removeEventListener('keydown', once);
    };
  }, [unlock]);

  return (
    <div className="app">
      <div className="game-area">
        {/* tabindex 를 주지 않습니다 — 키보드는 window 에서 받습니다. */}
        <canvas ref={canvasRef} className="board" />
        <ControlBar onDir={handleDir} onLaunch={handleAction} />
      </div>
    </div>
  );
}
