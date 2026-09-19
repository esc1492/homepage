'use client';

import { useEffect, useRef } from 'react';

import { TAP_SLOP } from '../game/constants.js';
import { paddleXFromClientX } from '../game/physics.js';

/** 이 시간보다 오래 누르고 있으면 탭이 아니라 '잡고 있는 것'으로 봅니다. */
const TAP_MAX_MS = 400;

/**
 * Pointer Events 로 마우스·터치·펜을 한 경로로 처리합니다.
 *
 * 원본은 touchmove / touchstart / mousemove / click 네 리스너를 따로 붙였고,
 * React 17+ 는 touchstart·touchmove·wheel 을 루트에 passive 로 등록하므로 onTouchMove prop 으로는
 * preventDefault() 가 먹지 않습니다 (테트리스가 useSwipe.js 로 우회한 이유).
 * pointermove 는 그 passive 목록에 없고, 스크롤 차단은 CSS 의 touch-action 이 담당하므로
 * 여기서는 preventDefault 에 의존하지 않습니다.
 *
 * 네이티브 리스너로 붙이는 이유는 { passive: false } 를 명시해 React 의 등록 전략이 바뀌어도
 * 동작이 유지되게 하기 위함입니다.
 */
export function usePointer({ canvasRef, worldRef, inputRef, onTap }) {
  const onTapRef = useRef(onTap);

  useEffect(() => {
    onTapRef.current = onTap;
  });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return undefined;

    let activeId = null;
    let downX = 0;
    let downY = 0;
    let downT = 0;
    let dragged = false;

    const onDown = (e) => {
      if (activeId !== null) return; // 첫 포인터만 — 원본의 e.touches[0] 과 동일
      activeId = e.pointerId;
      downX = e.clientX;
      downY = e.clientY;
      downT = e.timeStamp;
      dragged = false;

      // 캔버스 밖으로 나가도 계속 받습니다. 원본의 mousemove 는 커서가 캔버스를 벗어나면
      // 끊겨서 패들을 잃었는데, 이것이 그 문제를 고칩니다 (터치는 원래 암묵적 캡처였습니다).
      if (el.setPointerCapture) el.setPointerCapture(e.pointerId);

      // 호환 마우스 이벤트와 네이티브 드래그 시작을 억제합니다.
      // ⚠️ 스크롤을 막는 것은 이 호출이 아니라 CSS 의 touch-action: none 입니다.
      e.preventDefault();
    };

    const onMove = (e) => {
      const isActive = e.pointerId === activeId;
      // 마우스는 누르지 않아도 따라옵니다 (원본 mousemove 와 동일).
      // 터치·펜은 누르고 있는 동안만 (원본 touchmove 와 동일).
      if (!isActive && e.pointerType !== 'mouse') return;

      const rect = el.getBoundingClientRect();
      // ⚠️ 전역 `* { box-sizing: border-box }` 때문에 style.width(400px)에 테두리 4px 가
      //    포함됩니다. 그래서 그리기 영역은 clientWidth(396)이고 원점은 테두리 안쪽입니다.
      //    rect 를 그대로 넘기면 테두리 폭만큼(약 1%) 어긋납니다.
      const contentWidth = el.clientWidth;
      if (!contentWidth) return;

      // ⚠️ canvas.width 가 아니라 논리 폭으로 환산합니다 — setupCanvas 가 DPR 배수로 키웁니다.
      inputRef.current.targetX = paddleXFromClientX(
        e.clientX,
        rect.left + el.clientLeft,
        contentWidth,
        worldRef.current.paddle.w,
      );

      if (isActive && Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_SLOP) dragged = true;
    };

    const onUp = (e) => {
      if (e.pointerId !== activeId) return;
      activeId = null;
      if (el.hasPointerCapture && el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }

      // 탭이면 발사·해제·재시작. 드래그와 구분해야 하므로 누를 때가 아니라 뗄 때 판정합니다 —
      // 원본은 touchstart 에서 발사했지만 그러면 드래그 시작과 구분할 수 없습니다.
      // 플레이 중에는 어차피 발사가 불가능하므로 체감 차이는 발사 순간뿐입니다.
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (!dragged && moved < TAP_SLOP && e.timeStamp - downT < TAP_MAX_MS) {
        onTapRef.current();
      }
    };

    // 원본에 없던 처리 — 취소된 포인터가 캔버스를 붙잡은 채 남는 것을 막습니다.
    const onCancel = (e) => {
      if (e.pointerId !== activeId) return;
      activeId = null;
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);

    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
    };
  }, [canvasRef, worldRef, inputRef]);
}
