# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

- Always use polite/formal Korean (존댓말, 하십시오체) when responding to the user.
- Never use 반말 (informal speech). This rule persists across all sessions and context resets.
- **사용자를 부를 때는 "동완님"을 씁니다.** "선생님" 등 다른 호칭은 어색해하십니다 (2026-09-21 요청).

## Project Overview

Korean-language personal start page (시작 페이지) with weather and todo lists. Single HTML file (`index.html`) with inline CSS and vanilla JS. Deployed on Vercel; login is Supabase email/password auth.

바로가기 '앨범' 항목으로 **모먼트(사진 게시판)** 를 같은 사이트의 `/album` 경로에서 엽니다 (`moment/` 소스 + `album/` 빌드 산출물).

바로가기 드롭다운의 '앨범' **바로 아래 '게시판'** 항목으로 **velog 스타일 게시판**을 같은 사이트의 `/board` 경로에서 엽니다 (`board-src/` 소스 + `board/` 빌드 산출물). 사진 피드(`posts`)와 데이터가 분리된 별도 앱입니다.

바로가기 '게임 → TETRIS' 항목으로 **테트리스** 를 같은 사이트의 `/tetris` 경로에서 엽니다 (`tetris-src/` 소스 + `tetris/` 빌드 산출물). Streamlit 판(`tetris_streamlit.py`)을 Next.js 로 옮긴 것입니다.

바로가기 '게임 → ARKANOID' 항목으로 **알카노이드** 를 같은 사이트의 `/arkanoid` 경로에서 엽니다 (`arkanoid-src/` 소스 + `arkanoid/` 빌드 산출물).

바로가기 '게임 → MINESWEEPER' 항목으로 **지뢰찾기** 를 같은 사이트의 `/minesweeper` 경로에서 엽니다 (`minesweeper-src/` 소스 + `minesweeper/` 빌드 산출물).

바로가기 '게임 → SUDOKU' 항목으로 **스도쿠** 를 같은 사이트의 `/sudoku` 경로에서 엽니다 (`sudoku/` 정적 UI + `sudoku/core.mjs` 순수 로직). 빌드·서버·인증이 없습니다.

바로가기 '게임 → LODE RUNNER' 항목으로 **로드 러너(C64 판 재현)** 를 같은 사이트의 `/lode-runner` 경로에서 엽니다 (`lode-runner/` 정적 UI + `lode-runner/core.mjs` 순수 로직 + `levels/levels.json`). 빌드·서버·인증이 없습니다.

바로가기 '챗봇' 항목으로 **미키 챗봇** 을 같은 사이트의 `/chat` 경로에서 엽니다 (`api/chat.js` 서버 함수 + `chat/` 정적 UI). Streamlit 판(`chatbot_app.py`)을 Vercel 로 옮긴 것입니다.

바로가기 'OCR' 항목으로 **이미지·PDF 텍스트 추출**을 같은 사이트의 `/ocr` 경로에서 엽니다 (`api/ocr.js` 서버 함수 + `ocr/` 정적 UI). Streamlit 판(`ocr_app.py`)을 Vercel 로 옮긴 것입니다.

바로가기 '학습 → 영단어' 항목으로 **VOCA(영단어 학습)** 를 같은 사이트의 `/voca` 경로에서 엽니다 (`api/voca.js` 서버 함수 + `voca/index.html` 정적 UI). Streamlit 판(`voca/app.py`)을 Vercel 로 옮긴 것입니다.

## 앱별 상세 문서

앱 10종의 상세(설계 요점 · 이전 이력 · 함정 · 환경변수 · 파일 구조)는 `.claude/rules/apps/<앱>.md` 에
있습니다. `paths` frontmatter 로 범위가 지정되어 있어 **그 앱의 파일을 열 때만** 로드됩니다(항상
로드되는 것은 각 앱의 요약 카드입니다). 해당 앱을 수정하기 전에 rules 파일을 먼저 읽으십시오.

## Deployment

- Hosted on Vercel (project `homepage`, team `dwkim`) — static file deploy, no build step
  - 단, `api/` 디렉터리는 예외로 **Vercel Functions 로 함께 빌드**됩니다 (2026-09-21 `/chat` 이전 때 확인). `api/chat.js` → `/api/chat`
