import test from 'node:test';
import assert from 'node:assert/strict';

import { parseStoredScore } from './useHighScore.js';

test('parseStoredScore: 정상 값은 정수로 읽는다', () => {
  assert.equal(parseStoredScore('1234'), 1234);
  assert.equal(parseStoredScore('  42  '), 42, '앞뒤 공백 무시');
  assert.equal(parseStoredScore('12.9'), 12, '소수점은 버림');
});

test('parseStoredScore: 값이 없으면 0', () => {
  assert.equal(parseStoredScore(null), 0);
  assert.equal(parseStoredScore(undefined), 0);
  assert.equal(parseStoredScore(''), 0);
});

test('parseStoredScore: 깨진 값·음수·0 은 0 으로 눌러 HUD 에 NaN 이 뜨지 않게 한다', () => {
  assert.equal(parseStoredScore('abc'), 0);
  assert.equal(parseStoredScore('NaN'), 0);
  assert.equal(parseStoredScore('-5'), 0);
  assert.equal(parseStoredScore('0'), 0);
});
