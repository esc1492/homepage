// Canvas 그리기. 원본 tetris_streamlit.py 의 drawCell/drawBoard/drawNext/drawOver 를
// (ctx, state) 시그니처의 순수 함수로 옮긴 것입니다. React 를 import 하지 않습니다.

import {
  BOARD_W,
  BOARD_H,
  CELL,
  COLS,
  ROWS,
  NEXT_SIZE,
  COLORS,
} from './constants.js';

const BOARD_BG = '#0d0d0d';
const GRID_RGBA = 'rgba(255,255,255,0.04)';

/**
 * 레티나 디스플레이에서 흐릿하지 않도록 백킹 스토어를 DPR 만큼 키우고,
 * 그리기 좌표계는 논리 픽셀(200x400 등) 그대로 쓰도록 맞춥니다.
 * 원본은 width/height 속성이 고정이라 고해상도 화면에서 뭉개졌습니다.
 */
export function setupCanvas(canvas, cssW, cssH) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function drawCell(ctx, x, y, id) {
  const px = x * CELL + 1;
  const py = y * CELL + 1;

  ctx.fillStyle = COLORS[id];
  ctx.fillRect(px, py, CELL - 2, CELL - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; // 윗면 하이라이트
  ctx.fillRect(px, py, CELL - 2, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; // 아랫면 음영
  ctx.fillRect(px, py + CELL - 4, CELL - 2, 3);
}

export function drawBoard(ctx, state) {
  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);

  const { board, piece } = state;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) drawCell(ctx, c, r, board[r][c]);
    }
  }

  if (piece) {
    piece.m.forEach((row, ri) =>
      row.forEach((v, ci) => {
        if (v) drawCell(ctx, piece.x + ci, piece.y + ri, piece.id);
      }),
    );
  }

  ctx.strokeStyle = GRID_RGBA;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL, 0);
    ctx.lineTo(c * CELL, BOARD_H);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL);
    ctx.lineTo(BOARD_W, r * CELL);
    ctx.stroke();
  }
}

export function drawNext(ctx, next) {
  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(0, 0, NEXT_SIZE, NEXT_SIZE);
  if (!next) return;

  // 원본과 동일: 4x4 격자에 셀 16px 로 중앙 정렬
  const cell = 16;
  const ox = Math.floor((4 - next.m[0].length) / 2);
  const oy = Math.floor((4 - next.m.length) / 2);

  next.m.forEach((row, ri) =>
    row.forEach((v, ci) => {
      if (!v) return;
      ctx.fillStyle = COLORS[v];
      ctx.fillRect((ox + ci) * cell + 8, (oy + ri) * cell + 8, cell - 2, cell - 2);
    }),
  );
}

export function drawGameOver(ctx, score) {
  const midY = BOARD_H / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, midY - 34, BOARD_W, 68);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px monospace';
  ctx.fillText('GAME OVER', BOARD_W / 2, midY - 10);

  ctx.font = '12px monospace';
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(`점수: ${score}`, BOARD_W / 2, midY + 16);
  ctx.textAlign = 'start';
}

export function drawIdle(ctx) {
  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = '13px monospace';
  ctx.fillText('▶ 시작을 눌러주세요', BOARD_W / 2, BOARD_H / 2);
  ctx.textAlign = 'start';
}

/** 현재 상태에 맞는 보드를 그립니다. */
export function drawScene(ctx, state) {
  if (state.status === 'idle') {
    drawIdle(ctx);
    return;
  }
  drawBoard(ctx, state);
  if (state.status === 'over') drawGameOver(ctx, state.score);
}