- `vercel.json` sets `outputDirectory: "."` so `index.html` (및 repo 루트의 정적 파일)이 그대로 서빙됨
- `vercel.json`의 `rewrites`가 `/album`·`/album/*`을 `/album/index`로 보내 SPA 딥링크 새로고침을 처리
  - ⚠️ **destination에 `.html`을 쓰면 동작하지 않습니다.** `cleanUrls: true`가 확장자를 제거하므로 `/album/index.html`은 매칭되지 않고 404가 됩니다 (2026-09-12 첫 배포에서 실제 발생 → `/album/index`로 수정)
  - `/board`·`/board/*`도 같은 규칙으로 `/board/index`로 보냅니다
  - `/tetris`·`/tetris/*`도 같은 규칙으로 `/tetris/index`로 보냅니다
  - `/arkanoid`·`/arkanoid/*`도 같습니다
  - `/minesweeper`·`/minesweeper/*`도 같습니다
  - `/chat`·`/chat/*`도 같습니다
  - `/ocr`·`/ocr/*`도 같습니다
  - `/voca`·`/voca/*`도 같습니다
  - `/sudoku`·`/sudoku/*`도 같습니다
  - `/lode-runner`·`/lode-runner/*`도 같습니다
  - `rewrites`는 파일시스템 조회 **이후**에 적용되므로 `/tetris/_next/...` 같은 실제 자산은 가로채이지 않습니다
    - 이 성질 때문에 **없는 경로도 200 이 나옵니다** — `/voca/app.py` 는 404 가 아니라 `/voca/index` 로 폴백한 HTML(200)입니다. 배포에 실렸는지 확인할 때 상태 코드만 보면 오판합니다. 본문·`content-length` 를 확실히 없는 경로와 대조하십시오 (2026-09-23 실제로 오판할 뻔했습니다)
    - `/album/`(슬래시)은 `/album` 으로 **308 리다이렉트**됩니다 (`cleanUrls`). `curl` 은 기본적으로 리다이렉트를 따라가지 않으므로 **`-L` 없이 확인하면 빈 응답을 검사하고 "미반영"으로 오판**합니다 (2026-10-11 실제로 오판했습니다)
  - ⚠️ **SPA 는 열어둔 탭이 옛 번들을 계속 돌립니다** — SPA 내부 이동은 문서를 다시 받지 않으므로, 배포해도 `/album`·`/tetris`·`/arkanoid`·`/minesweeper` 탭은 **새로고침 전까지 이전 JS 를 실행**합니다. 서버에서 `/album` 을 새로 받아보는 "배포 확인"은 **열어둔 탭과 무관**합니다 — 화면과 배포본이 다르면 새로고침이 먼저입니다 (`cache-control: public, max-age=0, must-revalidate` 이므로 **새로고침 한 번이면 충분**하고 강제 새로고침은 불필요합니다)
    - 2026-10-11 실제 발생 — 배포 4분 뒤 안드로이드 폰에서 올린 HEIC 가 변환되지 않고 `.heic` 로 저장됐고(옛 번들), 2분 뒤 **같은 폰**에서 올린 건 정상 변환됐습니다. 저장된 확장자가 곧 실행 중이던 코드의 증거입니다
- `.vercelignore`가 `moment/`·`tetris-src/`·`arkanoid-src/`·`minesweeper-src/`를 제외 — 서빙되는 것은 빌드 산출물 `album/`·`tetris/`·`arkanoid/`·`minesweeper/`뿐
  - `minesweeper-src/` 는 2026-10-08 에 뒤늦게 추가했습니다 — 빠져 있는 동안 소스가 `/minesweeper-src/...` 로 그대로 서빙되었습니다. **새 Next.js 소스 폴더를 만들면 이 목록에 반드시 넣으십시오**
  - ⚠️ `.vercelignore`는 gitignore 문법이라 패턴이 **하위 모든 깊이에 적용**됩니다. `*.py`가 그 예로, 파이썬으로 서버 함수를 쓰면 `api/foo.py`가 조용히 업로드에서 빠집니다
  - `voca/` 는 제외 목록에 없지만 `*.py`·`.streamlit/`·`.venv/`·`requirements.txt` 가 각각 걸려 **`voca/index.html` 만** 배포됩니다
- Production URL: https://homepage-dwkim.vercel.app (앨범: `/album`, 게시판: `/board`, 테트리스: `/tetris`, 알카노이드: `/arkanoid`, 지뢰찾기: `/minesweeper`, 챗봇: `/chat`, OCR: `/ocr`, 영단어: `/voca`, 스도쿠: `/sudoku`, 로드 러너: `/lode-runner`)

## Data Pipeline (레거시 — 현재 프론트에서 미사용)

`fetch.py`(표준 라이브러리만 사용) → `data.json` 파이프라인은 **보관용**입니다. `index.html` 이
`data.json` 을 소비하지 않고, `data.json` 도 커밋하지 않습니다. 상세: `docs/archive/data-pipeline.md`.

## Frontend Architecture

- **Single file**: `index.html` (~1270 lines)
- **No framework, no build step** — pure HTML/CSS/JS
- **One external JS dependency** — Supabase loaded from CDN (`@supabase/supabase-js@2`) for auth only
- Light theme (CSS custom properties for consistent tokens) — warm ivory (Cursor 스타일, `DESIGN.md` 참조)
- Responsive: 메인+사이드바 2열 → 1열 (768px breakpoint)
- **형제 페이지**: `chat/index.html` (`/chat` 챗봇) — 같은 방식(순수 HTML/CSS/JS, CDN supabase-js, `DESIGN.md` 토큰). 빌드 도구를 쓰지 않으며 홈페이지와 Supabase 세션을 공유합니다
- **상단 배너**: 모바일에서 **고정하지 않고 흐릅니다** (2026-10-18 결정). base 규칙이 media 블록보다
  먼저 오도록 정리했고, `.wrap`의 모바일 여백은 현재 화면 기준으로 유지합니다
  (`docs/adr/0004-mobile-banner.md`)

