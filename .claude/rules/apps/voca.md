---
paths:
  - "voca/**"
  - "api/voca.js"
---

# VOCA (영단어) — `/voca`

> 루트 `CLAUDE.md` 의 해당 절을 그대로 옮긴 상세 문서입니다. `paths` 에 매칭되는 파일을
> 열 때만 로드됩니다. 요약 카드는 루트 `CLAUDE.md` 에 있습니다.


Streamlit 판(`voca/app.py` 412줄 + `auth.py` + `sheets.py`)을 Vercel 로 옮긴 것입니다 (2026-09-23). Streamlit 은 상시 구동 서버라 Vercel 에 올릴 수 없어 **UI 층을 다시 만들었습니다.**

- **서버**: `api/voca.js` — `export default { async fetch(request) }`
- **UI**: `voca/index.html` — 순수 HTML/CSS/JS. 빌드 도구 없음 → **재빌드 불필요**
- **경로**: `https://homepage-dwkim.vercel.app/voca` (홈페이지 바로가기 '학습 → 영단어' 타일 → 새 탭)
- `voca/*.py` 는 **보관용**으로 남겨둡니다 (테트리스·알카노이드·챗봇·OCR 의 `*_streamlit.py` 와 같은 선례)
- **Streamlit Cloud 앱은 2026-09-23 삭제했습니다** (이전·배포·프로덕션 검증 뒤에 폐기 — 챗봇·OCR 과 같은 순서). 이제 `https://homepage-3yhnryaak9uzgxrkmedepf.streamlit.app` 은 `share.streamlit.io/errors/not_found` 로 넘어갑니다

## ⚠️ 다른 앱과 달리 "쓰기" 앱입니다 — 인증이 곧 보안 경계

OCR 은 읽기 전용이라 최악이 비용이었지만, VOCA 는 동완님의 **실제 구글 시트를 수정·삭제**합니다. 그래서 겹을 둘 더 두었습니다.

- **이메일 허용목록**(`VOCA_ALLOWED_EMAILS`) — 서비스 계정에 시트 쓰기 권한이 있으므로, Supabase 토큰만 확인하면 **앨범 회원가입으로 만들어진 다른 계정**도 시트를 읽고 고칠 수 있습니다 (2026-09-23 기준 계정 2개). 허용목록이 비면 **전부 거부**합니다 (fail-closed)
- **스프레드시트 ID 허용목록**(`VOCA_SHEET_IDS`) — 없으면 이 함수가 "서비스 계정이 닿을 수 있는 아무 시트나 조작하는 프록시"가 됩니다

## 인터페이스

```text
GET  /api/voca?sheet=<url>            → { sheets: [...] }
GET  /api/voca?sheet=<url>&ws=<name>  → { values: [[...]] }    (0행 = 헤더)
POST /api/voca?sheet=<url>&ws=<name>  → { applied: {...} }     본문 = { ops: [...] }
POST /api/voca?extract=1              → { words: [...] }       본문 = 텍스트
```

`ops` 는 넷입니다 — `createSheet`(title·headers, 이름이 중복이면 409) · `update`(cells `[{row, col, value}]`, 1-based) · `delete`(rows, 순서 무관) · `append`(rows). 서버가 **고정 순서**로 적용합니다: `createSheet` → `delete`(내림차순) → `update` → `append`. 원본의 탭별 처리 순서와 같습니다 (탭 2 는 삭제 먼저, 추가 나중).

## 원본에서 바꾼 것

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

## 그대로 옮긴 것

