/**
 * 서버 공통 설정.
 *
 * 세 함수(chat·ocr·voca)에 복사되어 있던 Supabase 상수와 Anthropic 전송 설정을 모읍니다.
 * Anthropic 값은 요청 시점에 읽습니다 — 테스트에서 env 를 바꿔 검증할 수 있게.
 */

export const SUPABASE_URL = "https://oggzgullnohqehthewuw.supabase.co";
export const SUPABASE_KEY = "sb_publishable_XVSK5Evl0W64_7h-XLZ1cQ_rnzo3qMC";

export function anthropicConfig() {
  const baseUrl = (process.env.ANTHROPIC_BASE_URL || "https://api.deepseek.com/anthropic")
    .replace(/\/+$/, "");
  return {
    url: `${baseUrl}/v1/messages`,
    version: "2023-06-01",
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    maxTokens: 4096,
  };
}