### 공유 SiteNav module (`shared/`)

서브 페이지 8곳(`chat`·`ocr`·`voca`·`sudoku`·`lode-runner` + 테트리스·알카노이드·지뢰찾기)의 상단 내비게이션은
`shared/sitenav.mjs` + `shared/sitenav.css` **한 벌**입니다. 홈 `index.html`의 `.nav`는
드롭다운 메뉴·포커스 모드·로그인 모달을 가진 별도 변형이라 의도적으로 제외했습니다
(`docs/adr/0001-sitenav-scope-and-delivery.md`, `GLOSSARY.md`).

- **왼쪽 햄버거는 바로가기 메뉴를 엽니다** (2026-11-09 변경 — 그전에는 홈으로 이동). 항목은
  `SITE_MENU` 상수에 있고 홈 드롭다운과 같은 구성(날씨·할 일·앱 8종)입니다. 날씨·할 일은
  `/#weather-card`·`/#todo-card` 로 이동해 홈의 해당 카드로 스크롤합니다. 메뉴가 열리면 햄버거가
  X 로 바뀌고, 바깥 클릭·Escape·항목 클릭으로 닫힙니다. 메뉴 맨 위가 **홈(`/`)** 이고,
  그 아래 날씨·할 일·앱 8종이 이어집니다
- **문 아이콘은 누르면 문짝이 열립니다** (2026-11-09) — 문짝(`<g class="door-leaf">`)이 힌지(x=3)를 축으로
  `scaleX(0.5)` 로 0.2s 동안 좁아진 뒤, 그때 실제 동작(서브 앱은 뒤로 가기/홈, 게시판·앨범은 앱 닫기)이
  실행됩니다. JS 의 `setTimeout(…, 200)` 과 CSS 의 `transition: transform 0.2s` 를 맞춰야 합니다.
  `rotate` 로 돌리면 원근으로 그린 문짝이 틀 밖으로 나가 어색하므로 `scaleX` 를 씁니다.
  홈 `.nav` 의 문은 포커스 모드 토글이라 열린 문이 곧바로 닫힌 문으로 바뀌어 애니메이션이 잘리므로 넣지 않았습니다
- **홈 `.nav` 와 좌표가 같아야 합니다** (2026-11-09 정렬). 좁은 화면에서 홈은 여백이 14px 인데
  서브 앱이 22px 이라 **아이콘이 8px 오른쪽으로 밀려 보였습니다**. 1px 아래 선은 `border` 가 아니라
  `box-shadow: inset 0 -1px 0` 입니다 — `border` 는 border-box 에서 내용 높이를 1px 줄여
  아이콘을 0.5px 위로 띄웁니다. 현재 두 내비의 `brand`·`triple-line` 좌표는 (14, 18)·(18, 20.5) 로 같습니다
- **열린 X 는 애니메이션 뒤에 `<svg class="triple-x">` 한 장으로 갈아 끼웁니다** (2026-11-09). 막대 3개는
  그대로 `rotate(±45deg)` 로 변하며 X 가 되고(0.3s), **0.2s 지점에서 막대가 사라지고 SVG X 가 나타납니다**.
  막대 두 개를 회전해 겹친 최종 상태는 엔진에 따라 교차점에 **밝은 이음매가 점처럼** 보입니다 — cmux 내장
  브라우저에서 실제 발생했고 Chrome 에서는 재현되지 않았습니다. `path` 하나
  (`M1.5 2 L16.5 17 M16.5 2 L1.5 17`)는 알파 마스크를 한 번만 만들어 그 이음매가 없습니다.
  **교체 순간 위치가 튀지 않도록 SVG 의 크기·중심을 막대 X 와 픽셀 단위로 맞춰야 합니다** — 데스크톱 18px
  (경로 y 를 0.5 내려 중심을 맞춤), 모바일 14px. 실측 기준 bbox·잉크 중심이 같아야 합니다
  (1280px·DPR2: 막대 (57,40)-(90,73) / SVG 동일). 세 곳(`index.html`·`shared/sitenav.css`·`moment/src/index.css`)이
  같은 방식·같은 좌표를 써야 X 모양이 일치합니다
- **인증 게이트는 메뉴에 없습니다** — 챗봇·학습·OCR 은 대상 페이지가 각자 로그인 게이트를
  그립니다 (홈은 로그인 모달을 열기 위해 `data-auth` 로 막습니다)
- ⚠️ `applyLoggedIn` 이 `root.innerHTML` 을 다시 그리므로 **바인딩에서 노드를 잡아 두면 안 됩니다.**
  `setLoggedIn` 뒤에는 잡아 둔 참조가 떨어진 노드라 메뉴가 조용히 죽습니다 (2026-11-09 실제 발생).
  `bindNav` 는 핸들러마다 `root.querySelector` 로 다시 조회합니다

