# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

- Always use polite/formal Korean (존댓말, 하십시오체) when responding to the user.
- Never use 반말 (informal speech). This rule persists across all sessions and context resets.
- **사용자를 부를 때는 "동완님"을 씁니다.** "선생님" 등 다른 호칭은 어색해하십니다 (2026-09-21 요청).

## Project Overview

Korean-language personal start page (시작 페이지) with weather and todo lists. Single HTML file (`index.html`) with inline CSS and vanilla JS. Deployed on Vercel; login is Supabase email/password auth.

바로가기 '앨범' 항목으로 **모먼트(사진 게시판)** 를 같은 사이트의 `/album` 경로에서 엽니다 (`moment/` 소스 + `album/` 빌드 산출물).

바로가기 '게임 → TETRIS' 항목으로 **테트리스** 를 같은 사이트의 `/tetris` 경로에서 엽니다 (`tetris-src/` 소스 + `tetris/` 빌드 산출물). Streamlit 판(`tetris_streamlit.py`)을 Next.js 로 옮긴 것입니다.

바로가기 '게임 → ARKANOID' 항목으로 **알카노이드** 를 같은 사이트의 `/arkanoid` 경로에서 엽니다 (`arkanoid-src/` 소스 + `arkanoid/` 빌드 산출물).

바로가기 '챗봇' 항목으로 **미키 챗봇** 을 같은 사이트의 `/chat` 경로에서 엽니다 (`api/chat.js` 서버 함수 + `chat/` 정적 UI). Streamlit 판(`chatbot_app.py`)을 Vercel 로 옮긴 것입니다.

바로가기 'OCR' 항목으로 **이미지·PDF 텍스트 추출**을 같은 사이트의 `/ocr` 경로에서 엽니다 (`api/ocr.js` 서버 함수 + `ocr/` 정적 UI). Streamlit 판(`ocr_app.py`)을 Vercel 로 옮긴 것입니다.

바로가기 '학습 → 영단어' 항목으로 **VOCA(영단어 학습)** 를 같은 사이트의 `/voca` 경로에서 엽니다 (`api/voca.js` 서버 함수 + `voca/index.html` 정적 UI). Streamlit 판(`voca/app.py`)을 Vercel 로 옮긴 것입니다.

## Deployment

- Hosted on Vercel (project `homepage`, team `dwkim`) — static file deploy, no build step
  - 단, `api/` 디렉터리는 예외로 **Vercel Functions 로 함께 빌드**됩니다 (2026-09-21 `/chat` 이전 때 확인). `api/chat.js` → `/api/chat`
- `vercel.json` sets `outputDirectory: "."` so `index.html` (및 repo 루트의 정적 파일)이 그대로 서빙됨
- `vercel.json`의 `rewrites`가 `/album`·`/album/*`을 `/album/index`로 보내 SPA 딥링크 새로고침을 처리
  - ⚠️ **destination에 `.html`을 쓰면 동작하지 않습니다.** `cleanUrls: true`가 확장자를 제거하므로 `/album/index.html`은 매칭되지 않고 404가 됩니다 (2026-09-12 첫 배포에서 실제 발생 → `/album/index`로 수정)
  - `/tetris`·`/tetris/*`도 같은 규칙으로 `/tetris/index`로 보냅니다
  - `/arkanoid`·`/arkanoid/*`도 같습니다
  - `/chat`·`/chat/*`도 같습니다
  - `/ocr`·`/ocr/*`도 같습니다
  - `/voca`·`/voca/*`도 같습니다
  - `rewrites`는 파일시스템 조회 **이후**에 적용되므로 `/tetris/_next/...` 같은 실제 자산은 가로채이지 않습니다
    - 이 성질 때문에 **없는 경로도 200 이 나옵니다** — `/voca/app.py` 는 404 가 아니라 `/voca/index` 로 폴백한 HTML(200)입니다. 배포에 실렸는지 확인할 때 상태 코드만 보면 오판합니다. 본문·`content-length` 를 확실히 없는 경로와 대조하십시오 (2026-09-23 실제로 오판할 뻔했습니다)
- `.vercelignore`가 `moment/`·`tetris-src/`·`arkanoid-src/`를 제외 — 서빙되는 것은 빌드 산출물 `album/`·`tetris/`·`arkanoid/`뿐
  - ⚠️ `.vercelignore`는 gitignore 문법이라 패턴이 **하위 모든 깊이에 적용**됩니다. `*.py`가 그 예로, 파이썬으로 서버 함수를 쓰면 `api/foo.py`가 조용히 업로드에서 빠집니다
  - `voca/` 는 제외 목록에 없지만 `*.py`·`.streamlit/`·`.venv/`·`requirements.txt` 가 각각 걸려 **`voca/index.html` 만** 배포됩니다
- Production URL: https://homepage-dwkim.vercel.app (앨범: `/album`, 테트리스: `/tetris`, 알카노이드: `/arkanoid`, 챗봇: `/chat`, OCR: `/ocr`, 영단어: `/voca`)

## Data Pipeline (레거시 — 현재 프론트에서 미사용)

```text
fetch.py (Python 3, no deps) → data.json
```

