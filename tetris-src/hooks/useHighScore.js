import { useEffect, useState } from 'react';

// 홈페이지의 기존 키(myTodos, loggedIn)와 같은 평면 네이밍을 따릅니다.
const STORAGE_KEY = 'tetrisHighScore';

/**
 * localStorage 에서 읽은 원시 문자열을 점수로 해석합니다.
 * 값이 없거나 깨져 있으면 0 — HUD 에 NaN 이 뜨는 것을 막습니다.
 *
 * @param {string | null | undefined} raw
 * @returns {number}
 */
export function parseStoredScore(raw) {
  const value = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function readStoredScore() {
  try {
    return parseStoredScore(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Safari 사생활 보호 모드 등 localStorage 접근 자체가 막힌 환경
    return 0;
  }
}

/**
 * 최고 점수를 localStorage 에 보관합니다.
 *
 * 반환값은 "지금까지의 최고"이므로, 현재 점수가 이를 넘으면 즉시 올라갑니다.
 * (게임오버를 기다리지 않아 플레이 중에 기록이 갱신되는 것을 볼 수 있습니다.)
 *
 * @param {number} score 현재 점수
 * @returns {number} 최고 점수
 */
export function useHighScore(score) {
  const [highScore, setHighScore] = useState(0);

  // ⚠️ localStorage 는 브라우저 전용입니다. 렌더 중에 읽으면 서버 프리렌더에서
  //    ReferenceError 가 나거나 하이드레이션 불일치가 생기므로 effect 에서 읽습니다.
  //    (서버와 클라이언트 첫 렌더 모두 0 을 그린 뒤 effect 에서 실제 값으로 채웁니다.)
  useEffect(() => {
    setHighScore(readStoredScore());
  }, []);

  useEffect(() => {
    if (score <= highScore) return;

    setHighScore(score);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(score));
    } catch {
      // 저장이 막혀 있어도 게임 진행은 계속되어야 합니다 (이번 세션 동안만 유지)
    }
  }, [score, highScore]);

  return highScore;
}