- 정적 페이지: `<div data-site-nav data-logged-in="false"></div>` + `/shared/sitenav.mjs` module script.
  로그인 성공 시 `window.siteNav.setLoggedIn(true)` 한 줄로 아이콘 상태를 갱신합니다
- Next.js: `components/SiteNav.jsx`가 얇은 adapter입니다. 마크업은 module이 소유하고,
  localStorage 읽기는 adapter가 맡습니다
- **Next 세 프로젝트가 `shared/`를 직접 import 하지 않습니다** — `turbopack.root`를 각 프로젝트로 고정해 두었기 때문입니다.
  `predev`·`prebuild`가 `scripts/sync-shared.mjs`로 `shared/`를 각 프로젝트의 `shared/`에 복사합니다.
  **복사본은 gitignore 대상이므로 원본은 항상 `shared/`입니다**
- **앨범(`moment/`)은 이 module 을 쓰지 않습니다** — 자체 `components/SiteNav.jsx` 가 같은 메뉴를
  `MENU` 상수로 **복사**해 갖고 있습니다. 한쪽을 고치면 다른 쪽도 보십시오
- 테스트: `node --test shared/sitenav.test.mjs` (view-model·메뉴 목록 5개)

### 세션 module (`shared/session.mjs`)

네 페이지(`index`·`chat`·`ocr`·`voca`)의 Supabase 부트스트랩·세션 상태·토큰 주입·로그인 플래그는
`shared/session.mjs` **한 곳**이 소유합니다 (`docs/adr/0002-session-module.md`, `GLOSSARY.md`).

- 페이지 스크립트는 classic inline script 이고 module 은 deferred 입니다 → 각 페이지는
  `DOMContentLoaded` 에서 `window.session.init({ url, key })` 를 호출합니다
- API 호출은 `window.session.authedFetch(url, init)` 을 씁니다. **매 요청마다 최신 토큰**을
  헤더에 넣으므로 `access_token` 을 변수에 스냅샷하지 마십시오 (서브 페이지가 이렇게 했다가
  토큰 갱신 후 401 로 떨어졌습니다)
- `localStorage.loggedIn` 플래그는 **module 단독 소유**입니다. index 의 로그인/로그아웃도 직접 쓰지 않고,
  게임 3종 SiteNav 는 지금처럼 읽기만 합니다
- `onChange(cb)` 로 세션 변화를 구독합니다. **401 UI 는 페이지가 그대로 맡습니다** (chat 롤백·ocr 상태 표시·voca 게이트)
- 로그인 게이트는 `index.html` 의 `data-auth` 선언과 `session.getSession()` 으로 판정합니다. `/album` 은 자체 로그인 화면이 있어 게이트하지 않습니다
- index 의 데이터 쿼리는 `sbClient` 전역을 계속 씁니다 — `init` 직후 `session.getClient()`로 채웁니다
- 테스트: `node --test shared/session.test.mjs` (토큰 갱신·`authedFetch` 헤더 회귀 포함)

### 게임 오디오 module (`shared/game-audio.mjs`)

테트리스·알카노이드의 효과음 재생은 `shared/game-audio.mjs` **한 벌**입니다
(`docs/adr/0007-game-audio.md`).

- `useGameAudio({ sounds, themeFile })` — 보이스 4개 풀, `play`, `unlock`, 테마곡 시작·정지·토글
- 순수한 풀 선택·URL 규칙은 `shared/game-audio-core.mjs` 에 있고 `node --test` 로 검증합니다
- 각 프로젝트의 `hooks/useAudio.js` 는 **module 상수 `SFX` 를 넘기는 얇은 adapter** 입니다.
  배열을 render 마다 새로 만들면 effect 가 다시 돌아 Audio 객체가 재생성되므로 module 상수로 둡니다
- 배포: `scripts/sync-shared.mjs` 가 build 전에 tetris·arkanoid 의 `shared/` 로 복사합니다 (gitignore 대상)
- 테스트: `npm test` 의 `shared/game-audio-core.test.mjs`

### Cards

| Card | Data Source | Key Function |
| --- | --- | --- |
| Weather | Open-Meteo API + Air Quality API | `loadWeather()` |
| Personal Todos | `localStorage` | `myTodos` array |
| Family Todos | Supabase `todos` 테이블 (RLS) | `loadFamilyTodos()` |

> 주식/뉴스 카드는 제거됨 (커밋 `1228363` 참조). 관련 코드(`loadStocks`, `loadNews`, `STOCKS` 배열)도 삭제됨.

## Weather

- Open-Meteo (free, no API key): 7-day forecast + air quality
- Location: Seoul (hardcoded lat/lon)
- Weather code → icon/desc mapping in `loadWeather()`

## Auth / Login (Supabase)

Login modal authenticates via Supabase Auth (email/password):

