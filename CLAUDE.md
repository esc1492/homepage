# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

- Always use polite/formal Korean (존댓말, 하십시오체) when responding to the user.
- Never use 반말 (informal speech). This rule persists across all sessions and context resets.

## Project Overview

Korean-language personal start page (시작 페이지) with weather and todo lists. Single HTML file (`index.html`) with inline CSS and vanilla JS. Deployed on Vercel; login is Supabase email/password auth.

바로가기 '앨범' 항목으로 **모먼트(사진 게시판)** 를 같은 사이트의 `/album` 경로에서 엽니다 (`moment/` 소스 + `album/` 빌드 산출물).

바로가기 '게임 → TETRIS' 항목으로 **테트리스** 를 같은 사이트의 `/tetris` 경로에서 엽니다 (`tetris-src/` 소스 + `tetris/` 빌드 산출물). Streamlit 판(`tetris_streamlit.py`)을 Next.js 로 옮긴 것입니다.

## Deployment

- Hosted on Vercel (project `homepage`, team `dwkim`) — static file deploy, no build step
- `vercel.json` sets `outputDirectory: "."` so `index.html` (및 repo 루트의 정적 파일)이 그대로 서빙됨
- `vercel.json`의 `rewrites`가 `/album`·`/album/*`을 `/album/index`로 보내 SPA 딥링크 새로고침을 처리
  - ⚠️ **destination에 `.html`을 쓰면 동작하지 않습니다.** `cleanUrls: true`가 확장자를 제거하므로 `/album/index.html`은 매칭되지 않고 404가 됩니다 (2026-09-12 첫 배포에서 실제 발생 → `/album/index`로 수정)
  - `/tetris`·`/tetris/*`도 같은 규칙으로 `/tetris/index`로 보냅니다
  - `rewrites`는 파일시스템 조회 **이후**에 적용되므로 `/tetris/_next/...` 같은 실제 자산은 가로채이지 않습니다
- `.vercelignore`가 `moment/`·`tetris-src/`를 제외 — 서빙되는 것은 빌드 산출물 `album/`·`tetris/`뿐
- Production URL: https://homepage-dwkim.vercel.app (앨범: `/album`, 테트리스: `/tetris`)

## Data Pipeline (레거시 — 현재 프론트에서 미사용)

```text
fetch.py (Python 3, no deps) → data.json
```

> **⚠️ 주의**: 주식/뉴스 카드가 제거되면서 `index.html`은 더 이상 `data.json`을 소비하지 않습니다 (2026-08-27 기준). `fetch.py`·`data.json`은 보관/재개발용입니다.

- `fetch.py` uses only `urllib`, `json`, `re`, `html` from stdlib — no pip install needed
- Run: `python3 fetch.py` (updates data.json with stocks + RSS news)
- Stocks come from Naver Finance API: `https://m.stock.naver.com/api/stock/{ticker}/basic`
- News comes from Hankyung RSS: `https://www.hankyung.com/feed/{category}`
  - Categories: `economy`, `international`, `it`, `society`
- (구버전) GitHub Actions(`.github/workflows/update-stocks.yml`) 10분 주기 자동 갱신 — **워크플로 제거됨**

## Frontend Architecture

- **Single file**: `index.html` (~1270 lines)
- **No framework, no build step** — pure HTML/CSS/JS
- **One external JS dependency** — Supabase loaded from CDN (`@supabase/supabase-js@2`) for auth only
- Light theme (CSS custom properties for consistent tokens) — warm ivory (Cursor 스타일, `DESIGN.md` 참조)
- Responsive: 메인+사이드바 2열 → 1열 (768px breakpoint)

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
- Login: `signInWithPassword({ email, password })` → `onAuthStateChange`/`getSession`가 `applyAuthState(session)` 실행 → `isAuthed` + `localStorage.loggedIn` 설정. 새 탭은 챗봇 메뉴 경유 로그인(`pendingLink`)일 때만 열림
- Logout: `signOut()` + `applyAuthState(null)`가 `isAuthed`/`localStorage.loggedIn` 해제

Note: `package.json` Supabase deps (`@supabase/supabase-js`, `@supabase/ssr`) and `.env.local` (`NEXT_PUBLIC_*`) are currently unused by the static site (CDN + inline config) — reserved for a planned Next.js migration.

## Todo Lists

- **Personal**: Stored in `localStorage` key `myTodos` — works offline
- **Family**: Supabase `public.todos` 테이블 (uuid pk, text, done, created_at). 로그인(`isAuthed`) 후 `sbClient.from('todos')` CRUD로 직접 읽기/쓰기. RLS: 로그인한 사용자(`authenticated`)만 모든 행 조회/추가/수정/삭제 가능. `loadFamilyTodos()` / `addTodo()` / `toggleTodo()` / `deleteTodo()` / `clearDone()`.
  - **이전(구버전)**: Google Apps Script(`family-todos.gs`) + Google 시트 사용 → 2026-08-27 Supabase 테이블로 이전, `SCRIPT_URL`·`currentToken` 제거. `family-todos.gs`는 보관만 하고 미사용.