- **셀 diff** — 바뀐 셀만 씁니다. 빈 셀과 빈 셀은 "변경 없음"으로 봅니다
- **삭제 인덱스** — 1-based 시트 행 번호이고 **큰 행부터** 지웁니다 (작은 행을 먼저 지우면 뒤가 밀려 엉뚱한 행이 지워집니다)
- **`valueInputOption`** — 셀 수정·헤더 쓰기는 gspread `update(raw=True)` 이므로 `RAW`, 행 추가는 `sheets.py` 가 `USER_ENTERED` 를 명시하므로 `USER_ENTERED`. `RAW` 는 `3/4` 를 문자열로, `USER_ENTERED` 는 날짜로 해석합니다
- **`append` 에 `insertDataOption` 을 보내지 않음** — 원본(gspread `append_row`)도 안 보내 API 기본값 `OVERWRITE` 로 동작했습니다
- **탭 3(학습)은 시트에 아무것도 쓰지 않습니다** — 가리기와 체크박스는 화면 상태입니다
- **단어 추출 프롬프트는 `app.py` 것을 그대로** 옮겼습니다. 응답에 `thinking` 블록이 먼저 오므로 `text` 블록만 뽑습니다 (실측 확인)

## 환경변수

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `VOCA_SA_B64` | **필수** | 서비스 계정 JSON 의 **base64 한 줄**. 로컬은 `.env.local`, 배포는 Vercel 환경변수 |
| `VOCA_SHEET_IDS` | **필수** | 허용 스프레드시트 ID (쉼표 구분) |
| `VOCA_ALLOWED_EMAILS` | **필수** | 허용 이메일 (쉼표 구분). **미설정 시 전부 거부** |
| `ANTHROPIC_API_KEY` | 재사용 | 챗봇이 이미 쓰는 값 — 추출에 새 시크릿이 필요 없습니다 |

- base64 는 **따옴표가 필요 없어** `.env.local` 에 한 줄로 그대로 들어갑니다 — 2026-09-22 의 "따옴표째 Vercel 에 등록" 사고를 구조적으로 막습니다
- Vercel 한도는 **프로젝트 전체 64KB** 입니다 (키가 약 3.2KB 이므로 여유가 큽니다)

## ⚠️ 함정 (재발 방지)

1. **`.vercelignore` 의 `*.py` 때문에 파이썬 함수는 조용히 배포에서 빠집니다** — OCR 과 같은 이유로 JS 로 썼습니다
2. `rewrites` destination 에 **`.html` 금지**. `/voca` 는 `/voca/index` 로 보냅니다
3. **로그인 게이트는 마크업이 선언합니다.** 인증이 필요한 `data-link` 항목에 `data-auth`를 붙이면 클릭 시 실제 세션(`window.session.getSession()`)을 확인하고 로그인 모달을 엽니다. URL 문자열 목록은 제거했습니다. 이 게이트는 **UX 용이며 실제 보안 경계는 함수의 401/403** 입니다
4. **없는 경로가 200 으로 보입니다** (위 Deployment 절) — 배포 포함 여부는 상태 코드가 아니라 본문으로 확인하십시오

## 보관용 Streamlit 판 (`voca/`)

`voca/app.py`·`auth.py`·`sheets.py` 는 **보관용**입니다. 로컬 실행:

```sh
cd voca && .venv/bin/streamlit run app.py
```

가상환경은 **`voca/.venv`** 하나만 씁니다 (`voca/venv` 를 새로 만들지 마십시오 — 과거에 둘이 공존해 혼란을 빚었습니다). 없으면 `cd voca && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`.

- **서비스 계정 키의 로컬 사본은 `voca/.streamlit/secrets.toml` 의 `p1`~`p40`(base64 80자 청크)과 `.env.local` 의 `VOCA_SA_B64` 입니다.** 둘 다 gitignore 되어 있고 원본은 GCP Console 에 있습니다. `VOCA_SA_B64` 는 **`p1`~`p40` 을 그대로 이어 붙인 값**이라 재발급 없이 복원됩니다 (2026-09-23 확인)
  - 청크를 다시 만들려면: `base64 -i service-account.json | python3 -c "import sys; b=sys.stdin.read().strip(); [print(f'p{i+1} = \"{b[i:i+80]}\"') for i in range(0, len(b), 80)]"`
- 서비스 계정은 시트와 공유되어 있어야 합니다 (시트 우상단 공유 → 서비스 계정 이메일을 편집자로 추가)
- `private_key` 줄바꿈 문제를 피하려고 base64 를 씁니다. TOML 멀티라인 문자열보다 짧은 여러 키가 안정적입니다
