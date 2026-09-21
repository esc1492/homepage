# AGENTS

Always use polite/formal Korean (존댓말, 하십시오체). Do not use a specific name/honorific for the user.

## What this repo is

Korean personal start page (`index.html`). Plus a few standalone Streamlit apps.

## Key commands

```sh
python3 fetch.py              # fetch stocks + news → data.json
python3 -m http.server 8080   # serve index.html locally
streamlit run tetris_streamlit.py
streamlit run arkanoid_streamlit.py
streamlit run chatbot_app.py

cd moment && npm run build    # 앨범 재빌드 → repo 루트 album/ 갱신
cd moment && npm run dev      # 앨범 개발 서버

cd tetris-src && npm run build # 테트리스 재빌드 → repo 루트 tetris/ 갱신
cd tetris-src && npm test      # 게임 로직 단위 테스트 (node --test, 21개)
cd tetris-src && npm run dev   # 테트리스 개발 서버 (http://localhost:3000/tetris)

cd arkanoid-src && npm run build # 알카노이드 재빌드 → repo 루트 arkanoid/ 갱신
cd arkanoid-src && npm test      # 게임 로직 단위 테스트 (node --test, 47개)
cd arkanoid-src && npm run dev   # 알카노이드 개발 서버 (http://localhost:3000/arkanoid)
```

No test framework, no linter, no build system — **예외 3곳**: `moment/`(앨범, Vite), `tetris-src/`(테트리스, Next.js 정적 export + `node --test`), `arkanoid-src/`(알카노이드, 같음). 세 프로젝트 모두 산출물(`album/`·`tetris/`·`arkanoid/`)이 커밋되므로 소스를 고치면 재빌드해야 합니다. 나머지 repo는 여전히 빌드가 없습니다.

## Architecture

### Main page (`index.html`, ~1273 lines)
- Vanilla HTML/CSS/JS — no frameworks, no npm, no build
- CSS custom properties for all design tokens (see `:root` vars)
- Responsive: 메인+사이드바 2열 → 1열 at 768px
- Cards in order: Weather | Personal Todos | Family Todos
- Functions: `loadWeather()`, `loadFamilyTodos()`, `addTodo()` 등
- **주식/뉴스 카드 제거됨** — `data.json` 미사용 (레거시)

### Data pipeline (레거시 — 프론트 미사용)
```
fetch.py (stdlib only) → data.json
```
- **주의**: `index.html`이 더 이상 `data.json`을 소비하지 않음 (주식/뉴스 카드 제거). `fetch.py`는 보관/재개발용.
- `data.json`은 **커밋하지 않음** (2026-09-16 추적 해제, `.gitignore` 등록) — 생성물인데 읽는 코드가 없습니다.
- `fetch.py` uses `urllib`, `json`, `re`, `html` — no pip
- Stocks: Naver Finance API `https://m.stock.naver.com/api/stock/{ticker}/basic`
- News: Hankyung RSS (`economy`, `international`, `it`, `society`)
- CI `.github/workflows/update-stocks.yml` — **제거됨** (주기 갱신 중단)

### Stock ticker sync (레거시)
Tickers are defined only in `fetch.py` — `tickers = [...]`. (`index.html`의 `STOCKS` 배열은 주식 카드 제거로 삭제됨)

### Auth (Supabase email/password)
- Supabase Auth 이메일/비밀번호 로그인 — 고정 이메일 `dwkim1492@gmail.com`
- supabase-js v2 CDN 로드, `index.html`에 `SUPABASE_URL`/`SUPABASE_KEY` 인라인
- 가족 할일: 로그인 후 Supabase `todos` 테이블 사용 (RLS: authenticated)
- 로그인 상태: `onAuthStateChange`/`getSession` → `applyAuthState` → `isAuthed`