> **⚠️ 주의**: 주식/뉴스 카드가 제거되면서 `index.html`은 더 이상 `data.json`을 소비하지 않습니다 (2026-08-27 기준). `fetch.py`는 보관/재개발용입니다.
>
> **`data.json`은 커밋하지 않습니다** (2026-09-16 추적 해제, `.gitignore` 등록). 생성물인데 읽는 코드가 없어 저장소만 무겁게 했습니다. 재개발 시 `python3 fetch.py`로 다시 만들면 됩니다.

- `fetch.py` uses only `urllib`, `json`, `re`, `html` from stdlib — no pip install needed
- Run: `python3 fetch.py` (작업 트리에 data.json 생성 — 커밋되지 않음)
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
- **형제 페이지**: `chat/index.html` (`/chat` 챗봇) — 같은 방식(순수 HTML/CSS/JS, CDN supabase-js, `DESIGN.md` 토큰). 빌드 도구를 쓰지 않으며 홈페이지와 Supabase 세션을 공유합니다

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

Note: 루트 `package.json`은 이제 **의존성이 없습니다**. `@supabase/supabase-js`·`@supabase/ssr`은 루트에서 import 하는 곳이 한 곳도 없어 제거했습니다 (2026-09-16) — 홈페이지는 CDN을 쓰고, 앨범·테트리스는 각자 자체 의존성을 가집니다. `.env.local`(`NEXT_PUBLIC_*`)은 여전히 미사용이며 보관 중입니다.

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

## 알카노이드 — `/arkanoid`

`arkanoid_streamlit.py` 를 Next.js 정적 export 로 옮긴 것입니다.

- **소스**: `arkanoid-src/` (Next.js 16 + React 19, `output: 'export'`)
- **서빙**: `arkanoid/` — 빌드 산출물. Vercel은 빌드하지 않으므로 **이 폴더가 실제 배포본**
- **경로**: `https://homepage-dwkim.vercel.app/arkanoid` (홈페이지 바로가기 '게임 → ARKANOID' 타일 → 새 탭)

### ⚠️ 원본은 파이썬 게임이 아니었습니다

`arkanoid_streamlit.py`(927행)는 **게임을 담은 HTML 문자열을 띄우는 ~20줄짜리 호스트**입니다. 게임
전체(입력·물리·렌더·오디오)가 `GAME_HTML_TEMPLATE` 안의 순수 JS이고 `st.session_state`·rerun 루프·
`time.sleep`·서버 상태가 전혀 없습니다. 그래서 이 작업은 **Python 포팅이 아니라 JS → React 포팅**이며,
물리·레벨·그리기는 원본 코드를 거의 그대로 옮긴 것입니다.

### 설계 요점 (테트리스와 다른 부분)

| 항목 | 테트리스 | 알카노이드 | 이유 |
| --- | --- | --- | --- |
| 상태 | `useReducer` (순수) | **ref 안의 가변 월드** | 입력이 이산적이지 않습니다 — 패들이 손가락을 초당 60회 따라가고 공도 매 틱 움직입니다. HUD·오버레이·점수·목숨이 전부 캔버스에 그려지므로(`drawHUD` 가 목숨을 미니 패들로 그림) 매 프레임 React 가 다시 그릴 것이 없고, 상태가 커서 60Hz 로 복사할 이유도 없습니다 |
| 부수효과 | `locks`/`lines` 를 diff 해 소리 추론 | `stepWorld` 가 **events 배열을 반환** | 원본의 `playSound` 9곳을 데이터로 바꿨습니다. diff 추론보다 정확하고 순서가 보존됩니다 |
| 시간 | `MAX_FRAME_DELTA_MS = 200` | **`MAX_TICKS_PER_FRAME × TICK_MS` = 83.3ms (파생)** | 200ms 를 그대로 쓰면 16.667ms 틱에서 12틱이 한 프레임에 몰려, 라운드 5에서 공이 최대 71px 을 순간이동해 브릭(높이 16px)과 패들을 통과합니다 |
| 루프 | `if (acc >= interval)` | **`while`** | 30fps 화면에서도 60Hz 시뮬레이션을 유지하려면 프레임당 여러 틱이 필요합니다 |
| 터치 | `useSwipe`(이산 제스처) | **`usePointer`(Pointer Events)** | 알카노이드는 절대 위치 연속 드래그라 제스처 판정이 아닙니다 |

- **RNG 주입**: `createWorld({ rng })`. 상수 RNG 로 "가드가 걸린 것"과 "주사위가 안 굴러간 것"을
  구분합니다 — `dropItem` 이 `maxHp !== 1` 로 거르는지, 12% 확률로 거르는지를 따로 검증합니다.
- **`setTimeout` 2개를 틱 카운터로** 바꿨습니다(800ms→48틱, 1200ms→72틱). 언마운트 뒤에 발화하는
  타이머가 **구조적으로 불가능**해지고, 일시정지에도 맞습니다.
- `game/` 은 테트리스처럼 **React·DOM 을 import 하지 않습니다** (`node --test` 47개).

### ⚠️ 변환 시 걸린 함정 (재발 방지)