## 앨범 (모먼트) — `/album`

전자책 『비전공자도 끝까지 만드는 첫 풀스택 웹 서비스』의 완성 예제. 사진 게시판(회원가입 · 글 CRUD · 사진 업로드 · 좋아요/댓글 실시간).

- **소스**: `moment/` (Vite + React 19 + react-router 7 + @supabase/supabase-js v2)
- **서빙**: `album/` — 빌드 산출물. Vercel은 빌드하지 않으므로 **이 폴더가 실제 배포본**
- **경로**: `https://homepage-dwkim.vercel.app/album` (홈페이지 바로가기 '앨범' 타일 → 새 탭)
- **백엔드**: 홈페이지와 **같은 Supabase 프로젝트**(`oggzgullnohqehthewuw`). `posts`·`likes`·`comments` 테이블 + `photos` 버킷(Public). 설정 SQL은 `moment/supabase_setup.sql`
- **로그인**: 같은 origin이라 Supabase 세션이 **자동 공유**됨 — 홈페이지에서 로그인하면 앨범은 재로그인 불필요

### ⚠️ 빌드 산출물을 커밋하므로 소스 수정 시 재빌드 필수

```sh
cd moment && npm run build     # → repo 루트 album/ 갱신 (vite.config.js의 outDir)
```

`moment/vite.config.js`에 `base: "/album/"`, `build.outDir: "../album"`, `emptyOutDir: true`가 설정되어 있습니다.
**`album/`을 커밋하지 않으면 배포본이 소스와 어긋납니다.** Supabase 키를 회전하면 `moment/.env.local` 수정 후 재빌드해야 합니다 (키가 번들에 인라인됨 — Vercel 환경변수 불필요).

## 테트리스 — `/tetris`

Streamlit 앱(`tetris_streamlit.py`)을 Next.js 정적 export 로 옮긴 것입니다.

- **소스**: `tetris-src/` (Next.js 16 + React 19, `output: 'export'`)
- **서빙**: `tetris/` — 빌드 산출물. Vercel은 빌드하지 않으므로 **이 폴더가 실제 배포본**
- **경로**: `https://homepage-dwkim.vercel.app/tetris` (홈페이지 바로가기 '게임 → TETRIS' 타일 → 새 탭)
- **인증·백엔드 없음** — 완전한 클라이언트 사이드 게임

### ⚠️ 소스 폴더명이 `tetris-src` 인 이유

`next.config.mjs`의 `basePath: '/tetris'` 와 **서빙 폴더명이 반드시 일치**해야 합니다.
Next.js는 자산을 `/tetris/_next/...` 로 참조하므로, 산출물이 `tetris/` 가 아니면 전부 404가 됩니다.
소스와 산출물을 같은 폴더에 둘 수 없어(빌드 시 덮어씀) `moment/` → `album/` 과 같은 방식으로 이름을 분리했습니다.

### 구조

| 경로 | 역할 |
| --- | --- |
| `game/constants.js` | 보드 크기·색·테트로미노·속도 공식 |
| `game/reducer.js` | **순수 게임 로직** (React 미import — 그대로 테스트 가능) |
| `game/reducer.test.js` | 게임 로직 단위 테스트 21개 (`node --test`) |
| `game/render.js` | Canvas 그리기 (`(ctx, state)` 순수 함수) + DPR 보정 |
| `hooks/` | `useGameLoop`(rAF) · `useKeyboard` · `useSwipe` · `useAudio` · `useHighScore` |
| `hooks/useHighScore.test.js` | 저장값 파싱 테스트 3개 |
| `components/TetrisGame.jsx` | 오케스트레이터 |

### 설계 요점

- **상태**: `useReducer` 가 단일 진실 공급원. 하강 간격은 `max(80, 800-(level-1)*70)` ms 라 최대 초당 12.5회만 dispatch 됩니다. 60fps는 **그리기에만** 해당하며 rAF 루프가 ref로 명령형 호출합니다(React 렌더 우회).
- **`setInterval` 대신 rAF**: 백그라운드 탭에서 자동 정지, 드리프트 없음. 단 `ts - lastT` 가 커지면 하강이 폭주하므로 `MAX_FRAME_DELTA_MS = 200` 으로 자릅니다.
- **오디오**: 테마곡은 96kbps·2.1MB로 재인코딩해 `public/audio/` 에 두고 `preload="none"` + '시작' 클릭 시 로드. 효과음 4개는 합계 30KB. 효과음은 **소리마다 보이스 4개 풀**을 돌려 연타 시 앞 소리가 잘리지 않게 합니다(`VOICES_PER_SOUND`).
- **최고점수**: `localStorage` 키 `tetrisHighScore` (홈페이지의 `myTodos`·`loggedIn` 과 같은 평면 네이밍). 현재 점수가 기록을 넘는 순간 저장하므로 게임오버를 기다리지 않습니다. `localStorage` 는 브라우저 전용이라 **렌더 중에 읽지 않고 effect 에서** 읽습니다 — 서버 프리렌더에서 `ReferenceError` 가 나거나 하이드레이션 불일치가 생깁니다.

