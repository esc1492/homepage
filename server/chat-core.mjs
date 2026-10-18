/**
 * Chat 의 순수 core — SSE 이벤트에서 텍스트 델타만 뽑습니다.
 * 네트워크·Response·환경변수를 모르므로 그대로 테스트할 수 있습니다.
 */

/** Anthropic SSE 이벤트 하나에서 텍스트 델타만 뽑아냅니다. 없으면 빈 문자열. */
export function textFromEvent(rawEvent) {
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
