# ADR-0006: 위험한 순수 로직은 `*-core.mjs`로 꺼내 영구 테스트한다

- **상태**: Accepted (2026-10-18)
- **관련**: ADR-0005, `GLOSSARY.md`, `CLAUDE.md`의 「서버 공유 seam」

## 맥락

`api/*.js` 안에 “조용히 틀리면 그럴듯한 잘못된 결과가 나오는” 순수 로직이 file-private으로
들어 있었습니다.

- OCR: 줄 묶기(세로 겹침 25%), 언어 판정(한글 30%), 번역 청크 나누기, 헤더 디코딩.
- VOCA: 시트 ID 추출, A1 제목 인용, 열 문자 변환, 행 정규화, op 고정 순서, 셀 좌표 검증,
  삭제 행 내림차순.
- Chat: SSE 이벤트 → 텍스트 델타.

이 로직들은 `globalThis.fetch`를 가로채는 **일회성 하네스**로만 검증되었고, 하네스는 삭제되어
저장소에 남지 않았습니다 (`CLAUDE.md`가 이 관례를 기록하고 있었습니다). 그 결과 회귀를 잡을
영구적인 표면이 없었습니다.

## 결정

1. 순수 로직을 **`server/chat-core.mjs`·`server/ocr-core.mjs`·`server/voca-core.mjs`** 로 옮기고
   export 합니다.
2. handler 는 core 를 **import 해서 호출만** 합니다.
3. 이동은 **동작을 바꾸지 않는 그대로 옮기기**입니다. 예외 계약(400·403·404·409)도 유지합니다.
4. `server/voca-core.mjs` 는 `HttpError` 를 그대로 던집니다 — 상태·메시지만 가진 Error 이고 I/O 가 없습니다.
5. 테스트는 `server/*-core.test.mjs` 에 둡니다.
6. **upstream 전송(CLOVA·Google·DeepSeek fetch)은 옮기지 않습니다.** 이번 범위 결정입니다.

## 근거

- **interface 가 곧 테스트 표면입니다.** `groupLines(fields)`·`orderOps(ops)`·`textFromEvent(raw)` 는
  네트워크 없이 입력→출력으로 검증됩니다.
- **삭제 테스트:** core 를 지우면 휴리스틱이 handler 로 흩어집니다. 지금은 핵심이 한 module 에 모입니다.
- **동작 보존이 우선입니다.** 함수를 그대로 옮기고 export 만 붙였습니다. 기존 quirks 도 유지합니다
  (예: 한 줄이 1200자를 넘으면 그 줄만으로 청크가 될 수 있음).
- **전송까지 섞으면 테스트가 무거워집니다.** CLOVA·Google·DeepSeek 의 요청 조립은 handler 에 두고,
  순수한 부분만 꺼내는 것이 이번 목적에 맞습니다.

## 결과

- `api/ocr.js`·`api/voca.js`·`api/chat.js` 에서 순수 함수 정의가 사라졌습니다.
- 루트 테스트는 48개입니다 (shared 7 + server 41).
- OCR·VOCA 의 위험한 휴리스틱에 회귀 테스트가 생겼습니다.
- 전송 계층은 여전히 일회성 하네스/배포 확인으로 검증합니다.
- `yRange`·`groupLines` 처럼 `extractText` 내부에서 쓰이는 함수도 export 합니다 — 조합과 테스트를 위해서입니다.
