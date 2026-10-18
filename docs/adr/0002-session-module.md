# ADR-0002: 세션 상태는 하나의 module이 소유한다

- **상태**: Accepted (2026-10-18)
- **관련**: ADR-0001, `GLOSSARY.md`, `CLAUDE.md`의 「세션 module」

## 맥락

네 페이지가 각자 Supabase 부트스트랩과 세션 조회를 복사하고 있었습니다.

- `index.html`은 `createClient` + `onAuthStateChange` + `getSession`으로 상태를 추적했습니다.
- `chat`·`ocr`·`voca`는 `createClient` + `getSession`만 했고, `access_token`을 **최초 값으로
  스냅샷**했습니다. 토큰이 갱신되어도 옛 문자열을 계속 보내 401로 떨어질 수 있었습니다.
- `localStorage.loggedIn`은 index가 쓰고 게임 3종 SiteNav가 읽었습니다. 세션과 플래그가
  서로 다른 시점에 갱신되어, 유효한 세션인데 게이트가 뜨거나 그 반대가 될 수 있었습니다.
- 401 처리는 페이지마다 달랐습니다: chat은 화면·이력을 롤백, ocr는 상태 표시, voca는 게이트.

## 결정

1. **네 페이지 전부** `shared/session.mjs`를 씁니다.
2. module은 `window.session`으로 노출합니다. 페이지 스크립트를 module로 바꾸지 않습니다.
3. `authedFetch(url, init)`가 **요청 시점의 최신 토큰**을 헤더에 넣습니다. 401 UI는 페이지가 맡습니다.
4. `localStorage.loggedIn`은 module이 **단독으로** 씁니다. index도 직접 쓰지 않습니다.
5. index는 classic script를 유지하고 `DOMContentLoaded`에서 `init`합니다. 데이터 쿼리용
   `sbClient` 전역은 `init` 직후 `getClient()`로 채웁니다.
6. 순수 helper(`authHeaders`, `loggedInFlag`)와 **주입 가능한 client·storage**로 테스트합니다.

## 근거

- **module script는 deferred**라 페이지의 classic inline script보다 나중에 실행됩니다.
  그래서 `window.session`은 파싱 시점에 존재하지 않고, `DOMContentLoaded`가 안전한 시작점입니다.
  module을 import하려면 페이지 스크립트를 전부 module로 바꿔야 하는데, index는 inline `onclick`과
  전역 함수(`isAuthed`·`sbClient`·`pendingLink`)에 의존해 호환 작업이 커집니다.
- **토큰은 `onAuthStateChange`의 TOKEN_REFRESHED로 갱신됩니다.** 스냅샷 대신 getter를 쓰면
  네 페이지가 자동으로 최신 토큰을 얻습니다.
- **플래그는 게임 3종과의 유일한 계약**입니다. 쓰는 곳이 하나여야 세션과 플래그가 갈라지지 않습니다.
- **401 UI는 페이지별 문맥이 다릅니다.** 공통화하면 chat의 이력 롤백 같은 동작을 module이 알게 되어
  interface가 넓어집니다.

## 결과

- 페이지는 세션을 소유하지 않고, 토큰 갱신이 네 페이지에 한 번에 적용됩니다.
- 초기화 시 세션이 없으면 오래된 `localStorage.loggedIn`을 지웁니다 (drift 해소).
- index의 데이터 쿼리는 여전히 `sbClient` 전역을 씁니다 — `init` 이후에만 유효합니다.
- 401 처리 UI는 페이지별로 남습니다.
- 테스트는 실제 네트워크 없이 가짜 client·storage로 돕니다:
  초기화 → 로그인 → 토큰 갱신 → `authedFetch` 헤더 → 로그아웃.
