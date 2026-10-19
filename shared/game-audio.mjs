'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { VOICES_PER_SOUND, audioUrl, pickVoice } from './game-audio-core.mjs';

/**
 * 게임 오디오 hook — 테트리스·알카노이드가 함께 씁니다.
 *
 * `sounds` 는 효과음 이름 배열, `themeFile` 은 배경 음악 파일명(없으면 null)입니다.
 * Audio 객체는 브라우저 전용이라 반드시 effect 안에서 만듭니다 — 모듈 최상위에서
 * `new Audio()` 를 하면 Next.js 프리렌더(서버)에서 ReferenceError 가 납니다.
 *
 * @param {{ sounds: string[], themeFile?: string|null }} options
 */
export function useGameAudio({ sounds, themeFile = null }) {
  const sfxRef = useRef(null);
  const themeRef = useRef(null);
  const enabledRef = useRef(true);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const sfx = {};
    for (const name of sounds) {
      const url = audioUrl(`${name}.mp3`);
      const voices = [];
      for (let i = 0; i < VOICES_PER_SOUND; i++) {
        const voice = new Audio(url);
        voice.preload = 'auto'; // 효과음 합계 약 30KB (같은 URL 이라 실제 요청은 파일 수만큼)
        voices.push(voice);
      }
      sfx[name] = { voices, next: 0 };
    }

    const theme = themeFile ? new Audio(audioUrl(themeFile)) : null;
    if (theme) {
      theme.loop = true;
      theme.preload = 'none'; // 약 2MB — 시작할 때 받아옵니다
    }

    sfxRef.current = sfx;
    themeRef.current = theme;

    return () => {
      // StrictMode 이중 마운트로 Audio 객체가 두 벌 생기는 것을 막습니다.
      theme?.pause();
      for (const { voices } of Object.values(sfx)) {
        for (const voice of voices) voice.pause();
      }
      sfxRef.current = null;
      themeRef.current = null;
    };
  }, [sounds, themeFile]);

  const play = useCallback((name) => {
    if (!enabledRef.current) return;
    const pool = sfxRef.current?.[name];
    if (!pool) return;

    const picked = pickVoice(pool.voices, pool.next);
    pool.next = picked.next;

    const voice = pool.voices[picked.index];
    voice.currentTime = 0;
    voice.play().catch(() => {}); // 자동재생 차단 등은 조용히 무시
  }, []);

  /** 첫 제스처에서 모든 보이스를 한 번 재생·정지해 잠금을 풉니다. */
  const unlock = useCallback(() => {
    const sfx = sfxRef.current;
    if (!sfx) return;
    for (const { voices } of Object.values(sfx)) {
      for (const voice of voices) {
        voice
          .play()
          .then(() => {
            voice.pause();
            voice.currentTime = 0;
          })
          .catch(() => {});
      }
    }
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

  return { enabled, play, unlock, startTheme, stopTheme, toggle };
}
