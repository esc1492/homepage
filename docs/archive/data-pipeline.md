# Data Pipeline (레거시) — 보관

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
