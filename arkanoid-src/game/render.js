// Canvas 그리기. 원본 149–157, 407–730행을 그대로 옮긴 것입니다.
// React 를 import 하지 않습니다 — (ctx, world) 시그니처의 함수들입니다.
//
// 원본은 전역 `bx` 를 썼지만 여기서는 ctx 를 인자로 받습니다.

import { BEAD_R, H, PADDLE_H, PADDLE_W, W, WALL_LEFT } from './constants.js';

/**
 * 논리 크기(cssW×cssH)로 CSS 박스를 잡고 백킹 스토어만 DPR 배수로 키웁니다.
 * setTransform 으로 좌표계를 논리 픽셀에 맞추므로 그리기 코드는 배율을 몰라도 됩니다.
 *
 * ⚠️ 이 때문에 캔버스의 width 속성은 더 이상 논리 크기가 아닙니다. 포인터 좌표를 환산할 때
 *    canvas.width 를 쓰면 DPR 배수만큼 틀립니다 — physics.js 의 paddleXFromClientX 를 쓰십시오.
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

// 색 헬퍼
function hexToRgb(h) {
  const v = parseInt(h.slice(1), 16);
  return { v: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function lighten(h, a) {
  const c = hexToRgb(h);
  return rgbToHex(c.v + a, c.g + a, c.b + a);
}

export function darken(h, a) {
  const c = hexToRgb(h);
  return rgbToHex(c.v - a, c.g - a, c.b - a);
}

/**
 * ctx.roundRect 는 Chrome 99+/Safari 16.4+ 입니다. 없으면 TypeError 가 drawScene 전체를
 * 중단시켜 게임이 멈춘 것처럼 보입니다 (열화가 아니라 정지). 같은 기법을 이미 drawPaddle 이
 * 쓰고 있으므로 분기 없이 이 경로로 통일합니다.
 */
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function drawBackground(ctx, bg) {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);
  if (bg && bg.complete && bg.naturalWidth > 0) {
    ctx.drawImage(bg, 0, 36, W, H);
  }
}