### ⚠️ 변환 시 걸린 함정 (재발 방지)

1. **SSR**: `document`·`canvas.getContext`·`new Audio()`·`requestAnimationFrame` 은 서버에 없습니다. `'use client'` + 반드시 `useEffect` 안에서.
2. **React의 passive 터치 리스너**: React 17+ 는 `touchstart`/`touchmove`/`wheel` 을 루트에 passive로 등록하므로 `onTouchStart` 안의 `preventDefault()` 가 먹지 않습니다. 스와이프·조작 버튼은 **네이티브 리스너(`{passive:false}`)** 로 붙여야 하며, 아니면 한 번 눌러 두 번 동작합니다.
3. **basePath는 문자열 URL에 자동 적용되지 않습니다**: `new Audio('/audio/x.mp3')` 는 404. `process.env.NEXT_PUBLIC_BASE_PATH` 를 붙여야 합니다.
4. **StrictMode 이중 마운트**: 개발 모드에서 effect가 두 번 실행되어 rAF 루프·Audio 객체가 2개 생깁니다. cleanup에서 `cancelAnimationFrame` 필수.
5. `rewrites` destination에 **`.html` 금지** (위 Deployment 절 참조).

### ⚠️ 빌드 산출물을 커밋하므로 소스 수정 시 재빌드 필수

```sh
cd tetris-src && npm test      # 순수 로직 단위 테스트
cd tetris-src && npm run build # → repo 루트 tetris/ 갱신 (next build && cp -R out ../tetris)
```

**`tetris/`을 커밋하지 않으면 배포본이 소스와 어긋납니다.**

`tetris_streamlit.py` 는 **보관용으로 남겨둡니다**(`arkanoid_streamlit.py`·`family-todos.gs` 와 같은 선례). Streamlit Cloud 앱은 별도로 살아 있습니다.

## VOCA (Google Sheets Editor - Streamlit)

**`voca/`** — Streamlit 앱. Google Sheets 데이터를 읽고/쓰고/행을 추가할 수 있음.

### Auth: Google Service Account (OAuth 없음)

사용자 로그인 절차 없이 서비스 계정으로 자동 인증.

### Service Account 설정 방법

1. **GCP Console** (`console.cloud.google.com/apis/credentials`) → 사용자 인증 정보 만들기 → 서비스 계정
2. 서비스 계정 생성 후 **키 탭 → 키 추가 → 새 키 만들기 → JSON** 다운로드
3. 다운로드한 JSON을 **Google Sheet**와 공유 (시트 우상단 공유 → 서비스 계정 이메일을 편집자로 추가)
4. **Streamlit Cloud** (`share.streamlit.io`) → 앱 → Settings → Secrets 에 아래 형식으로 등록:

```toml
p1 = "base64-chunk-1"
p2 = "base64-chunk-2"
...
p40 = "base64-chunk-40"
```

base64 인코딩 방법:
```bash
base64 -i /path/to/service-account.json | python3 -c "import sys; b=sys.stdin.read().strip(); [print(f'p{i+1} = \"{b[i:i+80]}\"') for i in range(0, len(b), 80)]"
```

위 명령어로 생성된 p1~p40 키를 그대로 복사해서 Streamlit Cloud Secrets에 붙여넣기.

### 주의사항

- `private_key` 줄바꿈 문제를 피하기 위해 **꼭 base64 인코딩**해서 사용할 것
- TOML 멀티라인 문자열(`'''`, `"""`) 대신 **짧은 여러 개의 키**로 나누는 것이 안정적
- `.streamlit/secrets.toml`은 `.gitignore`에 등록되어 있음
- `secrets_cloud.toml` 같은 임시 파일은 사용 후 반드시 삭제

## Browser Automation

### 도구 선택 규칙

| 상황 | 도구 |
| --- | --- |
| 단순 화면 확인 / 스크린샷 / 렌더링 체크 | `agent-browser` |
| 로그인 세션 유지, 폼 다단계 입력, CI에 넣을 스크립트 필요 | Playwright MCP |
| 애매함 | 먼저 `agent-browser`로 빠르게 확인 → 실패하거나 복잡해지면 Playwright로 전환 |

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
- 설치 완료 (2026-09-15, v0.37.1 / Chrome 153) — 다른 머신에서는 `npm i -g agent-browser && agent-browser install`이 필요합니다.
  플러그인 설치(`/plugin install`)만으로는 바이너리가 내려오지 않아 `No binary found for darwin-arm64` 오류가 납니다.

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

This is a personal start page. No test framework, no linter config, no build system. Edit and open in browser directly.

**예외 2곳** — `moment/`(앨범, Vite 빌드)와 `tetris-src/`(테트리스, Next.js 빌드 + `node --test` 단위 테스트 21개). 두 프로젝트 모두 **산출물을 커밋**하므로 소스를 고치면 재빌드해야 합니다. 나머지 repo는 여전히 빌드도 테스트도 없습니다.

