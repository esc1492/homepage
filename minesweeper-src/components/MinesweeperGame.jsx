'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { DIFFICULTIES, chord, newGame, reveal, toggleFlag } from '../game/minesweeper.js';

/** 길게 누르면 깃발로 간주하는 시간 (ms). 터치 기기의 우클릭 대체 수단입니다. */
const LONG_PRESS_MS = 450;

const pad3 = (n) => String(Math.max(0, Math.min(999, n))).padStart(3, '0');

function loadBest(key) {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(`minesweeper-best-${key}`);
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 고전 지뢰 아이콘 (SVG 도트). 폭발 칸은 빨간 바탕 위에 그려집니다. */
function MineIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <g stroke="#000" strokeWidth="2">
        <line x1="1" y1="10" x2="19" y2="10" />
        <line x1="10" y1="1" x2="10" y2="19" />
        <line x1="4" y1="4" x2="16" y2="16" />
        <line x1="16" y1="4" x2="4" y2="16" />
      </g>
      <circle cx="10" cy="10" r="6" fill="#000" />
      <rect x="7" y="7" width="3" height="3" fill="#fff" />
    </svg>
  );
}

/** 잘못 꽂은 깃발 — 지뢰 위 빨간 X */
function CrossedMineIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <g stroke="#000" strokeWidth="2">
        <line x1="1" y1="10" x2="19" y2="10" />
        <line x1="10" y1="1" x2="10" y2="19" />
        <line x1="4" y1="4" x2="16" y2="16" />
        <line x1="16" y1="4" x2="4" y2="16" />
      </g>
      <circle cx="10" cy="10" r="6" fill="#000" />
      <g stroke="#ff0000" strokeWidth="2">
        <line x1="3" y1="3" x2="17" y2="17" />
        <line x1="17" y1="3" x2="3" y2="17" />
      </g>
    </svg>
  );
}

/** 고전 깃발 아이콘 (SVG 도트) */
function FlagIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="9" y="2" width="2" height="13" fill="#000" />
      <polygon points="11,2 19,5.5 11,9" fill="#ff0000" />
      <rect x="6" y="15" width="8" height="2" fill="#000" />
      <rect x="4" y="17" width="12" height="2" fill="#000" />
    </svg>
  );
}

/**
 * 지뢰찾기 — 윈도우 95 클래식 스킨.
 *
 * 게임 보드는 턴제라 60fps 루프가 필요 없습니다. game/ 모듈이 불변 스냅샷을
 * 돌려주므로 컴포넌트는 useState 로 통째로 갈아끼우기만 합니다.
 * (알카노이드의 ref + rAF 구조와 달리 React 스케줄러를 그대로 씁니다.)
 */
