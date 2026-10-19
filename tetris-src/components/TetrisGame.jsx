'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { BOARD_H, BOARD_W, NEXT_SIZE } from '../game/constants.js';
import { createInitialState, reduceWithEvents } from '../game/reducer.js';
import { drawNext, drawScene, setupCanvas } from '../game/render.js';
import { useAudio } from '../hooks/useAudio.js';
import { useGameLoop } from '../hooks/useGameLoop.js';
import { useHighScore } from '../hooks/useHighScore.js';
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
  const [state, setState] = useState(createInitialState);

  const boardRef = useRef(null);
  const nextRef = useRef(null);
  const boardCtxRef = useRef(null);
  const nextCtxRef = useRef(null);

  // rAF 루프는 React 렌더를 거치지 않고 여기서 최신 상태를 읽습니다.
  const stateRef = useRef(state);
  const statusRef = useRef(state.status);
  const needsDrawRef = useRef(true);

  const { enabled: soundEnabled, play, startTheme, stopTheme, toggle } = useAudio();

  // reducer 는 표현 이벤트를 돌려주고, 여기서 사운드로 매핑합니다.
  // 상태 갱신과 같은 동작에서 처리하므로 이전 상태와 diff 할 필요가 없습니다.
  const dispatch = useCallback(
    (action) => {
      const { state: next, events } = reduceWithEvents(stateRef.current, action);
      stateRef.current = next;
      setState(next);
      for (const event of events) {
        if (event.type === 'lock') play('drop');
        else if (event.type === 'clear') play('break');
        else if (event.type === 'rotate') play('change');
        else if (event.type === 'over') stopTheme();
      }
    },
    [play, stopTheme],
  );

  // 현재 점수가 기록을 넘으면 즉시 올라가므로, 플레이 중에도 갱신되는 것이 보입니다.
  const highScore = useHighScore(state.score);

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

  const onTick = useCallback(() => dispatch({ type: 'drop' }), [dispatch]);

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

  const handleMove = useCallback((dx) => dispatch({ type: 'move', dx }), [dispatch]);

  const handleRotate = useCallback(() => dispatch({ type: 'rotate' }), [dispatch]);

  const handleSoftDrop = useCallback(() => {
    dispatch({ type: 'drop' });
    resetTimer(); // 다음 자동 하강까지의 시간을 초기화
  }, [dispatch, resetTimer]);

  const handleHardDrop = useCallback(() => dispatch({ type: 'hardDrop' }), [dispatch]);

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
        <HudPanel label="최고" value={highScore} />
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
