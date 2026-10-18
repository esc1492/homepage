// 챗봇(미키) API — 기존 Streamlit 앱(chatbot_app.py)을 Vercel 함수로 옮긴 것입니다.
//
// 이전 대비 달라진 점은 두 가지뿐입니다.
//   1. Supabase 로그인 토큰을 검증합니다 (Streamlit 판에는 인증이 없었습니다)
//   2. Anthropic의 SSE를 평문 텍스트 청크로 정규화해 내보냅니다
//
// 웹서치 도구·모델·토큰 한도는 기존 값을 그대로 유지합니다.

import { anthropicConfig } from "../server/config.mjs";
import { textFromEvent } from "../server/chat-core.mjs";
import { requireUser } from "../server/auth.mjs";
import { errorJson, json, methodNotAllowed } from "../server/http.mjs";

// 실제 제공자는 DeepSeek 의 Anthropic 호환 엔드포인트입니다 (2026-09-21 확인).
// base URL·모델·버전·토큰 한도는 server/config.mjs 가 소유합니다.

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
- **시작 페이지 기능에 능숙함**: 날씨, 할 일 목록, 앨범·영단어·OCR 바로가기 등 페이지 기능을 잘 안내해.
- **실시간 정보 필요 시**: web_search 도구를 적극적으로 활용해서 정확한 정보를 제공해.`;

export const config = { maxDuration: 60 };

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return methodNotAllowed();
    }

    try {
      await requireUser(request);
    } catch (error) {
      return errorJson(error);
    }

    let messages;
    try {
      ({ messages } = await request.json());
    } catch {
      return json({ error: "요청 본문이 올바른 JSON 이 아닙니다." }, 400);
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: "messages 배열이 필요합니다." }, 400);
    }

    const { url, version, model, maxTokens } = anthropicConfig();

    let upstream;
    try {
      upstream = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": version,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: SYSTEM_PROMPT,
          messages,
          stream: true,
          tools: [WEB_TOOL],
        }),
      });
    } catch {
      return json({ error: "AI 서버에 연결하지 못했습니다." }, 502);
    }

    if (!upstream.ok) {
      const detail = await upstream.text();
      return json(
        { error: `Anthropic 오류 (HTTP ${upstream.status}): ${detail.slice(0, 300)}` },
        502,
      );
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
