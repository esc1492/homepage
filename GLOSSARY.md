# GLOSSARY

이 저장소에서 쓰는 도메인 용어입니다. 이슈 제목·리팩터 제안·테스트 이름에서 같은 개념에는 같은 단어를 씁니다.

## SiteNav (사이트 내비게이션)

서브 페이지 상단의 고정 내비게이션.

- 왼쪽: 햄버거 — 홈(`/`)으로 이동
- 오른쪽: 문 — 뒤로 가기(기록이 없으면 홈으로), 사용자 아이콘 — 로그인 상태 표시

**홈 페이지(`index.html`)의 `.nav`는 SiteNav가 아닙니다.** 드롭다운 메뉴·포커스 모드·로그인 모달을 가진
별도 변형이며, 2026-10-18 결정으로 공유 module 범위에서 제외했습니다.

## 서브 페이지

SiteNav가 붙는, 홈 이외의 페이지. 정적 페이지 3곳(`chat/`·`ocr/`·`voca/`)과 Next.js 게임 3곳
(`tetris-src/`·`arkanoid-src/`·`minesweeper-src/`).

## 세션 module (Session module)

Supabase 클라이언트 부트스트랩, 현재 세션, 최신 액세스 토큰, `localStorage.loggedIn` 플래그를
소유하는 `shared/session.mjs`. 페이지는 토큰을 변수에 담지 않고 `authedFetch`로 요청합니다.
로그인 상태의 **유일한 쓰기 지점**이며, 게임 3종은 플래그를 읽기만 합니다.

## 로그인 게이트 (Login gate)

인증이 필요한 링크를 클릭했을 때 로그인 모달을 여는 UX 장치. 인증 요구는 링크 마크업의
`data-auth`가 선언하고, 판정은 `window.session.getSession()` 하나만 봅니다.
보안 경계가 아니라 UX이며, 실제 경계는 API 함수의 401/403입니다.

## 서버 공유 seam (Server seam)

`server/` 아래의 `auth.mjs`·`http.mjs`·`config.mjs`. 세 함수가 복사해 쓰던 Supabase 인증,
JSON 오류 응답, provider 설정을 소유합니다. 오류는 JSON `{ error }` 하나이고,
인증 실패는 401(토큰 없음·무효)과 502(인증 서버 장애)로 구분합니다.
