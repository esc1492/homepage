import test from "node:test";
import assert from "node:assert/strict";

import { VOICES_PER_SOUND, audioUrl, pickVoice } from "./game-audio-core.mjs";

test("audioUrl: NEXT_PUBLIC_BASE_PATH 를 앞에 붙인다", () => {
  const saved = process.env.NEXT_PUBLIC_BASE_PATH;
  try {
    process.env.NEXT_PUBLIC_BASE_PATH = "/tetris";
    assert.equal(audioUrl("drop.mp3"), "/tetris/audio/drop.mp3");
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    assert.equal(audioUrl("drop.mp3"), "/audio/drop.mp3");
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = saved;
  }
});

test("pickVoice: 놀고 있는 보이스를 우선 쓴다", () => {
  const voices = [{ paused: false }, { paused: true }, { paused: false }];
  assert.deepEqual(pickVoice(voices, 2), { index: 1, next: 2 });
});

test("pickVoice: 전부 재생 중이면 차례대로 돌며 빼앗는다", () => {
  const voices = Array.from({ length: VOICES_PER_SOUND }, () => ({ paused: false }));
  assert.deepEqual(pickVoice(voices, 0), { index: 0, next: 1 });
  assert.deepEqual(pickVoice(voices, 3), { index: 3, next: 0 });
});

test("pickVoice: 빈 배열은 0번을 가리킨다", () => {
  assert.deepEqual(pickVoice([], 5), { index: 0, next: 0 });
});
