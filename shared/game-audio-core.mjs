/**
 * 게임 오디오의 순수 core — React·DOM 을 import 하지 않습니다.
 * 두 게임(tetris·arkanoid)이 같은 풀 선택 규칙을 쓰는지 테스트할 수 있는 표면입니다.
 */

/** 효과음 하나당 보이스 수. 단일 Audio 를 되감으면 앞 소리가 잘려 4개를 돌립니다. */
export const VOICES_PER_SOUND = 4;

/**
 * ⚠️ basePath 는 문자열 URL 에 자동으로 붙지 않습니다. `new Audio('/audio/x.mp3')` 는
 *    그대로 나가 404 가 되므로 NEXT_PUBLIC_BASE_PATH 를 앞에 붙입니다.
 */
export function audioUrl(file) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/audio/${file}`;
}

/**
 * 재생할 보이스를 고릅니다. 놀고 있는(paused) 보이스를 우선 쓰고,
 * 전부 재생 중이면 차례대로 돌며 가장 오래된 것을 빼앗습니다.
 * @returns {{ index: number, next: number }}
 */
export function pickVoice(voices, next) {
  if (!voices || !voices.length) return { index: 0, next: 0 };

  const free = voices.findIndex((voice) => voice.paused);
  if (free !== -1) return { index: free, next };

  const index = next % voices.length;
  return { index, next: (index + 1) % voices.length };
}
