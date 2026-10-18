# ADR-0005: 서버 공통 관심사는 `server/`의 seam이 소유한다

- **상태**: Accepted (2026-10-18)
- **관련**: ADR-0002, `GLOSSARY.md`, `CLAUDE.md`의 「서버 공유 seam」

## 맥락

`api/chat.js`·`api/ocr.js`·`api/voca.js`가 공통 관심사를 각자 복사해 갖고 있었습니다.

- **인증 3벌**: `isAuthorized`(chat·ocr, boolean)와 `requireOwner`(voca, 예외 + 이메일 허용목록).
- **JSON helper 2벌**: ocr·voca의 동일한 `json()`.
- **오류 형태 3가지**: chat은 평문, ocr는 평문과 JSON 혼합, voca는 JSON.
- **설정 11곳**: `process.env` 읽기와 `SUPABASE_URL/KEY` 리터럴이 세 함수에 복사.
- **provider 설정 2벌**: Anthropic base URL·모델·버전·토큰 한도가 chat과 voca에 복사.
- 인증 실패가 모두 401로 뭉개져 Supabase 장애를 로그인 만료로 오인했습니다.

## 결정

1. 공유 module을 **`api/` 밖 `server/`** 에 둡니다.
2. `server/auth.mjs` — `requireUser`·`requireAllowedUser`·`bearerToken`·`parseAllowlist`.
3. `server/http.mjs` — `json`·`methodNotAllowed`·`errorJson`·`HttpError`.
4. `server/config.mjs` — Supabase 상수·`anthropicConfig()`.
5. **오류는 JSON `{ error }` 하나**로 통일하고, chat 클라이언트의 오류 표시를 JSON 파싱으로 바꿉니다.
6. 인증 실패를 **401(토큰 없음·무효) / 502(Supabase 연결·응답 실패)** 로 구분합니다.
7. **Anthropic 전송 조립은 옮기지 않습니다.** 설정만 공유합니다 (이번 범위 결정).
8. **영구 테스트**를 둡니다: `server/*.test.mjs`, 루트 `npm test`, `fetch` 주입.

## 근거

- **Vercel 문서가 `api/` 밖을 권장합니다.** “Keep shared utilities and route modules outside `api/`
  and import them from your function entry point.” `api/_lib/`은 엔드포인트로 노출되지는 않지만,
  상대 import가 런타임에 `ERR_MODULE_NOT_FOUND`로 실패한 사례가 보고되어 있습니다.
- **오류 형태를 하나로 만들려면 클라이언트 한 곳을 고쳐야 합니다.** chat은 오류를 `res.text()`로
  표시하므로, JSON `{ error }`에서 `error`를 뽑도록 4줄을 바꿉니다. 이 변경으로 세 형태가 하나가 됩니다.
- **401과 502는 다른 사건입니다.** 전자는 재로그인, 후자는 재시도·장애 안내가 맞습니다.
  클라이언트는 둘 다 오류로 처리하므로 UX 호환은 유지됩니다.
- **전송 조립까지 옮기면 diff가 커집니다.** chat은 SSE 정규화, voca는 비스트리밍 파싱으로 목적이
  다릅니다. 설정 공유만으로 provider 값의 drift는 막을 수 있습니다.
- **영구 테스트가 가능해졌습니다.** `fetch`를 주입하면 인증·허용목록·오류 매핑을 네트워크 없이
  검증합니다. 핸들러의 405/401 경로도 import만으로 검증됩니다 (`server/handlers.test.mjs`).

## 결과

- 인증·오류·설정의 원본은 `server/` 하나입니다.
- `server/*.mjs`는 `api/` 밖에 있어 정적 자산으로도 서빙됩니다. 저장소가 공개이고 시크릿이 없으므로
  문제가 아니지만, `server/*.test.mjs`는 `.vercelignore`로 배포에서 제외합니다.
- 루트 `package.json`에 `"type": "module"`을 추가했습니다 — Node가 `api/*.js`를 ESM으로 읽어
  handler import 테스트가 가능해집니다 (Vercel은 원래부터 ESM을 처리합니다).
- 예상 밖 오류는 더 이상 `${error.name}: ${error.message}`를 노출하지 않고 일반 메시지 + 로그로 바꿉니다.
- Anthropic 전송 조립 중복은 남아 있습니다. 필요하면 별도 후보로 다룹니다.
