'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';

import { BOARD_H, BOARD_W, NEXT_SIZE } from '../game/constants.js';
import { createInitialState, reduce } from '../game/reducer.js';
import { drawNext, drawScene, setupCanvas } from '../game/render.js';
import { useAudio } from '../hooks/useAudio.js';
import { useGameLoop } from '../hooks/useGameLoop.js';
import { useKeyboard } from '../hooks/useKeyboard.js';
import { useSwipe } from '../hooks/useSwipe.js';
import HudPanel from './HudPanel.jsx';
import TouchControls from './TouchControls.jsx';

const START_LABEL = {
  idle: '▶ 시작',
  playing: '▶ 재시작',
  over: '▶ 다시 시작',
};

export default function TetrisGame() {
  const [state, dispatch] = useReducer(reduce, undefined, createInitialState);

  const boardRef = useRef(null);
  const nextRef = useRef(null);
  const boardCtxRef = useRef(null);
  const nextCtxRef = useRef(null);

  // rAF 루프는 React 렌더를 거치지 않고 여기서 최신 상태를 읽습니다.
  const stateRef = useRef(state);
  const statusRef = useRef(state.status);
  const needsDrawRef = useRef(true);

  const { enabled: soundEnabled, play, startTheme, stopTheme, toggle } = useAudio();

  const isPlaying = state.status === 'playing';

  useEffect(() => {
    stateRef.current = state;
    statusRef.current = state.status;
    needsDrawRef.current = true;
  });

  const onDraw = useCallback(() => {
    // 게임 중에는 매 프레임, 그 외에는 상태가 바뀐 다음 프레임에만 그립니다.
    const playing = statusRef.current === 'playing';
    if (!playing && !needsDrawRef.current) return;

    const boardCtx = boardCtxRef.current;
    if (!boardCtx) return; // 캔버스 준비 전 — 다음 프레임에 다시 시도

    needsDrawRef.current = false;
    drawScene(boardCtx, stateRef.current);

    const nextCtx = nextCtxRef.current;
    if (nextCtx) drawNext(nextCtx, stateRef.current.next);
  }, []);

  const onTick = useCallback(() => dispatch({ type: 'drop' }), []);

  const { resetTimer } = useGameLoop({
    playing: isPlaying,
    level: state.level,
    onTick,
    onDraw,
  });

  // DPR 보정 + 캔버스 준비
  useEffect(() => {
    const boardCanvas = boardRef.current;
    const nextCanvas = nextRef.current;
    if (!boardCanvas || !nextCanvas) return undefined;

    const setup = () => {
      boardCtxRef.current = setupCanvas(boardCanvas, BOARD_W, BOARD_H);
      nextCtxRef.current = setupCanvas(nextCanvas, NEXT_SIZE, NEXT_SIZE);
      needsDrawRef.current = true;
    };

    setup();
    // 기기 회전 등으로 devicePixelRatio 가 바뀌면 다시 맞춥니다.
    window.addEventListener('resize', setup);
    return () => window.removeEventListener('resize', setup);
  }, []);

  // --- 입력 ---

  const handleMove = useCallback((dx) => dispatch({ type: 'move', dx }), []);

  const handleRotate = useCallback(() => {
    dispatch({ type: 'rotate' });
    play('change'); // 원본과 동일: 회전이 실제로 됐는지와 무관하게 재생
  }, [play]);

  const handleSoftDrop = useCallback(() => {
    dispatch({ type: 'drop' });
    resetTimer(); // 다음 자동 하강까지의 시간을 초기화
  }, [resetTimer]);

  const handleHardDrop = useCallback(() => dispatch({ type: 'hardDrop' }), []);

  useKeyboard({
    enabled: isPlaying,
    onLeft: () => handleMove(-1),
    onRight: () => handleMove(1),
    onDown: handleSoftDrop,
    onRotate: handleRotate,
    onHardDrop: handleHardDrop,
  });

  useSwipe(boardRef, {
    enabled: isPlaying,
    onMove: handleMove,
    onRotate: handleRotate,
    onHardDrop: handleHardDrop,
  });

  // --- 효과음 / 배경음악 ---
  // reducer 는 순수해야 하므로 사운드를 직접 낼 수 없습니다.
  // 상태 변화를 관찰해 "고정됐다", "줄이 지워졌다" 를 판별합니다.
  const prevRef = useRef({
    locks: state.locks,
    lines: state.lines,
    status: state.status,
  });

  useEffect(() => {
    const prev = prevRef.current;

    if (state.locks > prev.locks) play('drop');
    if (state.lines > prev.lines) play('break');
    if (state.status === 'over' && prev.status !== 'over') stopTheme();

    prevRef.current = {
      locks: state.locks,
      lines: state.lines,
      status: state.status,
    };
  }, [state.locks, state.lines, state.status, play, stopTheme]);

  const handleStart = () => {
    dispatch({ type: 'start' });
    startTheme(); // 사용자 제스처 안에서 바로 재생해야 자동재생 정책을 통과합니다
  };

  const handleToggleSound = () => {
    const nextEnabled = toggle();
    if (nextEnabled && isPlaying) startTheme();
  };

  return (
    <div className="app">
      <div className="board-column">
        <canvas ref={boardRef} className="board" />
        <TouchControls
          onMove={handleMove}
          onRotate={handleRotate}
          onSoftDrop={handleSoftDrop}
          onHardDrop={handleHardDrop}
        />
      </div>

      <aside className="side">
        <HudPanel label="점수" value={state.score} />
        <HudPanel label="레벨" value={state.level} />
        <HudPanel label="줄" value={state.lines} />
        <div className="panel">
          <div className="panel-label">다음</div>
          <canvas ref={nextRef} className="next" />
        </div>

        <button
          type="button"
          className="btn-sound"
          onClick={handleToggleSound}
          aria-pressed={soundEnabled}
          title={soundEnabled ? '소리 끄기' : '소리 켜기'}
        >
          {soundEnabled ? '♫' : '♫ MUTE'}
        </button>

        <button type="button" className="btn-start" onClick={handleStart}>
          {START_LABEL[state.status]}
        </button>
      </aside>
    </div>
  );
}