1. **DPR 좌표 환산** — 원본은 `bc.width / rect.width` 로 환산했는데, 그건 `width` 속성이 논리 크기(400)라서 맞는 식이었습니다. 이 포트는 `setupCanvas` 가 `canvas.width = cssW * dpr` 로 백킹 스토어를 키우므로 **`canvas.width` 를 쓰면 2배 화면에서 패들이 손가락의 2배 위치로 날아갑니다.** 논리 상수 `W` 를 쓰십시오 (`physics.js` 의 `paddleXFromClientX`).
2. **`box-sizing: border-box` 와 테두리** — 전역 `*` 규칙 때문에 `style.width = 400px` 에 테두리 4px 가 포함되어 그리기 영역은 `clientWidth`(396)이고 원점은 `rect.left + clientLeft` 입니다. `rect` 를 그대로 넘기면 테두리만큼(약 1%) 어긋납니다.
3. **`touch-action: none` 이 스크롤 차단의 핵심** — `preventDefault()` 가 아닙니다. 원본은 Streamlit **iframe 안**이라 페이지 스크롤 문제가 없었지만, 이제 게임이 최상위 문서를 차지하므로 `touch-action: none`(캔버스) + `overscroll-behavior: none`(html/body, 당겨서 새로고침)이 필요합니다. **`overflow: hidden` 은 쓰지 않습니다** — 세로가 짧은 화면에서 조작 버튼에 닿을 수 없게 됩니다.
4. **React 17+ 의 passive 리스너** — `touchmove` 를 React prop 으로 받으면 `preventDefault()` 가 무효입니다. Pointer Events 는 그 passive 목록(`touchstart`/`touchmove`/`wheel`)에 없어 이 함정을 비켜갑니다.
5. **`ctx.roundRect`** — Chrome 99+/Safari 16.4+ 이고, 없으면 **TypeError 가 `drawScene` 전체를 중단시켜 게임이 멈춘 것처럼 보입니다**. `quadraticCurveTo` 기반 `roundRectPath` 로 대체했습니다.
6. **`createWorld()` 는 DOM 을 모릅니다** — `navigator` 를 읽으면 `useRef(createWorld())` 초기화가 렌더 중(SSR)에 돌아 빌드가 깨집니다. `isMobile` 은 마운트 후 effect 에서 설정합니다.
7. `rewrites` destination에 **`.html` 금지** (위 Deployment 절 참조).

### 원본에서 고친 결함 2가지

- **레벨 4 소프트락** — `checkLevelComplete` 는 `visible` 브릭을 세므로 파괴 불가 골드 브릭 10개가 남아 있는 한 레벨이 끝나지 않습니다. 통과 수단은 B 포탈뿐인데 1-HP 브릭 30개 × 12% × 5% 로는 대부분 막혀 **약 86%가 클리어 불가**였습니다. 마지막 레벨에서 첫 1-HP 브릭 파괴 시 B 를 확정 지급합니다(`world.portalGranted`).
- **게임오버가 스스로 풀리던 문제** — 원본은 이전 생명 감소의 `setTimeout` 을 남겨 두어, 게임오버 800ms 뒤 `resetBall` 이 `gameState` 를 `'ready'` 로 되돌렸습니다. 틱 카운터로 옮기며 `transition = null` 로 정리합니다.

### 파일 구조

| 경로 | 역할 |
| --- | --- |
| `game/constants.js` | 보드·아이템 수치 + 틱 상수 |
| `game/levels.js` | `makeBrick` · `genLevel` (5개 레벨) |
| `game/world.js` | 월드 생성·액션·`ballSpeed` (`physics` 가 import 하는 단방향) |
| `game/physics.js` | 틱당 물리 + `paddleXFromClientX` |
| `game/step.js` | `stepWorld(world, input) → events[]` — 틱 진입점 |
| `game/render.js` | `setupCanvas`(DPR) + 모든 `draw*` |
| `hooks/` | `useGameLoop`(고정 타임스텝) · `usePointer` · `useKeyboard` · `useAudio` |
| `components/ArkanoidGame.jsx` | 오케스트레이터 (**`useState` 없음**) |
| `game/*.test.js` | 단위 테스트 47개 (`node --test`) |

### ⚠️ 빌드 산출물을 커밋하므로 소스 수정 시 재빌드 필수

```sh
cd arkanoid-src && npm test      # 순수 로직 단위 테스트 47개
cd arkanoid-src && npm run build # → repo 루트 arkanoid/ 갱신 (next build && cp -R out ../arkanoid)
```

**`arkanoid/`을 커밋하지 않으면 배포본이 소스와 어긋납니다.**

배경 이미지는 `images/arkanoid.png`(1024×1024, 1.3MB)를 **WebP 131KB 로 재인코딩**해 `public/bg/` 에 둡니다 (테트리스 테마곡을 96kbps 로 재인코딩한 선례와 같습니다). 효과음 4개는 `sound/` 에서 `public/audio/` 로 복사하며, 테트리스와 **같은 파일**(swipe·drop·change·break)입니다.

`arkanoid_streamlit.py` 는 **보관용으로 남겨둡니다** — 포팅 검증의 기준 구현입니다.

## 챗봇 (미키) — `/chat`

Streamlit 판(`chatbot_app.py`)을 Vercel 로 옮긴 것입니다 (2026-09-21). Streamlit 은 상시 구동 서버라 Vercel 에 올릴 수 없어 **UI 층을 다시 만들었습니다.**