### Album SPA (`moment/` → `album/`)
- **빌드가 있는 세 곳 중 하나** (나머지는 `tetris-src/`·`arkanoid-src/`). Vite + React 19 + react-router 7 + @supabase/supabase-js v2
- `moment/vite.config.js`: `base: "/album/"`, `build.outDir: "../album"`, `emptyOutDir: true`
- 소스 수정 후 **반드시** `cd moment && npm run build` → `album/` 재생성 → 커밋 (Vercel은 빌드하지 않음)
- 홈페이지와 **같은 Supabase 프로젝트**를 쓰며, 같은 origin이라 로그인 세션이 자동 공유됨
- 홈페이지 바로가기 타일: `index.html`의 `data-link="/album"` (끝 슬래시 없음 — `trailingSlash: false`)

## Streamlit apps

All Streamlit apps follow the same pattern:
1. `st.set_page_config()` + custom `<style>` block hiding Streamlit chrome
2. Game logic: full HTML/JS/CSS inside a Python triple-quoted string
3. Rendered via `streamlit.components.v1.html(GAME_HTML, height=...)`
4. Sound files: `sound/*.mp3`, loaded as base64 data URIs

### Sound embedding pattern
```python
def sound_b64(name):
    with open(f'sound/{name}.mp3', 'rb') as f:
        return base64.b64encode(f.read()).decode()
```
Available sounds: `break.mp3`, `change.mp3`, `drop.mp3`, `swipe.mp3`

### Existing apps
| File | What |
|------|------|
| `index.html` | Main start page (~1273 lines, vanilla) |
| `tetris_streamlit.py` | Tetris game — **보관용**. 실제 서빙은 `tetris-src/` → `tetris/` (`/tetris`) |
| `arkanoid_streamlit.py` | Arkanoid game — **보관용**. 실제 서빙은 `arkanoid-src/` → `arkanoid/` (`/arkanoid`) |
| `chatbot_app.py` | 챗봇 — **보관용**. 실제 서빙은 `api/chat.js` + `chat/` (`/chat` 경로) |
| `ocr_app.py` | OCR 텍스트 추출 (Naver Clova OCR + 번역) |
| `voca/` | 영단어 학습 (Google Sheets + DeepSeek) |
| `moment/` → `album/` | 앨범 — 사진 게시판 SPA. 소스는 `moment/`, 서빙되는 빌드 산출물은 `album/` (`/album` 경로) |
| `tetris-src/` → `tetris/` | 테트리스 — Next.js 정적 export. 소스는 `tetris-src/`, 서빙되는 빌드 산출물은 `tetris/` (`/tetris` 경로) |
| `arkanoid-src/` → `arkanoid/` | 알카노이드 — Next.js 정적 export. 소스는 `arkanoid-src/`, 서빙되는 빌드 산출물은 `arkanoid/` (`/arkanoid` 경로) |
| `api/chat.js` + `chat/` | 챗봇(미키) — Vercel 함수 + 정적 UI (`/chat` 경로) |

## Vercel Functions

`api/chat.js` 는 이 저장소의 **유일한 서버 함수**입니다 (2026-09-21 추가).

- `vercel.json` 이 `framework: null` + `outputDirectory: "."` 인 정적 배포지만, **`api/` 디렉터리는 함께 빌드됩니다** (로컬 `vercel dev` 로 확인). 정적 사이트와 충돌하지 않습니다.
- 라우팅: `api/chat.js` → `/api/chat`. 파일마다 별도 함수가 됩니다.
- 형식: `export default { async fetch(request) {...} }` (Vercel 의 `framework=other` 규약).
- `.vercelignore` 의 `*.py` 는 **하위 모든 깊이에 적용**되므로 파이썬으로 함수를 쓰면 조용히 누락됩니다. JS 는 해당 없음.
- 문서 참고: <https://vercel.com/docs/functions/runtimes/python/api-directory>

## Server

```sh
python3 server.py              # starts on :8080
./start.sh                     # same, with start/stop
./start.sh --stop              # kills :8080
```

## Config files
- `.streamlit/config.toml` — headless mode, XSRF off
- `.devcontainer/devcontainer.json` — Codespaces, 홈페이지 정적 서버(`python3 server.py`)를 :8080 에서 실행
- `.env.local` (gitignored) — `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Next.js 마이그레이션 예약용, 정적 사이트 미사용)

## Memory
- `memory/user_preferences.md` — 커뮤니케이션 선호 (호칭 미사용, 존댓말)
- `memory/MEMORY.md` — memory index
