import { useEffect, useRef } from 'react';

const HANDLED_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '];

/**
 * 키보드 입력. 원본은 document 에 직접 붙였지만 window 로 옮겨도 동작은 같습니다.
 *
 * preventDefault 는 게임 중이 아니어도 항상 호출합니다 — 그렇지 않으면
 * 화살표와 Space 로 페이지가 스크롤됩니다(원본과 동일한 동작).
 */
export function useKeyboard({ enabled, onLeft, onRight, onDown, onRotate, onHardDrop }) {
  const handlersRef = useRef({});
  const enabledRef = useRef(enabled);

  useEffect(() => {
    handlersRef.current = { onLeft, onRight, onDown, onRotate, onHardDrop };
    enabledRef.current = enabled;
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!HANDLED_KEYS.includes(event.key)) return;
      event.preventDefault();
      if (!enabledRef.current) return;

      const handlers = handlersRef.current;
      switch (event.key) {
        case 'ArrowLeft':
          handlers.onLeft();
          break;
        case 'ArrowRight':
          handlers.onRight();
          break;
        case 'ArrowDown':
          handlers.onDown();
          break;
        case 'ArrowUp':
          handlers.onRotate();
          break;
        case ' ':
          handlers.onHardDrop();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