function drawHUD(ctx, world) {
  const { score, round, lives, activeEffects, portal, ball } = world;

  ctx.fillStyle = '#888';
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE', 12, 9);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(String(score).padStart(6, '0'), 12, 27);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#888';
  ctx.font = '11px monospace';
  ctx.fillText('ROUND', W / 2, 9);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(round, W / 2, 27);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 33);
  ctx.lineTo(W, 33);
  ctx.stroke();

  // 활성 효과 표시
  const acts = [];
  if (activeEffects.L) acts.push('⚛');
  if (activeEffects.E) acts.push('⇔');
  if (activeEffects.S) acts.push('▼');
  if (ball.caught) acts.push('◉');
  if (acts.length) {
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('▶ ' + acts.join(' '), 12, 45);
  }

  // 포탈 표시
  if (portal) {
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('BREAK ▶', W - 12, 45);
  }

  // 남은 목숨 — 미니 패들(빨간 팁 + 하늘색 구슬)로 좌하단에 그립니다.
  const extra = lives - 1;
  if (extra > 0) {
    const mw = (PADDLE_W / 2) | 0;
    const mh = (PADDLE_H / 2) | 0;
    const tipW = 7;
    const left = WALL_LEFT + 2;
    const by = H - 6;
    const PI = Math.PI;

    for (let i = 0; i < extra; i++) {
      const px = left + i * (mw + 6);
      const r = mh / 2;

      const g = ctx.createLinearGradient(px, by, px, by + mh);
      g.addColorStop(0, '#999');
      g.addColorStop(0.2, '#777');
      g.addColorStop(0.45, '#555');
      g.addColorStop(0.55, '#444');
      g.addColorStop(0.8, '#3a3a3a');
      g.addColorStop(1, '#2a2a2a');
      ctx.fillStyle = g;
      roundRectPath(ctx, px, by, mw, mh, r);
      ctx.fill();

      const rg = ctx.createLinearGradient(px, by, px, by + mh);
      rg.addColorStop(0, '#FF5555');
      rg.addColorStop(0.3, '#EE3333');
      rg.addColorStop(0.5, '#CC2222');
      rg.addColorStop(0.7, '#AA1818');
      rg.addColorStop(1, '#880E0E');

      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.moveTo(px + r, by);
      ctx.lineTo(px + tipW, by);
      ctx.lineTo(px + tipW, by + mh);
      ctx.lineTo(px + r, by + mh);
      ctx.quadraticCurveTo(px, by + mh, px, by + mh - r);
      ctx.lineTo(px, by + r);
      ctx.quadraticCurveTo(px, by, px + r, by);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.moveTo(px + mw - r, by);
      ctx.lineTo(px + mw - tipW, by);
      ctx.lineTo(px + mw - tipW, by + mh);
      ctx.lineTo(px + mw - r, by + mh);
      ctx.quadraticCurveTo(px + mw, by + mh, px + mw, by + mh - r);
      ctx.lineTo(px + mw, by + r);
      ctx.quadraticCurveTo(px + mw, by, px + mw - r, by);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + tipW, by);
      ctx.lineTo(px + tipW, by + mh);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px + mw - tipW, by);
      ctx.lineTo(px + mw - tipW, by + mh);
      ctx.stroke();

      const beadR = 3;
      const beadY = by + mh / 2;

      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(px + 1, beadY + 1, beadR, 0, PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, beadY, beadR, PI / 2, -PI / 2);
      ctx.closePath();
      ctx.clip();
      const bgL = ctx.createRadialGradient(px - 1, beadY - 1, 0.5, px, beadY, beadR);
      bgL.addColorStop(0, '#C8F0FF');
      bgL.addColorStop(0.3, '#66D0FF');
      bgL.addColorStop(0.6, '#33A0FF');
      bgL.addColorStop(1, '#0070CC');
      ctx.fillStyle = bgL;
      ctx.beginPath();
      ctx.arc(px, beadY, beadR, 0, PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(px - 1, beadY - 1, 0.8, 0, PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(px + mw + 1, beadY + 1, beadR, 0, PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(px + mw, beadY, beadR, -PI / 2, PI / 2);
      ctx.closePath();
      ctx.clip();
      const bgR = ctx.createRadialGradient(px + mw - 1, beadY - 1, 0.5, px + mw, beadY, beadR);
      bgR.addColorStop(0, '#C8F0FF');
      bgR.addColorStop(0.3, '#66D0FF');
      bgR.addColorStop(0.6, '#33A0FF');
      bgR.addColorStop(1, '#0070CC');
      ctx.fillStyle = bgR;
      ctx.beginPath();
      ctx.arc(px + mw, beadY, beadR, 0, PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(px + mw - 1, beadY - 1, 0.8, 0, PI * 2);
      ctx.fill();
    }
  }
}

function drawBrick(ctx, b) {
  if (!b.visible) return;
  const { x, y, w, h, color } = b;

  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);

  if (!b.destructible) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 4, y + 4, w - 8, 2);
    ctx.fillRect(x + 4, y + 4, 2, h - 8);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + 4, y + h - 6, w - 8, 2);
    ctx.fillRect(x + w - 6, y + 4, 2, h - 8);
    ctx.fillStyle = 'rgba(255,255,200,0.08)';
    ctx.fillRect(x + 8, y + 6, w - 16, h - 12);
  } else {
    ctx.fillStyle = lighten(color, 40);
    ctx.fillRect(x, y, w, 2);
    ctx.fillRect(x, y, 2, h);
    ctx.fillStyle = darken(color, 40);
    ctx.fillRect(x, y + h - 2, w, 2);
    ctx.fillRect(x + w - 2, y, 2, h);

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x + 6, y + 5, w - 12, h - 10);
  }

  if (b.maxHp > 1) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 6, y + 3, w - 12, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + w - 6, y + h - 5, 2, 3);
    if (b.hp > 0) {
      ctx.fillStyle = b.hp > 1 ? 'rgba(255,255,255,0.35)' : 'rgba(255,100,100,0.4)';
      ctx.fillRect(x + 3, y + h - 5, (w - 6) * (b.hp / b.maxHp), 2);
    }
  }

  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function drawPaddle(ctx, paddle) {
  const { x, y, w, h } = paddle;
  const r = h / 2;
  const tipW = 14;
  const PI = Math.PI;

  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#999');
  grad.addColorStop(0.2, '#777');
  grad.addColorStop(0.45, '#555');
  grad.addColorStop(0.55, '#444');
  grad.addColorStop(0.8, '#3a3a3a');
  grad.addColorStop(1, '#2a2a2a');
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();

  const rGrad = ctx.createLinearGradient(x, y, x, y + h);
  rGrad.addColorStop(0, '#FF5555');
  rGrad.addColorStop(0.3, '#EE3333');
  rGrad.addColorStop(0.5, '#CC2222');
  rGrad.addColorStop(0.7, '#AA1818');
  rGrad.addColorStop(1, '#880E0E');

  ctx.fillStyle = rGrad;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + tipW, y);
  ctx.lineTo(x + tipW, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = rGrad;
  ctx.beginPath();
  ctx.moveTo(x + w - r, y);
  ctx.lineTo(x + w - tipW, y);
  ctx.lineTo(x + w - tipW, y + h);
  ctx.lineTo(x + w - r, y + h);
  ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
  ctx.lineTo(x + w, y + r);
  ctx.quadraticCurveTo(x + w, y, x + w - r, y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + tipW, y);
  ctx.lineTo(x + tipW, y + h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w - tipW, y);
  ctx.lineTo(x + w - tipW, y + h);
  ctx.stroke();

  const beadR = BEAD_R;
  const beadY = y + h / 2;

  const drawBlueHalf = (cx, cy, isRight) => {
    ctx.save();
    ctx.beginPath();
    if (isRight) ctx.arc(cx, cy, beadR, PI / 2, -PI / 2);
    else ctx.arc(cx, cy, beadR, -PI / 2, PI / 2);
    ctx.closePath();
    ctx.clip();
    const bg = ctx.createRadialGradient(cx - 1, cy - 1, 0.5, cx, cy, beadR);
    bg.addColorStop(0, '#C8F0FF');
    bg.addColorStop(0.3, '#66D0FF');
    bg.addColorStop(0.6, '#33A0FF');
    bg.addColorStop(1, '#0070CC');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(cx, cy, beadR, 0, PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // 왼쪽 구슬 — 패들 바깥쪽 절반만 하늘색
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(x + 1, beadY + 1, beadR, 0, PI * 2);
  ctx.fill();
  drawBlueHalf(x, beadY, true);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(x - 1.5, beadY - 1.5, 1.2, 0, PI * 2);
  ctx.fill();

  // 오른쪽 구슬
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(x + w + 1, beadY + 1, beadR, 0, PI * 2);
  ctx.fill();
  drawBlueHalf(x + w, beadY, false);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(x + w + 1.5, beadY - 1.5, 1.2, 0, PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x + 4, y + 2, w - 8, 1.2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 4, y + h - 2, w - 8, 1);
}

function drawOneBall(ctx, b) {
  const grad = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, b.r);
  grad.addColorStop(0, '#fff');
  grad.addColorStop(0.5, '#e8ecf4');
  grad.addColorStop(1, '#8890a0');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();
}

function drawBall(ctx, world) {
  drawOneBall(ctx, world.ball);
  for (let i = 0; i < world.extraBalls.length; i++) drawOneBall(ctx, world.extraBalls[i]);
}

function drawOverlay(ctx, text, sub) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, H / 2 - 42, W, 84);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, H / 2 - 6);
  if (sub) {
    ctx.fillStyle = '#aaa';
    ctx.font = '13px monospace';
    ctx.fillText(sub, W / 2, H / 2 + 22);
  }
}

