import { useCallback, useEffect, useRef, useState } from 'react';

const SFX_NAMES = ['drop', 'swipe', 'change', 'break'];

/**
 * ⚠️ basePath('/tetris') 는 문자열 URL 에 자동으로 붙지 않습니다.
 *    next/link·next/image·CSS 는 자동 처리되지만 new Audio('/audio/..') 는 그대로 나가
 *    404 가 됩니다. NEXT_PUBLIC_BASE_PATH 를 직접 앞에 붙여야 합니다.
 */
function audioUrl(file) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/audio/${file}`;
}

/**
 * 효과음 4종 + 배경 음악 1곡.
 *
 * Audio 객체는 브라우저 전용이라 반드시 effect 안에서 만듭니다.
 * 모듈 최상위에서 new Audio() 를 하면 Next.js 프리렌더(서버)에서 ReferenceError 가 납니다.
 */
export function useAudio() {
  const sfxRef = useRef(null);
  const themeRef = useRef(null);
  const enabledRef = useRef(true);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const sfx = {};
    for (const name of SFX_NAMES) {
      const voice = new Audio(audioUrl(`${name}.mp3`));
      voice.preload = 'auto'; // 효과음 4개 합계 약 30KB
      sfx[name] = voice;
    }

    const theme = new Audio(audioUrl('theme.mp3'));
    theme.loop = true;
    theme.preload = 'none'; // 약 2MB — '시작' 을 누를 때 받아옵니다

    sfxRef.current = sfx;
    themeRef.current = theme;

    return () => {
      theme.pause();
      sfxRef.current = null;
      themeRef.current = null;
    };
  }, []);

  const play = useCallback((name) => {
    if (!enabledRef.current) return;
    const voice = sfxRef.current?.[name];
    if (!voice) return;
    voice.currentTime = 0;
    voice.play().catch(() => {}); // 자동재생 차단 등은 조용히 무시
  }, []);

  const startTheme = useCallback(() => {
    if (!enabledRef.current) return;
    const theme = themeRef.current;
    if (!theme) return;
    theme.currentTime = 0;
    theme.play().catch(() => {});
  }, []);

  const stopTheme = useCallback(() => {
    themeRef.current?.pause();
  }, []);

  /** @returns {boolean} 토글 후의 활성화 상태 */
  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    if (!next) themeRef.current?.pause();
    return next;
  }, []);

  return { enabled, play, startTheme, stopTheme, toggle };
}
