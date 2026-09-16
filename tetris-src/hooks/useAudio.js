import { useCallback, useEffect, useRef, useState } from 'react';

const SFX_NAMES = ['drop', 'swipe', 'change', 'break'];

/**
 * 효과음 하나당 보이스 수.
 *
 * 단일 Audio 객체를 매번 `currentTime = 0` 으로 되감아 재생하면 앞의 소리가 잘립니다.
 * 'drop' 은 고정될 때마다(최대 초당 12.5회) 울리고 길이가 0.24초라 최대 3개까지 겹치므로,
 * 4개면 여유가 있습니다. 'change'(0.45초)도 회전 연타를 충분히 감당합니다.
 */
const VOICES_PER_SOUND = 4;

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
      const url = audioUrl(`${name}.mp3`);
      const voices = [];
      for (let i = 0; i < VOICES_PER_SOUND; i++) {
        const voice = new Audio(url);
        voice.preload = 'auto'; // 효과음 4개 합계 약 30KB (같은 URL 이라 실제 요청은 4건)
        voices.push(voice);
      }
      sfx[name] = { voices, next: 0 };
    }

    const theme = new Audio(audioUrl('theme.mp3'));
    theme.loop = true;
    theme.preload = 'none'; // 약 2MB — '시작' 을 누를 때 받아옵니다

    sfxRef.current = sfx;
    themeRef.current = theme;

    return () => {
      theme.pause();
      for (const { voices } of Object.values(sfx)) {
        for (const voice of voices) voice.pause();
      }
      sfxRef.current = null;
      themeRef.current = null;
    };
  }, []);

  const play = useCallback((name) => {
    if (!enabledRef.current) return;
    const pool = sfxRef.current?.[name];
    if (!pool) return;

    // 재생이 끝난 보이스는 paused 가 true 입니다. 놀고 있는 것을 우선 쓰고,
    // 전부 재생 중이면 차례대로 돌며 가장 오래된 것을 빼앗습니다.
    const free = pool.voices.find((voice) => voice.paused);
    let voice = free;
    if (!voice) {
      voice = pool.voices[pool.next];
      pool.next = (pool.next + 1) % pool.voices.length;
    }

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