export default function MinesweeperGame() {
  const [diffKey, setDiffKey] = useState('beginner');
  const [game, setGame] = useState(() => newGame('beginner'));
  const [seconds, setSeconds] = useState(0);
  // 최고기록은 localStorage 에 있어 SSR 과 첫 렌더가 달라집니다.
  // null 로 시작해 마운트 후 읽어야 hydration 오류가 나지 않습니다.
  const [best, setBest] = useState(null);
  // 열린 메뉴: 'game' | 'help' | null
  const [menu, setMenu] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // 길게 누르기용. 발동 직후 따라오는 click/contextmenu 를 한 번씩 삼킵니다.
  const pressTimer = useRef(null);
  const pressFired = useRef(false);

  // 타이머: 첫 공개(playing 진입)에 시작, 승패에 정지합니다.
  useEffect(() => {
    if (game.status !== 'playing') return undefined;
    const id = window.setInterval(() => setSeconds((s) => Math.min(999, s + 1)), 1000);
    return () => window.clearInterval(id);
  }, [game.status]);

  // 최고기록: 마운트 후·난이도 변경 시 읽습니다 (렌더 중 읽으면 hydration 불일치).
  useEffect(() => {
    setBest(loadBest(diffKey));
  }, [diffKey]);

  // 승리 시 최고기록 갱신
  useEffect(() => {
    if (game.status !== 'won') return;
    setBest((prev) => {
      if (prev !== null && prev <= seconds) return prev;
      window.localStorage.setItem(`minesweeper-best-${game.key}`, String(seconds));
      return seconds;
    });
  }, [game.status, game.key, seconds]);

  const reset = useCallback((key) => {
    const k = key ?? diffKey;
    setDiffKey(k);
    setGame(newGame(k));
    setSeconds(0);
    setBest(loadBest(k));
    setMenu(null);
  }, [diffKey]);

  const openCell = useCallback((index) => {
    setGame((g) => {
      if (g.cells[index].revealed) return chord(g, index);
      return reveal(g, index);
    });
  }, []);

  const flagCell = useCallback((index) => {
    setGame((g) => toggleFlag(g, index));
  }, []);

  const handleClick = useCallback((index) => {
    if (pressFired.current) {
      pressFired.current = false;
      return;
    }
    openCell(index);
  }, [openCell]);

  const handleContextMenu = useCallback((e, index) => {
    e.preventDefault();
    if (pressFired.current) {
      pressFired.current = false;
      return;
    }
    flagCell(index);
  }, [flagCell]);

  const handlePointerDown = useCallback((e, index) => {
    if (e.pointerType !== 'touch' && e.button !== 0) return;
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      pressFired.current = true;
      pressTimer.current = null;
      flagCell(index);
    }, LONG_PRESS_MS);
  }, [flagCell]);

  const clearPressTimer = useCallback(() => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  useEffect(() => () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
  }, []);

  const face = game.status === 'lost' ? '😵' : game.status === 'won' ? '😎' : '🙂';

  return (
    <div className="app">
      <div className="window">
        <div className="titlebar">
          <span className="ticon"><MineIcon /></span>
          <span>Minesweeper</span>
          <span className="tbtns">
            <span className="tbtn" aria-hidden="true">_</span>
            <span className="tbtn" aria-hidden="true">▢</span>
            <a className="tbtn" href="/" title="홈으로">×</a>
          </span>
        </div>

        <div className="menubar" onMouseLeave={() => setMenu(null)}>
          <button
            type="button"
            className={menu === 'game' ? 'menu-btn open' : 'menu-btn'}
            onClick={() => setMenu((m) => (m === 'game' ? null : 'game'))}
          >
            Game
          </button>
          <button
            type="button"
            className={menu === 'help' ? 'menu-btn open' : 'menu-btn'}
            onClick={() => setMenu((m) => (m === 'help' ? null : 'help'))}
          >
            Help
          </button>
          {menu === 'game' && (
            <div className="dropdown">
              <button type="button" className="menu-item" onClick={() => reset()}>
                <span className="menu-check" />새 게임
              </button>
              <div className="menu-sep" />
              {Object.entries(DIFFICULTIES).map(([key, d]) => (
                <button key={key} type="button" className="menu-item" onClick={() => reset(key)}>
                  <span className="menu-check">{key === diffKey ? '✓' : ''}</span>
                  {d.label} {d.rows}×{d.cols} · 지뢰 {d.mines}
                </button>
              ))}
            </div>
          )}
          {menu === 'help' && (
            <div className="dropdown">
              <button
                type="button"
                className="menu-item"
                onClick={() => { setShowHelp(true); setMenu(null); }}
              >
                <span className="menu-check" />게임 방법
              </button>
            </div>
          )}
        </div>

        <div className="hud sunken">
          <div className="led">{pad3(game.mines - game.flags)}</div>
          <button type="button" className="face" onClick={() => reset()} title="새 게임">
            {face}
          </button>
          <div className="led">{pad3(seconds)}</div>
        </div>

        <div className="board-wrap sunken">
          <div className="board" style={{ gridTemplateColumns: `repeat(${game.cols}, auto)` }}>
            {game.cells.map((cell, i) => {
              const content = cell.flagged
                ? (cell.wrong ? <CrossedMineIcon /> : <FlagIcon />)
                : !cell.revealed
                  ? null
                  : cell.mine
                    ? <MineIcon />
                    : cell.adjacent > 0
                      ? String(cell.adjacent)
                      : '';
              const cls = [
                'cell',
                cell.revealed ? 'open' : '',
                cell.revealed && cell.adjacent > 0 ? `n${cell.adjacent}` : '',
                i === game.exploded ? 'exploded' : '',
              ].filter(Boolean).join(' ');
              return (
                <button
                  key={i}
                  type="button"
                  className={cls}
                  onClick={() => handleClick(i)}
                  onContextMenu={(e) => handleContextMenu(e, i)}
                  onPointerDown={(e) => handlePointerDown(e, i)}
                  onPointerUp={clearPressTimer}
                  onPointerLeave={clearPressTimer}
                  onPointerCancel={clearPressTimer}
                  aria-label={`칸 ${Math.floor(i / game.cols) + 1}행 ${(i % game.cols) + 1}열`}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showHelp && (
        <div className="overlay" onClick={() => setShowHelp(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="titlebar">
              <span>게임 방법</span>
              <span className="tbtns">
                <button type="button" className="tbtn" onClick={() => setShowHelp(false)}>×</button>
              </span>
            </div>
            <div className="dialog-body">
              숫자는 주변 8칸의 지뢰 수입니다.<br />
              · 좌클릭(탭): 칸 열기<br />
              · 우클릭(길게 누르기): 깃발<br />
              · 열린 숫자 클릭: 주변 열기<br />
              첫 클릭은 절대 안전합니다.
              <div className="ok-row">
                <button type="button" className="win95-btn" onClick={() => setShowHelp(false)}>
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
