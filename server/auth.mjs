/**
 * 서버 인증 seam.
 *
 * Supabase 토큰 검증을 한 곳에서 합니다. 실패 원인을 구분합니다:
 * - 토큰 없음/무효 → 401
 * - Supabase 연결·응답 실패 → 502 (로그인 만료로 오인하지 않게)
 */

import { SUPABASE_KEY, SUPABASE_URL } from "./config.mjs";
import { HttpError } from "./http.mjs";

export function bearerToken(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

export function parseAllowlist(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireUser(request, { fetchImpl = fetch } = {}) {
  const token = bearerToken(request);
  if (!token) throw new HttpError(401, "Unauthorized");

  let res;
  try {
    res = await fetchImpl(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new HttpError(502, "인증 서버에 연결하지 못했습니다.");
  }

  if (!res.ok) throw new HttpError(401, "Unauthorized");

  try {
    return await res.json();
  } catch {
    throw new HttpError(502, "인증 서버 응답을 해석하지 못했습니다.");
  }
}

/** requireUser + 이메일 허용목록. 목록이 비어 있으면 전부 거부합니다 (fail-closed). */
export async function requireAllowedUser(request, allowlistValue, options = {}) {
  const user = await requireUser(request, options);

  const allowed = parseAllowlist(allowlistValue);
  if (!allowed.length) {
    throw new HttpError(403, "VOCA_ALLOWED_EMAILS 가 설정되지 않아 요청을 거부했습니다.");
  }
  if (!allowed.includes(String(user?.email || "").toLowerCase())) {
    throw new HttpError(403, "허용되지 않은 계정입니다.");
  }
  return user;
}