function drawItems(ctx, items) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const r = it.h / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRectPath(ctx, it.x + 1, it.y + 2, it.w, it.h, r);
    ctx.fill();

    ctx.fillStyle = it.color;
    roundRectPath(ctx, it.x, it.y, it.w, it.h, r);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    roundRectPath(ctx, it.x + 3, it.y + 2, it.w - 6, it.h / 2 - 2, 4);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.letter, it.x + it.w / 2, it.y + it.h / 2);
    ctx.textBaseline = 'alphabetic';
  }
}

function drawLasers(ctx, lasers) {
  for (let i = 0; i < lasers.length; i++) {
    const l = lasers[i];
    ctx.fillStyle = '#FF6B6B';
    ctx.shadowColor = '#FF6B6B';
    ctx.shadowBlur = 10;
    ctx.fillRect(l.x, l.y, l.w, l.h);
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.fillRect(l.x, l.y + 4, l.w, 2);
  }
  ctx.shadowBlur = 0;
}

function drawPortal(ctx, portal) {
  if (!portal) return;
  const cx = portal.x + portal.w / 2;
  const cy = portal.y + portal.h / 2;
  const rx = 7;
  const ry = portal.h / 2;
  const pulse = Math.sin(Date.now() / 150) * 3;

  ctx.fillStyle = 'rgba(255,200,50,0.12)';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + 4, ry + pulse, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,200,50,0.3)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + 2, ry - 4 + pulse, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry - 8 + pulse * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('▶', cx, cy);
  ctx.textBaseline = 'alphabetic';
}

/** 유일한 그리기 진입점. 원본 loop() 의 그리기 절반 (814–823행) 순서 그대로. */
export function drawScene(ctx, world, assets = {}) {
  drawBackground(ctx, assets.bg);

  for (let i = 0; i < world.bricks.length; i++) drawBrick(ctx, world.bricks[i]);
  drawItems(ctx, world.items);
  drawLasers(ctx, world.lasers);
  drawPortal(ctx, world.portal);
  drawPaddle(ctx, world.paddle);
  drawBall(ctx, world);
  drawHUD(ctx, world);

  if (world.screen === 'ready') {
    drawOverlay(ctx, 'READY', world.isMobile ? '화면을 터치해주세요' : '엔터를 눌러주세요');
  } else if (world.screen === 'levelComplete') {
    drawOverlay(ctx, 'ROUND COMPLETE!', '');
  } else if (world.screen === 'lost') {
    drawOverlay(ctx, 'READY', '');
  } else if (world.screen === 'gameOver') {
    drawOverlay(ctx, 'GAME OVER', '최종 점수: ' + world.score);
  } else if (world.screen === 'win') {
    drawOverlay(ctx, 'YOU WIN!', '최종 점수: ' + world.score);
  }
}
