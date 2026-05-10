# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Korean-language personal start page (시작 페이지) with weather, stock watchlist, news, and todo lists. Single HTML file (`index.html`) with inline CSS and vanilla JS. Data is fetched by a Python script and served via static `data.json`.

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

- **Single file**: `index.html` (~450 lines)
- **No framework, no build step** — pure HTML/CSS/JS
- **No external JS dependencies** — everything inline
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

## Todo Lists

- **Personal**: Stored in `localStorage` key `myTodos` — works offline
- **Family**: Uses Google Apps Script endpoint (`SCRIPT_URL`) — CRUD via `GET ?action=getAll` and `POST {action, text/id}`

## No Tests / No Lint / No CI Tests

This is a personal start page. No test framework, no linter config, no build system. Edit and open in browser directly.

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```markdown
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
