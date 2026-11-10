---
paths:
  - "chat/**"
  - "api/chat.js"
---

# 챗봇 (미키) — `/chat`

> 루트 `CLAUDE.md` 의 해당 절을 그대로 옮긴 상세 문서입니다. `paths` 에 매칭되는 파일을
> 열 때만 로드됩니다. 요약 카드는 루트 `CLAUDE.md` 에 있습니다.


Streamlit 판(`chatbot_app.py`)을 Vercel 로 옮긴 것입니다 (2026-09-21). Streamlit 은 상시 구동 서버라 Vercel 에 올릴 수 없어 **UI 층을 다시 만들었습니다.**

- **서버**: `api/chat.js` — `export default { async fetch(request) }`
- **UI**: `chat/index.html` — 순수 HTML/CSS/JS. 빌드 도구 없음 → **재빌드 불필요**
- **경로**: `https://homepage-dwkim.vercel.app/chat` (홈페이지 바로가기 '챗봇' 타일 → 새 탭)
- `chatbot_app.py` 는 **보관용**으로 남겨둡니다 (테트리스·알카노이드의 `*_streamlit.py` 와 같은 선례)
- **Streamlit Cloud 앱은 2026-09-21 삭제했습니다** — 이전의 원래 동기 중 하나가 "인증 없이 누구나 쓸 수 있음"이었는데, 앱이 살아 있으면 그 구멍이 남으므로 보관용 코드만 남기고 앱은 폐기했습니다
  - ✅ **뒤에 백엔드가 있던** Streamlit Cloud 앱은 **전부 폐기했습니다** — 챗봇(2026-09-21) · OCR(2026-09-22) · 학습/VOCA(2026-09-23). 셋 다 `/chat`·`/ocr`·`/voca` 로 이전해 Vercel 이 서빙합니다
  - **게임 앱(테트리스·알카노이드)의 Streamlit Cloud 앱은 그대로 두었습니다** (2026-09-23 동완님 확인). 순수 클라이언트 사이드라 백엔드·시크릿·과금이 없어 **열려 있어도 잃을 것이 없습니다** — 앞의 셋을 폐기한 이유(인증 없이 누구나 쓸 수 있음 · 과금 API)가 여기엔 해당하지 않습니다. 서빙은 이제 `/tetris`·`/arkanoid` 이고 Streamlit 판은 중복입니다
  - ⚠️ **폐기 순서를 지키십시오: 이전 → 배포 → 프로덕션 검증 → 그 다음 앱 삭제.** 먼저 끄면 기능이 죽습니다. 삭제 여부는 **curl 로 판별되지 않습니다**(살아 있는 앱과 삭제된 앱이 똑같이 303) — 브라우저로 `share.streamlit.io/errors/not_found` 를 확인해야 합니다 (2026-09-22·23 두 번 모두)
  - 테트리스·알카노이드의 Streamlit 앱이 별도로 살아 있는지는 저장소에 URL이 남아 있지 않아 확인할 수 없습니다 (Streamlit Cloud 대시보드에서 확인)

## ⚠️ 실제 제공자는 DeepSeek 입니다 (Anthropic 이 아닙니다)

`ANTHROPIC_BASE_URL` 이 `https://api.deepseek.com/anthropic` 을 가리킵니다. Anthropic **호환** 엔드포인트라 Anthropic SDK·헤더 규격이 그대로 통합니다.

- `x-api-key` 완전 지원 · `stream`/`system`/`max_tokens` 완전 지원 · `anthropic-version` 은 무시됨
- **모델명은 자동 매핑**됩니다 — `claude-sonnet*` → `deepseek-flash`, `claude-opus*` → `deepseek-v4-pro`. 그래서 기존 `claude-sonnet-4-20250514` 가 그동안 동작했습니다. **Anthropic 모델 카탈로그를 기준으로 "낡았다"고 판단하면 안 됩니다** (2026-09-21 실제로 이 착각을 했습니다)
- `web_search_20250305` 서버 도구가 **실제로 실행됩니다** (2026-09-21 실제 호출로 확인 — 검색 질의가 생성되고 `server_tool_use`·`web_search_tool_result` 블록이 돌아옵니다). 문서의 `tools` 표에는 사용자 정의 도구 필드만 적혀 있어 문서만 보면 오판하게 됩니다
- 응답에는 `thinking` 블록이 함께 나오지만 함수가 `text_delta` 만 뽑으므로 화면에는 답변만 표시됩니다

