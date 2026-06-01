# AGENTS

Address the user as **동완님**. The user's name is stored in `memory/user_preferences.md`.

## What this repo is

Korean personal start page (`index.html`). Plus a few standalone Streamlit apps.

## Key commands

```sh
python3 fetch.py              # fetch stocks + news → data.json
python3 -m http.server 8080   # serve index.html locally
streamlit run tetris_streamlit.py
streamlit run arkanoid_streamlit.py
streamlit run chatbot_app.py
```

No test framework, no linter, no build system.

## Architecture

### Main page (`index.html`, ~1336 lines)
- Vanilla HTML/CSS/JS — no frameworks, no npm, no build
- CSS custom properties for all design tokens (see `:root` vars)
- Responsive: 2-column → 1-column at 768px
- Cards in order: Weather | Stocks | General News | Tech News | Personal Todos | Family Todos
- Functions: `loadWeather()`, `loadStocks()`, `loadNews('general')`, `loadNews('tech')`

### Data pipeline
```
fetch.py (stdlib only) → data.json ← index.html (fetch + render)
```
- `fetch.py` uses `urllib`, `json`, `re`, `html` — no pip
- Stocks: Naver Finance API `https://m.stock.naver.com/api/stock/{ticker}/basic`
- News: Hankyung RSS (`economy`, `international`, `it`, `society`)
- CI `.github/workflows/update-stocks.yml`: every 10min weekdays KST 09:00-15:30, auto-commits `data.json`

### Stock ticker sync
Tickers must match in two places:
- `index.html:1065` — `var STOCKS=[...]`
- `fetch.py:86` — `tickers = [...]`

Add/remove stocks in both files together.

### Auth
- Password in `.env`: `LOGIN_PASSWORD="..."` (gitignored)
- `fetch.py` hashes it with SHA-256 → stored in `data.json`
- `index.html` checks hash client-side

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
| `index.html` | Main start page (~1336 lines, vanilla) |
| `tetris_streamlit.py` | Tetris game |
| `arkanoid_streamlit.py` | Arkanoid game |
| `chatbot_app.py` | Chatbot using Anthropic SDK + web_search tool |

## Server

```sh
python3 server.py              # starts on :8080
./start.sh                     # same, with start/stop
./start.sh --stop              # kills :8080
```

## Config files
- `.streamlit/config.toml` — headless mode, XSRF off
- `.devcontainer/devcontainer.json` — Codespaces, defaults to Tetris on port 8501
- `.env` (gitignored) — `LOGIN_PASSWORD` only

## Memory
- `memory/user_preferences.md` — user's name preference
- `memory/MEMORY.md` — memory index
