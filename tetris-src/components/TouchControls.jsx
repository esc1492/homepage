'use client';

import { useEffect, useRef } from 'react';

/**
 * 조작 버튼 하나.
 *
 * ⚠️ React 의 onTouchStart 는 루트에 passive 로 등록되어 preventDefault() 가 먹지 않습니다.
 *    그러면 브라우저가 뒤이어 합성 mousedown 을 발생시켜 한 번 눌러 두 번 동작합니다.
 *    네이티브 touchstart(passive: false) 에서 preventDefault() 를 호출해 합성 마우스
 *    이벤트를 막고, 데스크톱은 mousedown 으로 처리합니다 (원본과 같은 구조).
 */
function CtrlButton({ className, title, children, onPress }) {
  const ref = useRef(null);
  const pressRef = useRef(onPress);

  useEffect(() => {
    pressRef.current = onPress;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const handleTouch = (event) => {
      event.preventDefault();
      pressRef.current();
    };
    const handleMouse = () => pressRef.current();

    el.addEventListener('touchstart', handleTouch, { passive: false });
    el.addEventListener('mousedown', handleMouse);
    return () => {
      el.removeEventListener('touchstart', handleTouch);
      el.removeEventListener('mousedown', handleMouse);
    };
  }, []);

  return (
    <button ref={ref} type="button" className={className} title={title}>
      {children}
    </button>
  );
}

export default function TouchControls({ onMove, onRotate, onSoftDrop, onHardDrop }) {
  return (
    <div className="controls">
      <div className="ctrl-row">
        <CtrlButton className="ctrl-btn" title="회전" onPress={onRotate}>
          ↻
        </CtrlButton>
      </div>
      <div className="ctrl-row">
        <CtrlButton className="ctrl-btn" title="왼쪽" onPress={() => onMove(-1)}>
          ←
        </CtrlButton>
        <CtrlButton className="ctrl-btn" title="빠르게" onPress={onSoftDrop}>
          ↓
        </CtrlButton>
        <CtrlButton className="ctrl-btn" title="오른쪽" onPress={() => onMove(1)}>
          →
        </CtrlButton>
      </div>
      <div className="ctrl-row">
        <CtrlButton className="ctrl-btn wide" title="즉시 드롭" onPress={onHardDrop}>
          ⬇ DROP
        </CtrlButton>
      </div>
      <p className="key-hint">키보드: ← → ↑ ↓ Space</p>
    </div>
  );
}