- **서버**: `api/chat.js` — `export default { async fetch(request) }`
- **UI**: `chat/index.html` — 순수 HTML/CSS/JS. 빌드 도구 없음 → **재빌드 불필요**
- **경로**: `https://homepage-dwkim.vercel.app/chat` (홈페이지 바로가기 '챗봇' 타일 → 새 탭)
- `chatbot_app.py` 는 **보관용**으로 남겨둡니다 (테트리스·알카노이드의 `*_streamlit.py` 와 같은 선례)
- **Streamlit Cloud 앱은 2026-09-21 삭제했습니다** — 이전의 원래 동기 중 하나가 "인증 없이 누구나 쓸 수 있음"이었는데, 앱이 살아 있으면 그 구멍이 남으므로 보관용 코드만 남기고 앱은 폐기했습니다
  - ✅ 저장소가 관리하던 Streamlit Cloud 앱은 **전부 폐기했습니다** — 챗봇(2026-09-21) · OCR(2026-09-22) · 학습/VOCA(2026-09-23). 셋 다 `/chat`·`/ocr`·`/voca` 로 이전해 Vercel 이 서빙합니다
  - ⚠️ **폐기 순서를 지키십시오: 이전 → 배포 → 프로덕션 검증 → 그 다음 앱 삭제.** 먼저 끄면 기능이 죽습니다. 삭제 여부는 **curl 로 판별되지 않습니다**(살아 있는 앱과 삭제된 앱이 똑같이 303) — 브라우저로 `share.streamlit.io/errors/not_found` 를 확인해야 합니다 (2026-09-22·23 두 번 모두)
  - 테트리스·알카노이드의 Streamlit 앱이 별도로 살아 있는지는 저장소에 URL이 남아 있지 않아 확인할 수 없습니다 (Streamlit Cloud 대시보드에서 확인)

### ⚠️ 실제 제공자는 DeepSeek 입니다 (Anthropic 이 아닙니다)

`ANTHROPIC_BASE_URL` 이 `https://api.deepseek.com/anthropic` 을 가리킵니다. Anthropic **호환** 엔드포인트라 Anthropic SDK·헤더 규격이 그대로 통합니다.

- `x-api-key` 완전 지원 · `stream`/`system`/`max_tokens` 완전 지원 · `anthropic-version` 은 무시됨
- **모델명은 자동 매핑**됩니다 — `claude-sonnet*` → `deepseek-flash`, `claude-opus*` → `deepseek-v4-pro`. 그래서 기존 `claude-sonnet-4-20250514` 가 그동안 동작했습니다. **Anthropic 모델 카탈로그를 기준으로 "낡았다"고 판단하면 안 됩니다** (2026-09-21 실제로 이 착각을 했습니다)
- `web_search_20250305` 서버 도구가 **실제로 실행됩니다** (2026-09-21 실제 호출로 확인 — 검색 질의가 생성되고 `server_tool_use`·`web_search_tool_result` 블록이 돌아옵니다). 문서의 `tools` 표에는 사용자 정의 도구 필드만 적혀 있어 문서만 보면 오판하게 됩니다
- 응답에는 `thinking` 블록이 함께 나오지만 함수가 `text_delta` 만 뽑으므로 화면에는 답변만 표시됩니다

### 인증

홈페이지와 **같은 origin** 이라 Supabase 세션이 자동 공유됩니다 (앨범과 같은 원리). 함수는 `Authorization: Bearer <token>` 을 받아 `GET {SUPABASE_URL}/auth/v1/user` 로 검증하고, 실패하면 **Anthropic 을 호출하지 않고** 401 을 돌려줍니다. 별도 시크릿이 필요 없습니다.

### 파일 구조

| 경로 | 역할 |
| --- | --- |
| `api/chat.js` | Anthropic(DeepSeek) 프록시 + Supabase 토큰 검증. SSE 를 평문 텍스트 청크로 정규화 |
| `chat/index.html` | 채팅 UI. 홈페이지와 같은 방식으로 supabase-js 를 CDN 에서 로드 |

### 설계 요점

- **SSE 정규화**: Anthropic 의 SSE 를 그대로 흘리지 않고 `content_block_delta` → `text_delta` 만 뽑아 평문으로 내보냅니다. 웹서치가 켜지면 `server_tool_use`·`web_search_tool_result`·`ping` 등 텍스트가 아닌 이벤트가 섞이는데, 그 처리를 함수에서 끝내면 브라우저가 Anthropic 포맷을 알 필요가 없습니다. 청크가 이벤트 중간에서 끊길 수 있으므로 **버퍼에 이어 두고 빈 줄(`\n\n`) 경계로 자릅니다.**
- **첫 메시지는 반드시 `user`** — 인사말을 이력에 넣어 보내면 규칙 위반입니다. 인사말은 화면에만 그리고 API 로는 보내지 않습니다. (기존 Streamlit 판은 인사말을 이력에 넣어 보냈습니다)
- **`SOUL.md` 는 함수 안에 인라인**되어 있습니다. `.vercelignore` 의 `*.md` 때문에 SOUL.md 는 배포에 실려가지 않아 함수가 파일로 읽을 수 없습니다. 파일로 두든 상수로 두든 수정에 커밋+배포가 필요하므로 운영상 차이는 없습니다
- **히스토리는 메모리 보관** — 새로고침 시 초기화됩니다. 기존 Streamlit 동작과 같습니다 (의도된 범위)
- 대화 이력 20개 제한(`MAX_HISTORY`)은 기존과 동일하며 **클라이언트가** 잘라 보냅니다

