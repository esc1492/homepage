import test from "node:test";
import assert from "node:assert/strict";

import { HttpError, errorJson, json, methodNotAllowed } from "./http.mjs";

test("json: 상태·content-type·본문을 그대로 만든다", async () => {
  const res = json({ ok: true }, 201);
  assert.equal(res.status, 201);
  assert.match(res.headers.get("content-type"), /application\/json/);
  assert.deepEqual(await res.json(), { ok: true });
});

test("methodNotAllowed: 405 JSON", async () => {
  const res = methodNotAllowed();
  assert.equal(res.status, 405);
  assert.deepEqual(await res.json(), { error: "Method Not Allowed" });
});

test("errorJson: HttpError 의 상태·메시지를 보존한다", async () => {
  const res = errorJson(new HttpError(403, "허용되지 않은 계정입니다."));
  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { error: "허용되지 않은 계정입니다." });
});

test("errorJson: 예상 밖 오류는 500 일반 메시지로 가린다", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const res = errorJson(new Error("internal detail"));
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: "서버 오류가 발생했습니다." });
  } finally {
    console.error = original;
  }
});
