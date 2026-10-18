import test from "node:test";
import assert from "node:assert/strict";

import { bearerToken, parseAllowlist, requireAllowedUser, requireUser } from "./auth.mjs";

const requestWith = (token) =>
  new Request("https://example.test/api", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

const assertStatus = (status) => (error) => {
  assert.equal(error.status, status);
  return true;
};

test("bearerToken: 형식이 맞을 때만 토큰을 돌려준다", () => {
  assert.equal(bearerToken(requestWith("abc")), "abc");
  assert.equal(bearerToken(requestWith("")), null);
  assert.equal(
    bearerToken(new Request("https://example.test", { headers: { authorization: "Basic abc" } })),
    null,
  );
});

test("parseAllowlist: 쉼표·공백·대소문자를 정규화한다", () => {
  assert.deepEqual(parseAllowlist(" A@x.com, b@y.com ,"), ["a@x.com", "b@y.com"]);
  assert.deepEqual(parseAllowlist(""), []);
  assert.deepEqual(parseAllowlist(undefined), []);
});

test("requireUser: 토큰이 없으면 fetch 없이 401", async () => {
  let called = false;
  await assert.rejects(
    requireUser(requestWith(null), { fetchImpl: async () => { called = true; } }),
    assertStatus(401),
  );
  assert.equal(called, false);
});

test("requireUser: 유효한 토큰이면 사용자를 돌려준다", async () => {
  const user = await requireUser(requestWith("t"), {
    fetchImpl: async () => ({ ok: true, json: async () => ({ email: "a@x.com" }) }),
  });
  assert.equal(user.email, "a@x.com");
});

test("requireUser: Supabase 연결 실패는 401 이 아니라 502", async () => {
  await assert.rejects(
    requireUser(requestWith("t"), { fetchImpl: async () => { throw new Error("offline"); } }),
    assertStatus(502),
  );
});

test("requireUser: 응답이 !ok 이면 401", async () => {
  await assert.rejects(
    requireUser(requestWith("t"), { fetchImpl: async () => ({ ok: false }) }),
    assertStatus(401),
  );
});

test("requireUser: 응답 JSON 이 깨지면 502", async () => {
  await assert.rejects(
    requireUser(requestWith("t"), {
      fetchImpl: async () => ({ ok: true, json: async () => { throw new Error("bad json"); } }),
    }),
    assertStatus(502),
  );
});

test("requireAllowedUser: 목록이 비면 fail-closed 403", async () => {
  await assert.rejects(
    requireAllowedUser(requestWith("t"), "", {
      fetchImpl: async () => ({ ok: true, json: async () => ({ email: "a@x.com" }) }),
    }),
    assertStatus(403),
  );
});

test("requireAllowedUser: 목록에 없는 계정은 403, 있으면 통과", async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ email: "A@x.com" }) });
  await assert.rejects(
    requireAllowedUser(requestWith("t"), "b@y.com", { fetchImpl }),
    assertStatus(403),
  );
  const user = await requireAllowedUser(requestWith("t"), "a@X.com", { fetchImpl });
  assert.equal(user.email, "A@x.com");
});