### 환경변수

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | **필수** | DeepSeek API 키. 로컬은 `.env.local`, 배포는 Vercel 환경변수 |
| `ANTHROPIC_BASE_URL` | 선택 | 기본값 `https://api.deepseek.com/anthropic` |
| `ANTHROPIC_MODEL` | 선택 | 기본값 `claude-sonnet-4-20250514` (DeepSeek 이 자동 매핑) |

### ⚠️ 함정 (재발 방지)

1. **정적 배포에 함수를 얹을 수 있습니다.** `framework: null` + `buildCommand: null` + `outputDirectory: "."` 조합에서도 `api/` 는 함께 빌드됩니다. `vercel dev` 로 배포 없이 확인할 수 있습니다
2. `rewrites` destination 에 **`.html` 금지** (위 Deployment 절 참조). `/chat` 은 `/chat/index` 로 보냅니다
3. **로그인 게이트가 두 곳에 있습니다.** `index.html` 의 `data-link` 와, 같은 파일에서 URL 문자열을 비교하는 게이트입니다 (현재 `url==='/chat'||url==='/ocr'||url==='/voca'`). 한쪽만 고치면 게이트가 조용히 죽어 로그인 모달이 뜨지 않습니다. 이 게이트는 **UX 용이며 실제 보안 경계는 함수의 401** 입니다

## OCR — `/ocr`

Streamlit 판(`ocr_app.py`)을 Vercel 로 옮긴 것입니다 (2026-09-22). Streamlit 은 상시 구동 서버라 Vercel 에 올릴 수 없어 **UI 층을 다시 만들었습니다.**

- **서버**: `api/ocr.js` — `export default { async fetch(request) }`
- **UI**: `ocr/index.html` — 순수 HTML/CSS/JS. 빌드 도구 없음 → **재빌드 불필요**
- **경로**: `https://homepage-dwkim.vercel.app/ocr` (홈페이지 바로가기 'OCR' 타일 → 새 탭)
- `ocr_app.py` 는 **보관용**으로 남겨둡니다 (테트리스·알카노이드·챗봇의 `*_streamlit.py` 와 같은 선례)
- **Streamlit Cloud 앱은 2026-09-22 삭제했습니다** (챗봇과 같은 순서 — 이전·배포·프로덕션 검증이 끝난 뒤에 폐기). 이제 `https://homepage-5alru2tgbgnfk8wnmz2pux.streamlit.app` 은 `share.streamlit.io/errors/not_found` 로 넘어갑니다
  - ⚠️ 삭제 시점에 **CLOVA OCR 도메인은 살아 있습니다.** 도메인 유지 비용이 발생하므로 OCR 을 더 안 쓰실 거라면 NAVER 콘솔에서 정리하십시오 — 다만 이 앱은 계속 쓸 것이므로 **남겨두는 것이 맞습니다**

### 인터페이스

브라우저가 **원본 바이트**를 보냅니다. JSON+base64 로 받으면 33% 팽창하므로, base64 인코딩은 함수가 CLOVA 직전에 한 번만 합니다.

```text
POST /api/ocr              Content-Type: image/jpeg | image/png | application/pdf
                           X-File-Name: <URL 인코딩된 파일명>
                           Body: 원본 바이트
                           → { "text": "..." }

POST /api/ocr?translate=1  Content-Type: text/plain
                           Body: 번역할 텍스트
                           → { "text": "..." }
```

### 원본에서 바꾼 것 3가지

| | Streamlit 판 | 이전 후 | 이유 |
| --- | --- | --- | --- |
| 인증 | 없음 | Supabase 토큰 검증 | **CLOVA OCR 은 과금 API** 입니다. 열어두면 링크를 아는 누구나 호출해 비용이 나갑니다 (챗봇을 내린 것과 같은 이유) |
| PDF | pymupdf 로 1페이지를 200 DPI PNG 로 구워 전송 | **PDF 원본을 그대로 전송** | CLOVA General OCR V2 가 `pdf` 를 직접 받고 **최대 10페이지**를 인식합니다. pymupdf 는 OCR 이 아니라 미리보기용이었습니다 |
| 미리보기 | 굽은 PNG | `<iframe src=blob:…>` | 브라우저 내장 PDF 뷰어. 이전하며 **새 의존성이 0** 이 됩니다 |

