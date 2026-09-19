// 레벨 생성. 원본 genLevel (176–217행) 그대로.
// React 도 DOM 도 import 하지 않습니다.

import {
  BRICK_COLORS,
  BRICK_H,
  BRICK_LEFT,
  BRICK_TOP,
  BRICK_W,
  COLS,
  GAP,
  ROWS,
} from './constants.js';

export function makeBrick(row, col, hp, maxHp, color, extra) {
  const b = {
    x: BRICK_LEFT + col * (BRICK_W + GAP),
    y: BRICK_TOP + row * (BRICK_H + GAP),
    w: BRICK_W,
    h: BRICK_H,
    color: color || BRICK_COLORS[row],
    visible: true,
    hp: hp || 1,
    maxHp: maxHp || 1,
    destructible: true,
    row,
    col,
  };
  if (extra) Object.assign(b, extra);
  return b;
}

/** n 은 0-based 입니다 (round-1). 매 호출이 새 브릭 객체를 만듭니다. */
export function genLevel(n) {
  const bricks = [];
  let r;
  let c;

  switch (n) {
    case 0:
      for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) bricks.push(makeBrick(r, c));
      break;

    case 1: {
      const cx = (COLS - 1) / 2;
      const cy = (ROWS - 1) / 2;
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          if (Math.abs(c - cx) + Math.abs(r - cy) <= 3.5) bricks.push(makeBrick(r, c));
        }
      }
      break;
    }

    case 2:
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          if ((r + c) % 2 === 0) {
            const isSilver = r === 2 || r === 3;
            bricks.push(makeBrick(r, c, isSilver ? 2 : 1, isSilver ? 2 : null, isSilver ? '#9E9E9E' : null));
          }
        }
      }
      break;

    case 3:
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          const minC = Math.floor(COLS / 2 - r / 2);
          const maxC = Math.ceil(COLS / 2 + r / 2);
          if (c >= minC && c <= maxC) bricks.push(makeBrick(r, c));
        }
      }
      break;

    case 4:
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          // 0행 가운데 10칸은 파괴 불가 골드. 이 브릭들이 남아 있는 한
          // checkLevelComplete 는 레벨을 끝내지 않으므로 B 포탈이 유일한 통과 수단입니다.
          if (r === 0 && c > 0 && c < COLS - 1) {
            bricks.push(makeBrick(r, c, 99, 99, '#B8860B', { destructible: false }));
          } else if (r === ROWS - 1 && c % 2 === 0) {
            // 구멍
          } else if (r === 2 && (c === 0 || c === COLS - 1)) {
            // 구멍
          } else if (r === 4 && c === 4) {
            // 구멍
          } else {
            const isSilver = r === 3 || r === 4;
            bricks.push(makeBrick(r, c, isSilver ? 2 : 1, isSilver ? 2 : null, isSilver ? '#9E9E9E' : null));
          }
        }
      }
      break;

    default:
      break;
  }

  return bricks;
}