- **Fixed email**: `dwkim1492@gmail.com` (hardcoded in `index.html`)
- Supabase JS loaded from CDN (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`)
- Supabase URL + publishable key hardcoded inline near the bottom of `index.html` (`SUPABASE_URL` / `SUPABASE_KEY`); publishable key is safe to expose client-side
- Login: `session.signIn(email, password)` → `onAuthStateChange` → `session.onChange`가 `applyAuthState(session)` 실행. `isAuthed`·아이콘 표시는 index가, `localStorage.loggedIn` 플래그는 세션 module이 씁니다. 새 탭은 챗봇 메뉴 경유 로그인(`pendingLink`)일 때만 열림
- Logout: `session.signOut()` → `applyAuthState(null)`이 `isAuthed`·아이콘을 해제하고, module이 플래그를 지웁니다

Note: 루트 `package.json`은 이제 **의존성이 없습니다**. `@supabase/supabase-js`·`@supabase/ssr`은 루트에서 import 하는 곳이 한 곳도 없어 제거했습니다 (2026-09-16) — 홈페이지는 CDN을 쓰고, 앨범·테트리스는 각자 자체 의존성을 가집니다. `.env.local`(`NEXT_PUBLIC_*`)은 여전히 미사용이며 보관 중입니다.

## Todo Lists

- **Personal**: Stored in `localStorage` key `myTodos` — works offline
- **Family**: Supabase `public.todos` 테이블 (uuid pk, text, done, created_at). 로그인(`isAuthed`) 후 `sbClient.from('todos')` CRUD로 직접 읽기/쓰기. RLS: 로그인한 사용자(`authenticated`)만 모든 행 조회/추가/수정/삭제 가능. `loadFamilyTodos()` / `addTodo()` / `toggleTodo()` / `deleteTodo()` / `clearDone()`.
  - **이전(구버전)**: Google Apps Script(`family-todos.gs`) + Google 시트 사용 → 2026-08-27 Supabase 테이블로 이전, `SCRIPT_URL`·`currentToken` 제거. `family-todos.gs`는 보관만 하고 미사용.

## 앨범 (모먼트) — `/album`

사진 게시판 — 회원가입 · 글 CRUD · 사진 업로드 · 좋아요/댓글 실시간. 전자책 완성 예제입니다.
소스 `moment/` → **서빙 `album/`** (빌드 산출물 커밋). Supabase 는 홈페이지와 같은 프로젝트라
같은 origin 세션이 자동 공유됩니다.

- 빌드: `cd moment && npm run build` → `album/` 갱신. **커밋하지 않으면 배포본이 소스와 어긋납니다.**
- ⚠️ **아이폰 HEIC 는 올리기 전에 JPEG 로 바꿉니다**(`lib/heic.js`). Chrome·Edge·Firefox 가 HEIC 를
  그리지 못해 `<img>` 가 실패하고 alt 텍스트만 남습니다. 변환에 실패하면 원본을 올리지 않습니다.
- 상세(변환 성능 1.7초, dev/prod export 형태 차이, 업로드 경로별 HEIC/JPEG 차이): `.claude/rules/apps/album.md`

## 게시판 — `/board`

velog 스타일 글 게시판. 앨범과 **별도 앱**이고 데이터도 분리(`board_posts`)되어 있습니다.
소스 `board-src/` → **서빙 `board/`** (빌드 산출물 커밋).

- 빌드: `cd board-src && npm test && npm run build` → `board/` 갱신.
- ⚠️ 본문 개행은 `remark-breaks` 가 담당합니다 — 빼면 한 번 누른 엔터가 `<br>` 이 되지 않습니다.
- ⚠️ 상단 내비는 `shared/` 가 아니라 **복사본**입니다. 메뉴를 고치면 `shared/`·`moment/`·`board-src/` 세 곳을 함께 보십시오.
- 상세(에디터·이미지 업로드·문 아이콘 동작·라우트): `.claude/rules/apps/board.md`

## 테트리스 — `/tetris`

Streamlit 판(`tetris_streamlit.py`, 보관용)을 Next.js 정적 export 로 옮긴 클라이언트 사이드 게임입니다.
소스 `tetris-src/` → **서빙 `tetris/`** (빌드 산출물 커밋). 인증·백엔드 없음.

- `basePath: '/tetris'` 와 서빙 폴더명이 **반드시 일치**해야 자산이 404 나지 않습니다.
- 빌드: `cd tetris-src && npm test && npm run build` → `tetris/` 갱신.
- ⚠️ 대표 함정 4개 — SSR(`document`·`Audio`·`rAF`), React passive 터치 리스너, `basePath` 가 안 붙는 문자열 URL, StrictMode 이중 마운트.
- 상세(설계 요점·구조·함정 전체): `.claude/rules/apps/tetris.md`

## 알카노이드 — `/arkanoid`

`arkanoid_streamlit.py`(보관용)를 Next.js 정적 export 로 옮겼습니다. **원본은 파이썬 게임이 아니라
HTML 문자열을 띄우는 호스트**였으므로, 실제로는 JS → React 포팅입니다.
소스 `arkanoid-src/` → **서빙 `arkanoid/`** (빌드 산출물 커밋).

- 빌드: `cd arkanoid-src && npm test && npm run build` → `arkanoid/` 갱신 (테스트 47개).
- ⚠️ DPR 환산은 `canvas.width` 가 아니라 논리 상수 `W` 를 씁니다. 스크롤 차단의 핵심은 `preventDefault()` 가 아니라 `touch-action: none` 이고, `ctx.roundRect` 는 대체 구현을 씁니다.
- 상세(테트리스와 다른 설계, 고친 결함 2가지, 파일 구조, 함정 전체): `.claude/rules/apps/arkanoid.md`

## 지뢰찾기 — `/minesweeper`

윈도우 95 스킨 지뢰찾기. 순수 클라이언트 사이드로 백엔드·인증이 없습니다.
소스 `minesweeper-src/` → **서빙 `minesweeper/`** (빌드 산출물 커밋).

- 빌드: `cd minesweeper-src && npm test && npm run build` → `minesweeper/` 갱신 (테스트 17개).
- ⚠️ `.vercelignore` 에 `minesweeper-src/` 를 빠뜨리면 **소스가 그대로 서빙**됩니다 (2026-10-08 실제 발생).
- 상세(설계 요점·터치 길게 누르기·최고기록·파일 구조): `.claude/rules/apps/minesweeper.md`

## 스도쿠 — `/sudoku`

클래식 스도쿠. **소스 = 서빙**(`sudoku/index.html` + `sudoku/core.mjs`)이라 빌드·서버·인증이 없습니다.

- 테스트: `node --test sudoku/core.test.mjs` (10개). 루트 `npm test` 에도 포함됩니다.
- `core.mjs` 는 DOM·브라우저 API 를 import 하지 않습니다 — 게임 3종의 `game/*.js` 와 같은 원칙입니다.
- 상세(sudoku.com 분석에서 가져온 것/아닌 것, 생성·유일해, 저장 키, 설계 요점): `.claude/rules/apps/sudoku.md`

## 로드 러너 — `/lode-runner`

C64 판 Lode Runner 를 재현한 게임. **소스 = 서빙**(`lode-runner/index.html` + `lode-runner/core.mjs` +
`lode-runner/levels/levels.json`)이라 빌드·서버·인증이 없습니다. 17개 레벨은 ClassicReload 의
C64 에뮬레이터 RAM(`$6000`)에서 추출한 원판 보드입니다.

- 테스트: `node --test lode-runner/core.test.mjs` (11개). 루트 `npm test` 에도 포함됩니다.
- `core.mjs` 는 DOM·브라우저 API 를 import 하지 않습니다 — `sudoku/core.mjs` 와 같은 원칙입니다.
- ⚠️ 자산 참조는 **절대 경로**(`/lode-runner/...`)입니다 — `/lode-runner`(슬래시 없음)로 열렸을 때 상대 경로가 루트로 풀립니다.
- 상세(레벨 추출 경로, 구멍 위 통과 규칙, 속도 상수, 키 매핑): `.claude/rules/apps/lode-runner.md`

## 챗봇 (미키) — `/chat`

Streamlit 판(`chatbot_app.py`, 보관용)을 Vercel 로 옮겼습니다. 서버 `api/chat.js`, UI `chat/index.html`
(빌드 도구 없음 → 재빌드 불필요).

- 인증: 같은 origin 의 Supabase 토큰을 `GET /auth/v1/user` 로 검증하고, 실패하면 **Anthropic 을 호출하지 않고** 401 을 돌려줍니다.
- ⚠️ **실제 제공자는 DeepSeek** 입니다(`ANTHROPIC_BASE_URL`). 모델명은 자동 매핑되므로 Anthropic 카탈로그를 기준으로 "낡았다"고 판단하면 안 됩니다. `web_search_20250305` 도 실제로 실행됩니다.
- 환경변수: `ANTHROPIC_API_KEY`(필수) · `ANTHROPIC_BASE_URL`(선택) · `ANTHROPIC_MODEL`(선택)
- 상세(SSE 정규화, 첫 메시지 규칙, SOUL.md 인라인, 함정): `.claude/rules/apps/chat.md`

## OCR — `/ocr`

Streamlit 판(`ocr_app.py`, 보관용)을 Vercel 로 옮겼습니다. 서버 `api/ocr.js`, UI `ocr/index.html`.
CLOVA OCR 은 **과금 API** 라 Supabase 토큰 검증이 곧 비용 방어선입니다.

- 이미지·PDF 원본 바이트를 보내고, 이미지는 브라우저에서 긴 변 2000px 로 줄입니다 (PDF 는 최대 10페이지).
- 번역은 **비공식 구글 엔드포인트**라 언제든 깨질 수 있습니다 (1200자 단위 분할).
- 환경변수: `OCR_INVOKE_URL`(필수) · `OCR_SECRET_KEY`(필수 — 브라우저에 노출 금지)
- 상세(인터페이스, 원본에서 바꾼 것 3가지, 줄 묶기·언어 판정, 함정): `.claude/rules/apps/ocr.md`

## VOCA (영단어) — `/voca`

Streamlit 판(`voca/*.py`, 보관용)을 Vercel 로 옮겼습니다. 서버 `api/voca.js`, UI `voca/index.html`.
**다른 앱과 달리 "쓰기" 앱** — 동완님의 실제 구글 시트를 수정·삭제합니다.

- 인증: Supabase 토큰 + **이메일 허용목록**(`VOCA_ALLOWED_EMAILS`, 비면 전부 거부) + **시트 ID 허용목록**(`VOCA_SHEET_IDS`).
- 환경변수: `VOCA_SA_B64`(필수, base64 한 줄) · `VOCA_SHEET_IDS` · `VOCA_ALLOWED_EMAILS` · `ANTHROPIC_API_KEY`(재사용)
- ⚠️ `.vercelignore` 의 `*.py` 때문에 파이썬 함수는 조용히 배포에서 빠집니다 — 그래서 JS 로 썼습니다.
- 상세(인터페이스, ops 적용 순서, 원본에서 바꾼 것, 보관용 Streamlit 실행법): `.claude/rules/apps/voca.md`

## 서버 공유 seam — `server/`

세 함수(`api/chat.js`·`api/ocr.js`·`api/voca.js`)의 공통 관심사는 `server/`에 있습니다
(`docs/adr/0005-server-seam.md`, `GLOSSARY.md`).

| module | 역할 |
| --- | --- |
| `server/auth.mjs` | `requireUser`(401/502 구분) · `requireAllowedUser`(이메일 허용목록, fail-closed) · `bearerToken` · `parseAllowlist` |
| `server/http.mjs` | `json` · `methodNotAllowed` · `errorJson` · `HttpError` |
| `server/config.mjs` | Supabase 상수 · `anthropicConfig()` |
| `server/chat-core.mjs` | `textFromEvent` (SSE → 텍스트) |
| `server/ocr-core.mjs` | `decodeHeader` · `yRange` · `groupLines` · `extractText` · `pickLanguages` · `chunkText` |
| `server/voca-core.mjs` | `sheetIdFromUrl` · `quoteTitle` · `colLetter` · `cleanRows` · `orderOps` · `normalizeCells` · `normalizeRows` · `descendingRows` |

- 오류 응답은 **JSON `{ error }` 하나**입니다. chat 도 더 이상 평문 오류를 보내지 않습니다
- 인증 실패는 **401(토큰 없음·무효) / 502(Supabase 연결·응답 실패)** 로 구분합니다
- **위험한 휴리스틱·검증은 `*-core.mjs`** 에 있고 네트워크를 모릅니다. handler는 이 module을 호출만 합니다
- ⚠️ **`server/`는 `api/` 밖에 둡니다.** Vercel 문서가 공유 유틸리티를 `api/` 밖에 두고 진입점에서
  import 하라고 안내하며, `api/_lib/` 상대 import가 런타임에 `ERR_MODULE_NOT_FOUND`로 실패한 사례가 있습니다
- 테스트: `npm test` (`shared/*.test.mjs` + `server/*.test.mjs`)

## Browser Automation

### 도구 선택 규칙

| 상황 | 도구 |
| --- | --- |
| **기본** — 화면 확인 / 스크린샷 / 렌더링 체크 / 페이지 조작 / 콘솔·네트워크 디버깅 | `agent-browser` |
| **이미 로그인된 실제 브라우저**(동완님 Chrome/Edge 프로필)가 필요할 때 | `ego lite` (`ego-browser`) |
| CI에 넣을 재현 가능한 자동화 스크립트 | Playwright MCP |
| 애매함 | `agent-browser` 먼저 → 로그인·세션 때문이면 `ego lite` → 그래도 복잡하면 Playwright |

> 두 도구의 스킬 설명이 각각 "자기를 기본으로 쓰라"고 선언합니다. **위 우선순위가 스킬 설명보다 우선합니다.**

### agent-browser

플러그인 `agent-browser@agent-browser`로 설치됩니다. Chrome/Chromium을 CDP로 직접 제어하며, 접근성 트리 스냅샷의 `@eN` 참조 ID로 요소를 조작합니다.

```sh
agent-browser open <url>          # 페이지 이동
agent-browser snapshot -i         # 상호작용 가능한 요소 목록 ([ref=e1] … 형태로 출력)
agent-browser click @e1           # 출력된 ref를 @e1 처럼 지정해 클릭
agent-browser fill @e2 "텍스트"    # 참조 ID로 입력
agent-browser screenshot <파일>    # 스크린샷 저장
```

- **페이지가 바뀌면 반드시 다시 `snapshot`** 을 떠서 참조 ID를 갱신한 뒤 조작합니다. 이전 스냅샷의 `@eN`은 무효입니다.
- 전체 명령은 `agent-browser --help`, 워크플로·문제 해결은 `agent-browser skills get core`.
- 설치 완료 (2026-10-20 v0.39.1 로 업데이트 / Chrome for Testing 153) — 다른 머신에서는 `npm i -g agent-browser && agent-browser install`이 필요합니다.
  플러그인 설치(`/plugin install`)만으로는 바이너리가 내려오지 않아 `No binary found for darwin-arm64` 오류가 납니다.

### ego lite (`ego-browser`)

`ego lite` 앱이 `~/.local/bin/ego-browser` CLI를 제공합니다. **이미 로그인된 동완님 브라우저 프로필을 그대로 쓰는 것이 목적**이므로, 새로 로그인하는 작업에는 쓰지 않습니다.

```sh
ego-browser skill                  # 설치 버전에 맞는 사용 가이드 (먼저 실행)
ego-browser nodejs <<'EOF'
const task = await taskSpace("목표이름");
const page = task.page("p1");
await page.goto("https://example.com");
console.log(await page.snapshot());
await task.finish({ keep: [] });
EOF
```

- **task space는 목표당 하나**를 만들고 이후 라운드에서도 같은 이름/ID로 이어갑니다. 스크립트는 매번 새 Node 프로세스라 변수는 유지되지 않습니다.
- `page.screenshot({ path })`는 **절대경로 파일로 직접 씁니다** (base64 반환 아님). `path`를 생략하면 임시 디렉터리 경로를 돌려줍니다.
- `task.finish({ keep })`의 `keep`은 `"all"` 또는 페이지 라벨 배열만 받습니다 — 전부 닫으려면 `keep: []`.
- 스냅샷은 대화형 요소만 걸러주지 않습니다. 큰 페이지에서는 `snapshot({ scope: "subtree", root: "@n" })`로 범위를 좁히십시오 — 전체 스냅샷이 Bash 출력 한도를 넘으면 잘립니다.
- 스킬에 `allowed-tools` 선언이 없어 `ego-browser nodejs` 실행마다 권한 확인이 뜰 수 있습니다.
- 설치 확인: `ego-browser --version` (2026-10-20 확인 — 0.6.0.16 / Chromium 154.0.8037.44). 스킬은 `~/.agents/skills/ego-browser` → `~/.claude/skills/ego-browser` 심볼릭 링크입니다.

## 작업 흐름 — 로컬 확인을 먼저, 커밋은 그다음

수정을 마치면 **바로 커밋하지 않습니다.** 먼저 로컬에서 띄워 동완님이 화면을 직접 확인할 수 있게
하고, 확인이 끝난 뒤에 커밋·배포합니다 (2026-11-10 요청).

- 커밋 여부를 묻기 전에 **서버를 띄우고 접속 주소를 알려 주십시오.** 확인 전 "커밋할까요?"는 묻지 않습니다
- 빌드 5곳은 각자 dev 서버로 띄웁니다 — `cd board-src && npm run dev` → `http://localhost:5173/board/`
  처럼 `base`/`basePath` 때문에 **주소에 앱 이름이 붙습니다**
- 정적 페이지는 repo 루트에서 정적 서버를 띄워 `/index.html`·`/chat/`·`/ocr/`·`/voca/`·`/sudoku/` 를 엽니다
  (로컬에는 `vercel.json` 의 rewrite 가 없으므로 `/album` 같은 확장자 없는 경로는 쓰지 않습니다)
- `api/*.js` 는 `vercel dev` 로 확인합니다
- ⚠️ 로컬은 배포본과 **오리진이 달라 Supabase 세션이 공유되지 않습니다.** 그 자리에서 한 번 로그인해야
  하고, 로그인 게이트 뒤 화면은 이 로그인이 되어야 보입니다 — 주소를 알려 줄 때 함께 말씀드리십시오

## Compaction

When compacting, always preserve:

- Current task goal
- List of modified files
- Test results and exact errors
- Architecture decisions made
- Next action items

Drop:

- Old exploration paths
- Repeated logs
- Irrelevant debug output

## No Tests / No Lint / No CI Tests

정적 페이지(`index.html`·`chat/`·`ocr/`·`voca/`·`sudoku/`·`lode-runner/`)에는 테스트·linter·빌드가 없습니다. 브라우저에서 바로 확인합니다.

- **빌드 5곳**: `moment/`(Vite) · `board-src/`(Vite) · `tetris-src/`·`arkanoid-src/`·`minesweeper-src/`(Next). 다섯 곳 모두 **산출물을 커밋**하므로 소스를 고치면 해당 앱 카드의 명령으로 재빌드해야 합니다.
- **테스트**: 루트 `npm test`(`shared/*`·`server/*`·`sudoku/*`·`lode-runner/*`), 게임 3종과 `board-src/`·`moment/` 각자 `npm test`.
- `api/*.js` handler 자체는 로컬 `vercel dev` 로 검증합니다.
- **옮긴 로직은 조용히 틀리면 그럴듯한 오답을 냅니다** — 순수한 부분은 `server/*-core.mjs` 에 두고 `server/*-core.test.mjs` 가 영구 검증합니다. 네트워크가 필요한 handler 내부는 `globalThis.fetch` 를 가로채는 일회성 하네스로 확인한 뒤 지웁니다.
- `api/voca.js` 는 **실제 시트를 수정·삭제**하므로 실호출 검증은 테스트 워크시트에서만 하고 반드시 지우십시오.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`esc1492/homepage`), managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