- ⚠️ **Streamlit 판이 실제로 얼마나 열려 있었는지는 끝내 확인하지 못했습니다 — 그리고 이제 확인할 방법이 없습니다.** `ocr_app.py` 에 인증 코드가 **없다는 것은 코드 수준 사실**이지만, Streamlit Cloud 앱의 viewer 설정이 공개였는지는 확인하지 못했습니다 (확인하려던 시점에 앱이 휴면 상태였고, 깨우면 계정에 부작용이 있어 두었습니다). 그 뒤 **2026-09-22 앱을 삭제했으므로 다시 조사하지 마십시오.** **함수의 401 은 그 설정과 무관하게 항상 적용됩니다**
- **인식 범위가 1페이지 → 최대 10페이지로 늘었습니다**(의도된 변경). 여러 페이지면 빈 줄 하나로 이어 붙입니다 — 다운로드 결과가 텍스트 하나여야 하므로 페이지 구분자를 넣지 않았습니다
- **이미지를 브라우저에서 긴 변 2000px 로 줄여 보냅니다.** 원본은 리사이즈 없이 원본 해상도를 보냈습니다 — 12MP 사진이면 PNG 로 20~30MB 라 CLOVA 한도(50MB)에 근접했습니다. 이제 1/10 수준입니다
  - ⚠️ 축소는 `<img>` → `canvas` 로 그리므로 **EXIF 회전이 자동 반영**됩니다 (원본의 `ImageOps.exif_transpose` 에 해당). `createImageBitmap` 으로 바꾸면 세로 사진이 눕습니다
- **`MAX_BYTES`(50MB) 검사는 축소 뒤에 합니다** — 그래야 큰 이미지가 축소돼 통과합니다. PDF 는 축소가 없으므로 원본 크기로 걸립니다

### 그대로 옮긴 것

- 줄 묶기(`ocr_app.py:139-178`) — 앞 단어와 세로로 25% 넘게 겹치면 같은 줄. **함수 안에** 있습니다 (응답을 순수 텍스트로 만들어 브라우저가 `boundingPoly` 를 몰라도 되게)
- 언어 판정(`ocr_app.py:206-208`) — 한글 비율 30% 초과면 ko→en
- 오류 3분기(HTTP / 네트워크 / 기타)

### ⚠️ 번역은 비공식 구글 엔드포인트입니다

`deep_translator` 는 파이썬 전용이라 쓸 수 없어, 같은 계열의 `translate.googleapis.com/translate_a/single` 을 함수에서 직접 부릅니다 (서버라 CORS 가 없습니다). 2026-09-22 실제 호출로 **응답 형식과 파싱을 확인**했습니다.

- **언제든 깨질 수 있습니다.** 원본도 같은 위험을 안고 있었으므로 이전이 위험을 키우지는 않았습니다
- 한 번에 보낼 수 있는 길이에 한계가 있어 `TRANSLATE_CHUNK`(1200자)로 줄 단위로 나눠 보냅니다. 이걸 빼면 긴 문서의 번역이 조용히 잘립니다
- 대안은 Google Cloud Translation(키·과금) 또는 이미 있는 DeepSeek 프록시 재사용입니다. 다만 LLM 을 쓰면 비용·지연이 붙고 결정성이 떨어집니다

### 환경변수

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `OCR_INVOKE_URL` | **필수** | CLOVA OCR 도메인의 Invoke URL. 로컬은 `.env.local`, 배포는 Vercel 환경변수 |
| `OCR_SECRET_KEY` | **필수** | CLOVA OCR Secret Key. **브라우저에 노출되면 안 됩니다** — 함수에만 둡니다 |

### ⚠️ 함정 (재발 방지)

1. **`.vercelignore` 의 `*.py` 때문에 파이썬 함수는 조용히 배포에서 빠집니다.** `api/ocr.py` 를 만들면 404 가 납니다. 그래서 **JS 로 썼습니다** — 예외 규칙(`!api/ocr.py`)을 뚫는 방법도 있지만 다음 사람이 또 밟습니다
2. `rewrites` destination 에 **`.html` 금지** (위 Deployment 절 참조). `/ocr` 은 `/ocr/index` 로 보냅니다
3. **로그인 게이트가 두 곳에 있습니다.** `index.html` 의 `data-link` 와, 같은 파일에서 URL 문자열을 비교하는 게이트입니다 (현재 `url==='/chat'||url==='/ocr'||url==='/voca'`). 한쪽만 고치면 게이트가 조용히 죽어 로그인 모달이 뜨지 않습니다. 이 게이트는 **UX 용이며 실제 보안 경계는 함수의 401** 입니다
4. 파일명은 `X-File-Name` 헤더로 보내므로 **`encodeURIComponent` 로 인코딩**해야 합니다. 헤더에 비ASCII 를 그대로 넣으면 예외가 납니다

### 보관용 `requirements.txt` 는 지우지 마십시오

루트 `requirements.txt`(streamlit·pymupdf·deep-translator·anthropic)는 보관용 `ocr_app.py`·`chatbot_app.py` 가 의존합니다. `pymupdf`·`deep-translator` 를 빼면 보관본이 재현 불가가 됩니다.

## VOCA (영단어) — `/voca`

Streamlit 판(`voca/app.py` 412줄 + `auth.py` + `sheets.py`)을 Vercel 로 옮긴 것입니다 (2026-09-23). Streamlit 은 상시 구동 서버라 Vercel 에 올릴 수 없어 **UI 층을 다시 만들었습니다.**

