/**
 * 세션 module — Supabase 부트스트랩·세션 상태·토큰 주입·로그인 플래그를 소유합니다.
 *
 * 네 페이지(index·chat·ocr·voca)가 각자 `createClient`와 `getSession`을 복사하던 것을
 * 한 곳으로 모읍니다. 특히 서브 페이지가 `access_token`을 최초 값으로 스냅샷해
 * 토큰 갱신 후에도 옛 문자열을 보내던 결함을 없앱니다 — `onAuthStateChange`의
 * TOKEN_REFRESHED 가 올 때마다 `getAccessToken()`이 새 값을 돌려줍니다.
 *
 * module script 는 deferred 라 페이지의 classic inline script 보다 나중에 실행됩니다.
 * 그래서 페이지는 `window.session.init(...)`을 DOMContentLoaded 이후(또는 init 자체를)
 * 호출합니다.
 */

const STORAGE_KEY = 'loggedIn';

let client = null;
let currentSession = null;
let initPromise = null;
let storage = null;
const listeners = new Set();

/** 순수 함수 — 테스트 표면. */
export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** 순수 함수 — 게임들이 읽는 localStorage 플래그 값. */
export function loggedInFlag(session) {
  return session ? '1' : null;
}

function writeFlag(loggedIn) {
  if (!storage) return;
  try {
    if (loggedIn) storage.setItem(STORAGE_KEY, '1');
    else storage.removeItem(STORAGE_KEY);
  } catch {
    // 사생활 보호 모드 등에서 storage 가 막힐 수 있습니다. 세션 자체는 계속 동작합니다.
  }
}

function notify() {
  writeFlag(Boolean(currentSession));
  const snapshot = { session: currentSession, loggedIn: Boolean(currentSession) };
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch (error) {
      console.error('session listener failed', error);
    }
  });
}

/** 세션 변화 구독. 해제 함수를 돌려줍니다. */
export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getClient() {
  return client;
}

export function getSession() {
  return currentSession;
}

export function getAccessToken() {
  return currentSession ? currentSession.access_token : null;
}

/**
 * Supabase 클라이언트를 만들고 세션 추적을 시작합니다. 여러 번 불러도 한 번만 초기화합니다.
 * @returns {Promise<object|null>} 현재 세션
 */
export function init({ url, key, createClient, storage: storageAdapter } = {}) {
  if (initPromise) return initPromise;

  const factory =
    createClient ||
    (typeof window !== 'undefined' && window.supabase && window.supabase.createClient);
  if (!factory) return Promise.reject(new Error('Supabase client factory is unavailable'));

  storage =
    storageAdapter || (typeof globalThis !== 'undefined' ? globalThis.localStorage : null);
  client = factory(url, key);

  client.auth.onAuthStateChange((_event, nextSession) => {
    currentSession = nextSession || null;
    notify();
  });

  initPromise = client.auth.getSession().then((res) => {
    currentSession = (res && res.data && res.data.session) || null;
    notify();
    return currentSession;
  });
  return initPromise;
}

/** API 호출용 fetch. 매 요청마다 최신 토큰을 헤더에 넣습니다. */
export function authedFetch(input, initOptions = {}) {
  const headers = new Headers(initOptions.headers || {});
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...initOptions, headers });
}

export function signIn(email, password) {
  if (!client) return Promise.reject(new Error('session.init() must run first'));
  return client.auth.signInWithPassword({ email, password });
}

export function signOut() {
  if (!client) return Promise.reject(new Error('session.init() must run first'));
  return client.auth.signOut();
}

export const session = {
  init,
  onChange,
  getClient,
  getSession,
  getAccessToken,
  authHeaders,
  loggedInFlag,
  authedFetch,
  signIn,
  signOut,
};

if (typeof window !== 'undefined') {
  window.session = session;
}
