import test from "node:test";
import assert from "node:assert/strict";

import { textFromEvent } from "./chat-core.mjs";

test("content_block_delta 의 text_delta 를 뽑는다", () => {
  const raw =
    'event: content_block_delta\n' +
    'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"안녕"}}';
  assert.equal(textFromEvent(raw), "안녕");
});

test("ping·주석·비JSON 줄은 무시한다", () => {
  assert.equal(textFromEvent('data: {"type":"ping"}'), "");
  assert.equal(textFromEvent("event: ping"), "");
  assert.equal(textFromEvent("data: not-json"), "");
});

test("error 이벤트는 사용자 문구로 바꾼다", () => {
  assert.equal(
    textFromEvent('data: {"type":"error","error":{"message":"boom"}}'),
    "\n\n(오류가 발생했습니다: boom)",
  );
  assert.equal(
    textFromEvent('data: {"type":"error"}'),
    "\n\n(오류가 발생했습니다: 알 수 없음)",
  );
});

test("여러 data 줄이 있으면 첫 텍스트 델타를 쓴다", () => {
  const raw =
    'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"a"}}\n' +
    'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"b"}}';
  assert.equal(textFromEvent(raw), "a");
});
