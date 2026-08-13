# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

- Always use polite/formal Korean (존댓말, 하십시오체) when responding to the user.
- Never use 반말 (informal speech). This rule persists across all sessions and context resets.

## Project Overview

Korean-language personal start page (시작 페이지) with weather, stock watchlist, news, and todo lists. Single HTML file (`index.html`) with inline CSS and vanilla JS. Data is fetched by a Python script and served via static `data.json`. Deployed on Vercel; login is Supabase email/password auth.

## Deployment

- Hosted on Vercel (project `homepage`, team `dwkim`) — static file deploy, no build step
- `vercel.json` sets `outputDirectory: "."` and serves `index.html` + `data.json`
- Production URL: https://homepage-dwkim.vercel.app

## Data Pipeline

```text
fetch.py (Python 3, no deps) → data.json ← index.html (fetch + render)
```

- `fetch.py` uses only `urllib`, `json`, `re`, `html` from stdlib — no pip install needed
- Run: `python3 fetch.py` (updates data.json with stocks + RSS news)
- Stocks come from Naver Finance API: `https://m.stock.naver.com/api/stock/{ticker}/basic`
- News comes from Hankyung RSS: `https://www.hankyung.com/feed/{category}`

  - Categories: `economy`, `international`, `it`, `society`
- Run on schedule via GitHub Actions (`.github/workflows/update-stocks.yml`):

  - Every 10min on weekdays during market hours (KST 09:00~15:30)
  - Manual trigger via `workflow_dispatch`

## Frontend Architecture

- **Single file**: `index.html` (~1200 lines)
- **No framework, no build step** — pure HTML/CSS/JS
- **One external JS dependency** — Supabase loaded from CDN (`@supabase/supabase-js@2`) for auth only
- Dark theme (CSS custom properties for consistent tokens)
- Responsive: 2-column layout on desktop, 1-column on mobile (768px breakpoint)

### Cards (in order)

| Card | Data Source | Key Function |
| --- | --- | --- |
| Weather | Open-Meteo API + Air Quality API | `loadWeather()` |
| Stock Watchlist | `data.json` → `stocks` | `loadStocks()` |
| General News | `data.json` → `news` (eco/world/local) or fallback | `loadNews('general')` |
| Tech News | `data.json` → `news` (tech) or fallback | `loadNews('tech')` |
| Personal Todos | `localStorage` | `myTodos` array |
| Family Todos | Google Sheets via Apps Script | `SCRIPT_URL` |

## Stock Watchlist

Modify in `index.html` — the `STOCKS` array at line ~233:

```js
var STOCKS=[
  {ticker:'005930',name:'삼성전자'},
  {ticker:'034020',name:'두산에너빌리티'},
  ...
];
```

Sync the same ticker list in `fetch.py` line ~35 (`tickers` array).

## Weather

- Open-Meteo (free, no API key): 7-day forecast + air quality
- Location: Seoul (hardcoded lat/lon)
- Weather code → icon/desc mapping in `loadWeather()`

## Auth / Login (Supabase)

Login modal authenticates via Supabase Auth (email/password):

- **Fixed email**: `dwkim1492@gmail.com` (hardcoded in `index.html`)
- Supabase JS loaded from CDN (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`)
- Supabase URL + publishable key hardcoded inline near the bottom of `index.html` (`SUPABASE_URL` / `SUPABASE_KEY`); publishable key is safe to expose client-side
- Login: `signInWithPassword({ email, password })` → sets `localStorage.loggedIn`, opens the Streamlit app in a new tab
- Logout: `signOut()` + removes `localStorage.loggedIn`

Note: `package.json` Supabase deps (`@supabase/supabase-js`, `@supabase/ssr`) and `.env.local` (`NEXT_PUBLIC_*`) are currently unused by the static site (CDN + inline config) — reserved for a planned Next.js migration.

## Todo Lists

- **Personal**: Stored in `localStorage` key `myTodos` — works offline
- **Family**: Uses Google Apps Script endpoint (`SCRIPT_URL`) — CRUD via `GET ?action=getAll` and `POST {action, text/id}`. Now requires Supabase login: the frontend sends the access token (JWT), and the backend (`family-todos.gs`) verifies it via Supabase `/auth/v1/user` before allowing access.

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

