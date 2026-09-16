import { useEffect, useRef } from 'react';

const TAP_SLOP = 12; // 이보다 작게 움직이면 탭으로 보고 회전
const SWIPE_DOWN_MIN = 30; // 아래로 이만큼 이상 밀면 즉시 드롭

/**
 * 보드 위 스와이프 제스처 (원본의 touchstart/touchend 핸들러와 동일한 규칙).
 *
 * ⚠️ React 의 onTouchStart 를 쓰면 안 됩니다.
 *    React 17+ 는 touchstart/touchmove/wheel 을 루트에 passive 로 등록하므로
 *    핸들러 안의 event.preventDefault() 가 무시되고 콘솔 경고만 남습니다.
 *    여기서는 스크롤 차단이 필수라 네이티브 리스너를 passive: false 로 직접 붙입니다.
 */
export function useSwipe(targetRef, { enabled, onRotate, onMove, onHardDrop }) {
  const handlersRef = useRef({});
  const enabledRef = useRef(enabled);

  useEffect(() => {
    handlersRef.current = { onRotate, onMove, onHardDrop };
    enabledRef.current = enabled;
  });

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return undefined;

    let startX = 0;
    let startY = 0;

    const handleStart = (event) => {
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      event.preventDefault(); // 스크롤/당겨서 새로고침 차단
    };

    const handleEnd = (event) => {
      if (!enabledRef.current) return;

      const dx = event.changedTouches[0].clientX - startX;
      const dy = event.changedTouches[0].clientY - startY;
      const handlers = handlersRef.current;

      if (Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) {
        handlers.onRotate();
      } else if (Math.abs(dx) > Math.abs(dy)) {
        handlers.onMove(dx > 0 ? 1 : -1);
      } else if (dy > SWIPE_DOWN_MIN) {
        handlers.onHardDrop();
      }
    };

    el.addEventListener('touchstart', handleStart, { passive: false });
    el.addEventListener('touchend', handleEnd, { passive: false });
    return () => {
      el.removeEventListener('touchstart', handleStart);
      el.removeEventListener('touchend', handleEnd);
    };
  }, [targetRef]);
}
