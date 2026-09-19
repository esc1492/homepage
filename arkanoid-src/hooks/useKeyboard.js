'use client';

import { useEffect, useRef } from 'react';

const PREVENT_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'];
const LEFT_KEYS = ['ArrowLeft', 'a', 'A'];
const RIGHT_KEYS = ['ArrowRight', 'd', 'D'];

/**
 * 키보드 조작. 원본은 document 와 canvas 두 곳에 같은 핸들러를 붙였는데, 그건 Streamlit iframe
 * 이 포커스를 갖지 못해 canvas.focus() 로 억지로 포커스를 옮겨야 했기 때문입니다.
 * 이 포트에서는 페이지가 곧 게임이므로 window 하나면 충분합니다.
 */
export function useKeyboard({ inputRef, onAction }) {
  const onActionRef = useRef(onAction);

  useEffect(() => {
    onActionRef.current = onAction;
  });

  useEffect(() => {
    const held = new Set();

    const sync = () => {
      const input = inputRef.current;
      input.left = LEFT_KEYS.some((k) => held.has(k));
      input.right = RIGHT_KEYS.some((k) => held.has(k));
    };

    const onDown = (e) => {
      // 방향키·스페이스로 페이지가 스크롤되지 않도록 — 원본처럼 상태와 무관하게 먼저 막습니다.
      if (PREVENT_KEYS.includes(e.key)) e.preventDefault();
      held.add(e.key);
      sync();
      if (e.key === ' ' || e.key === 'Enter') onActionRef.current();
    };

    const onUp = (e) => {
      held.delete(e.key);
      sync();
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);

    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [inputRef]);
}
