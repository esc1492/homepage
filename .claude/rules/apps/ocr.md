---
paths:
  - "ocr/**"
  - "api/ocr.js"
---

# OCR — `/ocr`

> 루트 `CLAUDE.md` 의 해당 절을 그대로 옮긴 상세 문서입니다. `paths` 에 매칭되는 파일을
> 열 때만 로드됩니다. 요약 카드는 루트 `CLAUDE.md` 에 있습니다.


Streamlit 판(`ocr_app.py`)을 Vercel 로 옮긴 것입니다 (2026-09-22). Streamlit 은 상시 구동 서버라 Vercel 에 올릴 수 없어 **UI 층을 다시 만들었습니다.**

- **서버**: `api/ocr.js` — `export default { async fetch(request) }`
- **UI**: `ocr/index.html` — 순수 HTML/CSS/JS. 빌드 도구 없음 → **재빌드 불필요**
- **경로**: `https://homepage-dwkim.vercel.app/ocr` (홈페이지 바로가기 'OCR' 타일 → 새 탭)
- `ocr_app.py` 는 **보관용**으로 남겨둡니다 (테트리스·알카노이드·챗봇의 `*_streamlit.py` 와 같은 선례)
- **Streamlit Cloud 앱은 2026-09-22 삭제했습니다** (챗봇과 같은 순서 — 이전·배포·프로덕션 검증이 끝난 뒤에 폐기). 이제 `https://homepage-5alru2tgbgnfk8wnmz2pux.streamlit.app` 은 `share.streamlit.io/errors/not_found` 로 넘어갑니다
  - **CLOVA OCR 도메인은 그대로 유지합니다** (2026-09-23 동완님 확인). 동완님 말씀으로는 **일정 사용량 이하면 과금되지 않으므로** 도메인을 남겨도 비용이 들지 않습니다 — 이 앱을 계속 쓰므로 유지가 맞습니다. 나중에 정말 안 쓰게 되면 NAVER 콘솔에서 정리하십시오

## 인터페이스

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

## 원본에서 바꾼 것 3가지

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

## 그대로 옮긴 것

- 줄 묶기(`ocr_app.py:139-178`) — 앞 단어와 세로로 25% 넘게 겹치면 같은 줄. **함수 안에** 있습니다 (응답을 순수 텍스트로 만들어 브라우저가 `boundingPoly` 를 몰라도 되게)
- 언어 판정(`ocr_app.py:206-208`) — 한글 비율 30% 초과면 ko→en
- 오류 3분기(HTTP / 네트워크 / 기타)

## ⚠️ 번역은 비공식 구글 엔드포인트입니다

`deep_translator` 는 파이썬 전용이라 쓸 수 없어, 같은 계열의 `translate.googleapis.com/translate_a/single` 을 함수에서 직접 부릅니다 (서버라 CORS 가 없습니다). 2026-09-22 실제 호출로 **응답 형식과 파싱을 확인**했습니다.

- **언제든 깨질 수 있습니다.** 원본도 같은 위험을 안고 있었으므로 이전이 위험을 키우지는 않았습니다
- 한 번에 보낼 수 있는 길이에 한계가 있어 `TRANSLATE_CHUNK`(1200자)로 줄 단위로 나눠 보냅니다. 이걸 빼면 긴 문서의 번역이 조용히 잘립니다
- 대안은 Google Cloud Translation(키·과금) 또는 이미 있는 DeepSeek 프록시 재사용입니다. 다만 LLM 을 쓰면 비용·지연이 붙고 결정성이 떨어집니다

## 환경변수

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `OCR_INVOKE_URL` | **필수** | CLOVA OCR 도메인의 Invoke URL. 로컬은 `.env.local`, 배포는 Vercel 환경변수 |
| `OCR_SECRET_KEY` | **필수** | CLOVA OCR Secret Key. **브라우저에 노출되면 안 됩니다** — 함수에만 둡니다 |

## ⚠️ 함정 (재발 방지)

1. **`.vercelignore` 의 `*.py` 때문에 파이썬 함수는 조용히 배포에서 빠집니다.** `api/ocr.py` 를 만들면 404 가 납니다. 그래서 **JS 로 썼습니다** — 예외 규칙(`!api/ocr.py`)을 뚫는 방법도 있지만 다음 사람이 또 밟습니다
2. `rewrites` destination 에 **`.html` 금지** (위 Deployment 절 참조). `/ocr` 은 `/ocr/index` 로 보냅니다
3. **로그인 게이트는 마크업이 선언합니다.** 인증이 필요한 `data-link` 항목에 `data-auth`를 붙이면 클릭 시 실제 세션(`window.session.getSession()`)을 확인하고 로그인 모달을 엽니다. URL 문자열 목록은 제거했으므로 링크를 추가할 때 목록을 고칠 필요가 없습니다. 이 게이트는 **UX 용이며 실제 보안 경계는 함수의 401** 입니다
4. 파일명은 `X-File-Name` 헤더로 보내므로 **`encodeURIComponent` 로 인코딩**해야 합니다. 헤더에 비ASCII 를 그대로 넣으면 예외가 납니다

## 보관용 `requirements.txt` 는 지우지 마십시오

루트 `requirements.txt`(streamlit·pymupdf·deep-translator·anthropic)는 보관용 `ocr_app.py`·`chatbot_app.py` 가 의존합니다. `pymupdf`·`deep-translator` 를 빼면 보관본이 재현 불가가 됩니다.
