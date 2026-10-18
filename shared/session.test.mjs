import test from 'node:test';
import assert from 'node:assert/strict';

import { authHeaders, loggedInFlag, session } from './session.mjs';

test('authHeaders: 토큰이 없으면 빈 객체, 있으면 Bearer', () => {
  assert.deepEqual(authHeaders(null), {});
  assert.deepEqual(authHeaders('abc'), { Authorization: 'Bearer abc' });
});

test('loggedInFlag: 세션 유무를 저장값으로 바꾼다', () => {
  assert.equal(loggedInFlag(null), null);
  assert.equal(loggedInFlag({ access_token: 't' }), '1');
});

test('세션 수명주기: 초기화 → 로그인 → 토큰 갱신 → 로그아웃', async () => {
  const store = new Map();
  let emit = null;
  const fakeClient = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: (fn) => {
        emit = fn;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signInWithPassword: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
    },
  };

  const initial = await session.init({
    url: 'https://example.supabase.co',
    key: 'publishable',
    createClient: () => fakeClient,
    storage: {
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
      getItem: (k) => (store.has(k) ? store.get(k) : null),
    },
  });

  assert.equal(initial, null);
  assert.equal(store.has('loggedIn'), false);

  const states = [];
  const off = session.onChange((state) => states.push(state.loggedIn));

  emit('SIGNED_IN', { access_token: 't1' });
  assert.equal(session.getAccessToken(), 't1');
  assert.equal(store.get('loggedIn'), '1');

  // 토큰 스냅샷 결함의 회귀 테스트: 갱신 이벤트 후 새 토큰을 돌려줘야 합니다.
  emit('TOKEN_REFRESHED', { access_token: 't2' });
  assert.equal(session.getAccessToken(), 't2');

  // authedFetch 는 호출 시점의 최신 토큰을 헤더에 넣어야 합니다.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => ({ input, init });
  try {
    const response = await session.authedFetch('/api/test', {
      headers: { 'content-type': 'application/json' },
    });
    assert.equal(response.init.headers.get('Authorization'), 'Bearer t2');
    assert.equal(response.init.headers.get('content-type'), 'application/json');
  } finally {
    globalThis.fetch = originalFetch;
  }

  emit('SIGNED_OUT', null);
  assert.equal(session.getAccessToken(), null);
  assert.equal(store.has('loggedIn'), false);

  assert.deepEqual(states, [true, true, false]);
  off();
});
