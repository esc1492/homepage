'use client';

import { useGameAudio } from '../shared/game-audio.mjs';

// 효과음 이름과 순서는 기존과 같습니다. module 상수라 effect 가 다시 돌지 않습니다.
const SFX = ['swipe', 'drop', 'change', 'break'];

/**
 * 알카노이드 오디오 — 테마곡 없이 효과음 4종만 씁니다.
 * 공유 구현은 `shared/game-audio.mjs` 이고, 빌드 전 `scripts/sync-shared.mjs` 가 복사합니다.
 */
export function useAudio() {
  return useGameAudio({ sounds: SFX });
}
