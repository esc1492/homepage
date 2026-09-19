'use client';

import { useCallback, useEffect, useRef } from 'react';

// 원본이 base64 로 인라인하던 4개 파일. 테트리스와 같은 파일명을 그대로 씁니다.
const SFX_NAMES = ['swipe', 'drop', 'change', 'break'];

/**
 * 효과음 하나당 보이스 수.
 *
 * 단일 Audio 를 매번 currentTime = 0 으로 되감아 재생하면 앞 소리가 잘립니다.
 * 벽·브릭 소리는 연타로 겹치므로 4개면 충분합니다.
 */
const VOICES_PER_SOUND = 4;

/**
 * ⚠️ basePath('/arkanoid') 는 문자열 URL 에 자동으로 붙지 않습니다.
 *    new Audio('/audio/x.mp3') 는 그대로 나가 404 가 됩니다. NEXT_PUBLIC_BASE_PATH 를 붙여야 합니다.
 */
function audioUrl(file) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/audio/${file}`;
}

/**
 * 원본에는 테마곡이 없습니다 (효과음 4개뿐). 그래서 테트리스의 useAudio 보다 단순합니다 —
 * startTheme/stopTheme/preload='none' 이 모두 빠집니다.
 */
export function useAudio() {
  const sfxRef = useRef(null);

  useEffect(() => {
    // ⚠️ Audio 는 브라우저 전용입니다. 모듈 최상위에서 만들면 서버 프리렌더에서 ReferenceError
    //    가 나고 static export 빌드가 통째로 실패합니다.
    const pools = {};
    for (const name of SFX_NAMES) {
      const voices = [];
      for (let i = 0; i < VOICES_PER_SOUND; i++) {
        const voice = new Audio(audioUrl(`${name}.mp3`));
        voice.preload = 'auto';
        voices.push(voice);
      }
      pools[name] = { voices, next: 0 };
    }
    sfxRef.current = pools;

    return () => {
      // StrictMode 이중 마운트로 Audio 객체가 두 벌 생기는 것을 막습니다.
      for (const name of SFX_NAMES) {
        for (const voice of pools[name].voices) voice.pause();
      }
      sfxRef.current = null;
    };
  }, []);

  const play = useCallback((name) => {
    const pool = sfxRef.current?.[name];
    if (!pool) return;

    // 재생이 끝난 보이스는 paused 가 true 입니다. 놀고 있는 것을 우선 쓰고,
    // 전부 재생 중이면 차례대로 돌며 가장 오래된 것을 빼앗습니다.
    let voice = pool.voices.find((v) => v.paused);
    if (!voice) {
      voice = pool.voices[pool.next];
      pool.next = (pool.next + 1) % pool.voices.length;
    }

    voice.currentTime = 0;
    voice.play().catch(() => {}); // 자동재생 차단은 조용히 무시
  }, []);

  /**
   * 첫 제스처에서 모든 보이스를 한 번 재생·정지해 잠금을 풉니다.
   * 일부 브라우저는 페이지 단위가 아니라 Audio 요소 단위로 잠금을 걸기 때문에 필요합니다.
   */
  const unlock = useCallback(() => {
    const pools = sfxRef.current;
    if (!pools) return;
    for (const name of SFX_NAMES) {
      for (const voice of pools[name].voices) {
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

  return { play, unlock };
}
