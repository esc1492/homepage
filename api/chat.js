// 챗봇(미키) API — 기존 Streamlit 앱(chatbot_app.py)을 Vercel 함수로 옮긴 것입니다.
//
// 이전 대비 달라진 점은 두 가지뿐입니다.
//   1. Supabase 로그인 토큰을 검증합니다 (Streamlit 판에는 인증이 없었습니다)
//   2. Anthropic의 SSE를 평문 텍스트 청크로 정규화해 내보냅니다
//
// 웹서치 도구·모델·토큰 한도는 기존 값을 그대로 유지합니다.

const SUPABASE_URL = "https://oggzgullnohqehthewuw.supabase.co";
const SUPABASE_KEY = "sb_publishable_XVSK5Evl0W64_7h-XLZ1cQ_rnzo3qMC";

// 실제 제공자는 DeepSeek 의 Anthropic 호환 엔드포인트입니다 (2026-09-21 확인).
// 기존 Streamlit 판도 ANTHROPIC_BASE_URL 환경변수로 바꿀 수 있었으므로 그 방식을 유지합니다.
const ANTHROPIC_BASE_URL =
  process.env.ANTHROPIC_BASE_URL || "https://api.deepseek.com/anthropic";
const ANTHROPIC_URL = `${ANTHROPIC_BASE_URL}/v1/messages`;

// DeepSeek 은 이 헤더를 무시하지만, Anthropic 규격을 그대로 두어 제공자를 바꿔도 동작하게 합니다.
const ANTHROPIC_VERSION = "2023-06-01";

// DeepSeek 은 Claude 모델명을 자동 매핑합니다 (claude-sonnet* → deepseek-flash).
// 기존 챗봇과 동일한 값을 유지합니다.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

// DeepSeek 은 Anthropic 의 서버 도구를 실제로 실행합니다 (web_search_20250305 확인됨).
const WEB_TOOL = { type: "web_search_20250305", name: "web_search" };

// SOUL.md 와 동기화를 유지합니다. (.vercelignore 의 `*.md` 때문에 SOUL.md 는 배포에
// 실려가지 않으므로 함수가 파일로 읽을 수 없어 여기에 둡니다.)
const SYSTEM_PROMPT = `# 🐭 미키 — AI 비서

너는 **미키**야. 사용자의 개인 시작 페이지에서 함께하는 AI 비서야.
사용자는 너를 신뢰하고 편하게 질문하는 사이야.

## 말투 규칙

- **항상 존댓말을 사용**해 ("-요", "-습니다", "-세요" 체).
- 반말, 해요체, 구어체 축약은 절대 하지 마.
- 친절하고 부드럽지만, 예의를 갖춘 말투를 유성해.
- 이모지나 리액션은 자연스럽게 사용해도 좋지만, 지나치게 가볍지 않게.

### ✅ 올바른 예
> "안녕하세요! 저는 미키입니다. 무엇을 도와드릴까요?"
> "네, 현재 날씨를 알려드리겠습니다. 잠시만 기다려 주세요."
> "말씀해 주셔서 감사합니다. 해당 기능을 안내해 드릴게요."

### ❌ 틀린 예
> "안녕! 나는 미키야~"
> "응, 알았어!"
> "그래, 도와줄게"

## 성격

- **친절하고 도움이 되는**: 사용자의 질문에 정확하고 유용한 답변을 제공해.
- **간결하지만 충분히**: 불필요하게 길게 말하지 말고, 필요한 정보는 빠짐없이 전달해.
- **시작 페이지 기능에 능숙함**: 날씨, 주식, 할 일 목록, 뉴스 등 페이지 기능을 잘 안내해.
- **실시간 정보 필요 시**: web_search 도구를 적극적으로 활용해서 정확한 정보를 제공해.`;

export const config = { maxDuration: 60 };

/** Supabase 에 토큰을 물어 사용자인지 확인합니다. 별도 시크릿이 필요 없습니다. */
async function isAuthorized(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return false;

  const token = header.slice(7).trim();
  if (!token) return false;

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

/** Anthropic SSE 이벤트 하나에서 텍스트 델타만 뽑아냅니다. 없으면 빈 문자열. */
function textFromEvent(rawEvent) {
  for (const line of rawEvent.split("\n")) {
    if (!line.startsWith("data:")) continue;

    let event;
    try {
      event = JSON.parse(line.slice(5).trim());
    } catch {
      continue; // 주석·ping 등 JSON 이 아닌 줄
    }

    if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
      return event.delta.text || "";
    }
    // 웹서치 중 발생하는 오류를 조용히 삼키면 응답이 그냥 잘린 것처럼 보입니다.
    if (event.type === "error") {
      return `\n\n(오류가 발생했습니다: ${event.error?.message || "알 수 없음"})`;
    }
  }
  return "";
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (!(await isAuthorized(request))) {
      return new Response("Unauthorized", { status: 401 });
    }

    let messages;
    try {
      ({ messages } = await request.json());
    } catch {
      return new Response("요청 본문이 올바른 JSON 이 아닙니다.", { status: 400 });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("messages 배열이 필요합니다.", { status: 400 });
    }

    const upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages,
        stream: true,
        tools: [WEB_TOOL],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return new Response(`Anthropic 오류 (HTTP ${upstream.status}): ${detail.slice(0, 300)}`, {
        status: 502,
      });
    }

    // SSE 를 그대로 흘리지 않고 텍스트만 뽑아 평문으로 내보냅니다.
    // 웹서치가 켜지면 server_tool_use·web_search_tool_result 등 텍스트가 아닌
    // 이벤트가 섞여 나오는데, 그 처리를 여기서 끝내면 브라우저가 Anthropic
    // 포맷을 알 필요가 없습니다.
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body.getReader();
        let buffer = "";

        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // SSE 이벤트는 빈 줄로 구분됩니다. 청크가 이벤트 중간에서
            // 끊길 수 있으므로 남은 조각은 buffer 에 이어 둡니다.
            let boundary;
            while ((boundary = buffer.indexOf("\n\n")) !== -1) {
              const text = textFromEvent(buffer.slice(0, boundary));
              buffer = buffer.slice(boundary + 2);
              if (text) controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  },
};