- **서버**: `api/voca.js` — `export default { async fetch(request) }`
- **UI**: `voca/index.html` — 순수 HTML/CSS/JS. 빌드 도구 없음 → **재빌드 불필요**
- **경로**: `https://homepage-dwkim.vercel.app/voca` (홈페이지 바로가기 '학습 → 영단어' 타일 → 새 탭)
- `voca/*.py` 는 **보관용**으로 남겨둡니다 (테트리스·알카노이드·챗봇·OCR 의 `*_streamlit.py` 와 같은 선례)
- **Streamlit Cloud 앱은 2026-09-23 삭제했습니다** (이전·배포·프로덕션 검증 뒤에 폐기 — 챗봇·OCR 과 같은 순서). 이제 `https://homepage-3yhnryaak9uzgxrkmedepf.streamlit.app` 은 `share.streamlit.io/errors/not_found` 로 넘어갑니다

### ⚠️ 다른 앱과 달리 "쓰기" 앱입니다 — 인증이 곧 보안 경계

OCR 은 읽기 전용이라 최악이 비용이었지만, VOCA 는 동완님의 **실제 구글 시트를 수정·삭제**합니다. 그래서 겹을 둘 더 두었습니다.

- **이메일 허용목록**(`VOCA_ALLOWED_EMAILS`) — 서비스 계정에 시트 쓰기 권한이 있으므로, Supabase 토큰만 확인하면 **앨범 회원가입으로 만들어진 다른 계정**도 시트를 읽고 고칠 수 있습니다 (2026-09-23 기준 계정 2개). 허용목록이 비면 **전부 거부**합니다 (fail-closed)
- **스프레드시트 ID 허용목록**(`VOCA_SHEET_IDS`) — 없으면 이 함수가 "서비스 계정이 닿을 수 있는 아무 시트나 조작하는 프록시"가 됩니다

### 인터페이스

```text
GET  /api/voca?sheet=<url>            → { sheets: [...] }
GET  /api/voca?sheet=<url>&ws=<name>  → { values: [[...]] }    (0행 = 헤더)
POST /api/voca?sheet=<url>&ws=<name>  → { applied: {...} }     본문 = { ops: [...] }
POST /api/voca?extract=1              → { words: [...] }       본문 = 텍스트
```

`ops` 는 넷입니다 — `createSheet`(title·headers, 이름이 중복이면 409) · `update`(cells `[{row, col, value}]`, 1-based) · `delete`(rows, 순서 무관) · `append`(rows). 서버가 **고정 순서**로 적용합니다: `createSheet` → `delete`(내림차순) → `update` → `append`. 원본의 탭별 처리 순서와 같습니다 (탭 2 는 삭제 먼저, 추가 나중).

### 원본에서 바꾼 것

| | Streamlit 판 | 이전 후 | 이유 |
| --- | --- | --- | --- |
| 인증 | 없음 | 토큰 + 이메일 허용목록 | 시트 쓰기 권한이 걸려 있습니다 |
| 시트 범위 | URL 입력 그대로 | ID 허용목록 검증 | 임의 시트 조작 프록시 차단 |
| 쓰기 호출 | 변경 셀마다 `update_cell` (30셀=30회) | `values.batchUpdate` 등 1회 | Sheets 한도는 분당 쓰기 60회 |
| 구글 인증 | gspread + google-auth (파이썬) | `node:crypto` 로 JWT 직접 서명 | `*.py` 때문에 파이썬 함수가 배포에서 빠집니다. **새 의존성 0** |
| scope | `spreadsheets` + `drive.readonly` | `spreadsheets` 만 | Drive API 를 쓰지 않습니다 (`open_by_key`·`worksheets()` 는 Sheets API v4) |
| 탭 2 기존 행 | 편집 가능해 보이나 저장되지 않고 버려짐 | **읽기 전용** + 안내 문구 | 데이터 손실로 보이는 것을 막습니다 |
| 탭 2 빈 행 | 전부 빈 행도 추가 | 걸러냄 | 탭 4 와 같은 규칙 |
| CSV | 저장 전 편집이 반영 안 된 값 | 화면에 보이는 값 | 내려받기가 보이는 것과 같아야 합니다 |
| 워크시트 선택 | 목록 + '직접 입력' 모드 | 목록만 | 원본에서도 없는 이름은 오류만 냈습니다 |

### 그대로 옮긴 것

- **셀 diff** — 바뀐 셀만 씁니다. 빈 셀과 빈 셀은 "변경 없음"으로 봅니다
- **삭제 인덱스** — 1-based 시트 행 번호이고 **큰 행부터** 지웁니다 (작은 행을 먼저 지우면 뒤가 밀려 엉뚱한 행이 지워집니다)
- **`valueInputOption`** — 셀 수정·헤더 쓰기는 gspread `update(raw=True)` 이므로 `RAW`, 행 추가는 `sheets.py` 가 `USER_ENTERED` 를 명시하므로 `USER_ENTERED`. `RAW` 는 `3/4` 를 문자열로, `USER_ENTERED` 는 날짜로 해석합니다
- **`append` 에 `insertDataOption` 을 보내지 않음** — 원본(gspread `append_row`)도 안 보내 API 기본값 `OVERWRITE` 로 동작했습니다
- **탭 3(학습)은 시트에 아무것도 쓰지 않습니다** — 가리기와 체크박스는 화면 상태입니다
- **단어 추출 프롬프트는 `app.py` 것을 그대로** 옮겼습니다. 응답에 `thinking` 블록이 먼저 오므로 `text` 블록만 뽑습니다 (실측 확인)

