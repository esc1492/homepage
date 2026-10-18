import test from "node:test";
import assert from "node:assert/strict";

import chat from "../api/chat.js";
import ocr from "../api/ocr.js";
import voca from "../api/voca.js";

const endpoint = "https://homepage.test/api";

test("chat: GET 은 405 JSON", async () => {
  const res = await chat.fetch(new Request(`${endpoint}/chat`));
  assert.equal(res.status, 405);
  assert.deepEqual(await res.json(), { error: "Method Not Allowed" });
});

test("ocr: GET 은 405 JSON", async () => {
  const res = await ocr.fetch(new Request(`${endpoint}/ocr`));
  assert.equal(res.status, 405);
  assert.deepEqual(await res.json(), { error: "Method Not Allowed" });
});

test("voca: PUT 은 405 JSON", async () => {
  const res = await voca.fetch(new Request(`${endpoint}/voca`, { method: "PUT" }));
  assert.equal(res.status, 405);
  assert.deepEqual(await res.json(), { error: "Method Not Allowed" });
});

test("세 함수 모두 토큰 없는 POST 는 네트워크 없이 401 JSON", async () => {
  for (const [name, handler] of [["chat", chat], ["ocr", ocr], ["voca", voca]]) {
    const res = await handler.fetch(new Request(`${endpoint}/${name}`, { method: "POST" }));
    assert.equal(res.status, 401, name);
    assert.deepEqual(await res.json(), { error: "Unauthorized" }, name);
  }
});

const chatRequest = () =>
  new Request(`${endpoint}/chat`, {
    method: "POST",
    headers: { authorization: "Bearer t", "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
  });

const withFetch = async (impl, fn) => {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
};

test("chat: 인증 성공 + SSE 텍스트 델타를 평문으로 정규화한다", async () => {
  const calls = [];
  await withFetch(
    async (url) => {
      calls.push(String(url));
      if (String(url).includes("/auth/v1/user")) {
        return new Response(JSON.stringify({ email: "a@x.com" }), { status: 200 });
      }
      return new Response(
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"안녕"}}\n\n' +
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"하세요"}}\n\n',
        { status: 200, headers: { "content-type": "text/event-stream" } },
      );
    },
    async () => {
      const res = await chat.fetch(chatRequest());
      assert.equal(res.status, 200);
      assert.equal(await res.text(), "안녕하세요");
      assert.equal(calls.length, 2);
    },
  );
});

test("chat: upstream 오류는 JSON {error} 502", async () => {
  await withFetch(
    async (url) => {
      if (String(url).includes("/auth/v1/user")) {
        return new Response(JSON.stringify({ email: "a@x.com" }), { status: 200 });
      }
      return new Response("boom", { status: 500 });
    },
    async () => {
      const res = await chat.fetch(chatRequest());
      assert.equal(res.status, 502);
      const body = await res.json();
      assert.match(body.error, /Anthropic 오류 \(HTTP 500\)/);
    },
  );
});

test("ocr: translate 는 core 를 거쳐 JSON text 를 돌려준다", async () => {
  await withFetch(
    async (url) => {
      if (String(url).includes("/auth/v1/user")) {
        return new Response(JSON.stringify({ email: "a@x.com" }), { status: 200 });
      }
      return new Response(JSON.stringify([[["번역", "hello"]]]), { status: 200 });
    },
    async () => {
      const res = await ocr.fetch(
        new Request(`${endpoint}/ocr?translate=1`, {
          method: "POST",
          headers: { authorization: "Bearer t", "content-type": "text/plain" },
          body: "hello",
        }),
      );
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { text: "번역" });
    },
  );
});