## 인증

홈페이지와 **같은 origin** 이라 Supabase 세션이 자동 공유됩니다 (앨범과 같은 원리). 함수는 `Authorization: Bearer <token>` 을 받아 `GET {SUPABASE_URL}/auth/v1/user` 로 검증하고, 실패하면 **Anthropic 을 호출하지 않고** 401 을 돌려줍니다. 별도 시크릿이 필요 없습니다.

## 파일 구조

| 경로 | 역할 |
| --- | --- |
| `api/chat.js` | Anthropic(DeepSeek) 프록시 + Supabase 토큰 검증. SSE 를 평문 텍스트 청크로 정규화 |
| `chat/index.html` | 채팅 UI. 홈페이지와 같은 방식으로 supabase-js 를 CDN 에서 로드 |

## 설계 요점

- **SSE 정규화**: Anthropic 의 SSE 를 그대로 흘리지 않고 `content_block_delta` → `text_delta` 만 뽑아 평문으로 내보냅니다. 웹서치가 켜지면 `server_tool_use`·`web_search_tool_result`·`ping` 등 텍스트가 아닌 이벤트가 섞이는데, 그 처리를 함수에서 끝내면 브라우저가 Anthropic 포맷을 알 필요가 없습니다. 청크가 이벤트 중간에서 끊길 수 있으므로 **버퍼에 이어 두고 빈 줄(`\n\n`) 경계로 자릅니다.**
- **첫 메시지는 반드시 `user`** — 인사말을 이력에 넣어 보내면 규칙 위반입니다. 인사말은 화면에만 그리고 API 로는 보내지 않습니다. (기존 Streamlit 판은 인사말을 이력에 넣어 보냈습니다)
- **`SOUL.md` 는 함수 안에 인라인**되어 있습니다. `.vercelignore` 의 `*.md` 때문에 SOUL.md 는 배포에 실려가지 않아 함수가 파일로 읽을 수 없습니다. 파일로 두든 상수로 두든 수정에 커밋+배포가 필요하므로 운영상 차이는 없습니다
- **히스토리는 메모리 보관** — 새로고침 시 초기화됩니다. 기존 Streamlit 동작과 같습니다 (의도된 범위)
- 대화 이력 20개 제한(`MAX_HISTORY`)은 기존과 동일하며 **클라이언트가** 잘라 보냅니다

## 환경변수

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | **필수** | DeepSeek API 키. 로컬은 `.env.local`, 배포는 Vercel 환경변수 |
| `ANTHROPIC_BASE_URL` | 선택 | 기본값 `https://api.deepseek.com/anthropic` |
| `ANTHROPIC_MODEL` | 선택 | 기본값 `claude-sonnet-4-20250514` (DeepSeek 이 자동 매핑) |

## ⚠️ 함정 (재발 방지)

1. **정적 배포에 함수를 얹을 수 있습니다.** `framework: null` + `buildCommand: null` + `outputDirectory: "."` 조합에서도 `api/` 는 함께 빌드됩니다. `vercel dev` 로 배포 없이 확인할 수 있습니다
2. `rewrites` destination 에 **`.html` 금지** (위 Deployment 절 참조). `/chat` 은 `/chat/index` 로 보냅니다
3. **로그인 게이트는 마크업이 선언합니다.** 인증이 필요한 `data-link` 항목에 `data-auth`를 붙이면 클릭 시 실제 세션(`window.session.getSession()`)을 확인하고 로그인 모달을 엽니다. URL 문자열 목록은 제거했으므로 링크를 추가할 때 목록을 고칠 필요가 없습니다. 이 게이트는 **UX 용이며 실제 보안 경계는 함수의 401** 입니다