### 환경변수

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `VOCA_SA_B64` | **필수** | 서비스 계정 JSON 의 **base64 한 줄**. 로컬은 `.env.local`, 배포는 Vercel 환경변수 |
| `VOCA_SHEET_IDS` | **필수** | 허용 스프레드시트 ID (쉼표 구분) |
| `VOCA_ALLOWED_EMAILS` | **필수** | 허용 이메일 (쉼표 구분). **미설정 시 전부 거부** |
| `ANTHROPIC_API_KEY` | 재사용 | 챗봇이 이미 쓰는 값 — 추출에 새 시크릿이 필요 없습니다 |

- base64 는 **따옴표가 필요 없어** `.env.local` 에 한 줄로 그대로 들어갑니다 — 2026-09-22 의 "따옴표째 Vercel 에 등록" 사고를 구조적으로 막습니다
- Vercel 한도는 **프로젝트 전체 64KB** 입니다 (키가 약 3.2KB 이므로 여유가 큽니다)

### ⚠️ 함정 (재발 방지)

1. **`.vercelignore` 의 `*.py` 때문에 파이썬 함수는 조용히 배포에서 빠집니다** — OCR 과 같은 이유로 JS 로 썼습니다
2. `rewrites` destination 에 **`.html` 금지**. `/voca` 는 `/voca/index` 로 보냅니다
3. **로그인 게이트가 두 곳에 있습니다.** `index.html` 의 `data-link` 와, 같은 파일에서 URL 문자열을 비교하는 게이트(`url==='/chat'||url==='/ocr'||url==='/voca'`)입니다. 한쪽만 고치면 게이트가 조용히 죽습니다. 이 게이트는 **UX 용이며 실제 보안 경계는 함수의 401/403** 입니다
4. **없는 경로가 200 으로 보입니다** (위 Deployment 절) — 배포 포함 여부는 상태 코드가 아니라 본문으로 확인하십시오

### 보관용 Streamlit 판 (`voca/`)

`voca/app.py`·`auth.py`·`sheets.py` 는 **보관용**입니다. 로컬 실행:

```sh
cd voca && .venv/bin/streamlit run app.py
```

가상환경은 **`voca/.venv`** 하나만 씁니다 (`voca/venv` 를 새로 만들지 마십시오 — 과거에 둘이 공존해 혼란을 빚었습니다). 없으면 `cd voca && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`.

- **서비스 계정 키의 로컬 사본은 `voca/.streamlit/secrets.toml` 의 `p1`~`p40`(base64 80자 청크)과 `.env.local` 의 `VOCA_SA_B64` 입니다.** 둘 다 gitignore 되어 있고 원본은 GCP Console 에 있습니다. `VOCA_SA_B64` 는 **`p1`~`p40` 을 그대로 이어 붙인 값**이라 재발급 없이 복원됩니다 (2026-09-23 확인)
  - 청크를 다시 만들려면: `base64 -i service-account.json | python3 -c "import sys; b=sys.stdin.read().strip(); [print(f'p{i+1} = \"{b[i:i+80]}\"') for i in range(0, len(b), 80)]"`
- 서비스 계정은 시트와 공유되어 있어야 합니다 (시트 우상단 공유 → 서비스 계정 이메일을 편집자로 추가)
- `private_key` 줄바꿈 문제를 피하려고 base64 를 씁니다. TOML 멀티라인 문자열보다 짧은 여러 키가 안정적입니다

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

**예외 3곳** — `moment/`(앨범, Vite 빌드), `tetris-src/`(테트리스, Next.js 빌드 + `node --test` 단위 테스트 21개), `arkanoid-src/`(알카노이드, Next.js 빌드 + `node --test` 단위 테스트 47개). 세 프로젝트 모두 **산출물을 커밋**하므로 소스를 고치면 재빌드해야 합니다. 나머지 repo는 여전히 빌드도 테스트도 없습니다.

`chat/`(`/chat`)·`ocr/`(`/ocr`)·`voca/`(`/voca`)는 **빌드도 테스트도 없습니다** — 정적 HTML 이라 재빌드할 것이 없고, 서버 쪽은 `api/chat.js`·`api/ocr.js`·`api/voca.js` 각 한 파일입니다. 검증은 로컬 `vercel dev` 로 합니다 (Vercel CLI 필요).

단, **옮긴 로직은 조용히 틀리면 그럴듯한 잘못된 결과를 내놓습니다** — `api/ocr.js` 의 줄 묶기 휴리스틱·CLOVA 요청 조립·언어 판정(2026-09-22, 23개), `api/voca.js` 의 셀 diff·삭제 순서·`valueInputOption` 구분·허용목록(2026-09-23, 63개). 저장소에 테스트 파일을 두지 말고 **`globalThis.fetch` 를 가로채는 일회성 하네스**로 검증한 뒤 지우십시오 — 이 repo 의 관례가 아닙니다.

`api/voca.js` 는 실호출 검증이 특히 중요합니다. **서비스 계정이 실제 시트를 수정·삭제**하므로 검증은 **테스트 워크시트에서만** 하고 반드시 지우십시오 (2026-09-23 에 `_voca_이전검증` 을 만들어 쓰고 삭제했습니다). 실호출 하네스는 Supabase 토큰 검증만 스텁으로 바꾸고 Google·DeepSeek 은 진짜로 부르면 됩니다.

