/**
 * 서버 공통 HTTP 응답.
 *
 * 오류는 JSON `{ error }` 하나로 통일합니다. chat 의 평문 응답도 이 module 을 씁니다.
 */

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function methodNotAllowed() {
  return json({ error: "Method Not Allowed" }, 405);
}

/** HttpError 는 상태·메시지를 그대로, 예상 밖 오류는 500 + 일반 메시지로 바꿉니다. */
export function errorJson(error) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  console.error(error);
  return json({ error: "서버 오류가 발생했습니다." }, 500);
}
