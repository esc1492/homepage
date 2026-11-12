---
paths:
  - "lode-runner/**"
---

# 로드 러너 — `/lode-runner`

> 루트 `CLAUDE.md` 의 해당 절을 그대로 옮긴 상세 문서입니다. `paths` 에 매칭되는 파일을
> 열 때만 로드됩니다. 요약 카드는 루트 `CLAUDE.md` 에 있습니다.

C64 판 Lode Runner(1983, Brøderbund)를 분석해 재현한 클라이언트 사이드 게임입니다.
서버·인증·빌드가 없습니다.

- **소스 = 서빙**: `lode-runner/index.html`(UI) + `lode-runner/core.mjs`(순수 로직) + `lode-runner/levels/levels.json`.
  Next.js 산출물이 아니므로 **재빌드가 없습니다**
- **경로**: `https://homepage-dwkim.vercel.app/lode-runner` (홈페이지 바로가기 '게임 → LODE RUNNER' 타일)
- ⚠️ 자산은 **절대 경로**로 참조합니다(`/lode-runner/core.mjs`, `/lode-runner/levels/levels.json`).
  `cleanUrls` + rewrite 로 브라우저 URL 이 `/lode-runner`(슬래시 없음)일 때 상대 경로는 루트로 풀립니다

## 레벨 데이터의 출처

2026-11-12 에 ClassicReload 의 C64 에뮬레이터를 정적·런타임으로 분석해 추출했습니다 (REA CLI 헤드리스).

- ClassicReload 의 Lode Runner 는 Thomas Hochgoetz C64 에뮬레이터(Emscripten asm.js) 위에서 돌아갑니다.
  `.cbin` 스냅샷은 `[CS]` magic + 버전 + 64KB RAM + 상태 꼬리 + 내장 1541 D64 로 구성됩니다
- 보드 세트는 **`$6000` 부터 17개 × 256바이트**(224바이트 니블 패킹 28×16 + 여유). 타일 코드 0–9 는
  Lemon64 문서(`https://www.lemon64.com/doc/lode-runner/650`)의 편집기 코드와 같습니다
  (1 diggable · 2 solid · 3 ladder · 4 bar · 5 trapdoor · 6 hidden ladder · 7 gold · 8 enemy · 9 player)
- 최초 분석은 복호화 스텁 6502 에뮬레이션으로 접근했다가, 실제로는 실행 중 RAM 을
  `_js_SaveSnapshot(0)` 으로 떠서 읽는 쪽이 정확했습니다 — 정적 스냅샷 사본은 복호화 전 상태입니다
- `lode-runner/levels/levelNN.png`·`levelNN.txt`·`set-6000-7100.bin` 은 **분석 산출물**입니다.
  게임은 `levels.json` 만 읽고, 나머지는 `.vercelignore` 로 배포에서 제외합니다

## 설계 요점

- `lode-runner/core.mjs` 는 **DOM·브라우저 API 를 import 하지 않습니다** — 게임 3종의 `game/*.js`·`sudoku/core.mjs` 와 같은 원칙이라 `node --test` 로 그대로 검증됩니다
- **렌더**: canvas 224×128(28×16 × 8px), `image-rendering: pixelated`. 타일·주인공·경비병은 8×8 픽셀 아트로 직접 그립니다
- **이동**: 격자 단위 이동 + `requestAnimationFrame` 누적 시간. 속도 상수는 `SPEED`(walk 160 · climb 190 · fall 100 · guard 200 ms/칸)입니다. 처음 값보다 느리게 조정해 원판 체감에 맞췄습니다
- **파기**: `U`/`O` 로 좌·우 아래 벽을 팝니다. 입력은 한 프레임만 유지되므로 `Game.pendingDig` 이 250ms 동안 받아 둡니다. 구멍은 5.2초 뒤 메워지고, 그때 구멍 안의 경비병은 죽고(+75) 주인공은 죽습니다
- **경비병**: BFS 로 주인공을 추격합니다. 구멍에 빠지면 2초 뒤 위로 기어 나옵니다
- ⚠️ **구멍 위를 지나갈 수 있는 조건**: 바로 아래가 구멍이어도 **그 구멍에 경비병이 빠져 있으면** 딛고 지나갑니다(`supportedAt`). 이 규칙이 없으면 경비병을 가둔 뒤 함께 빠집니다
- **시작·일시정지**: 처음에는 `C` 를 눌러야 시작합니다(원판과 같음). 일시정지는 **원판에 있던 기능**입니다(RUN/STOP). 여기서는 `P` 입니다
- **완료 조건**: 금을 모두 모으면 숨은 사다리(`HIDDEN`)가 드러나고, 맨 윗줄에 닿으면 레벨 클리어(+1500). 17개 레벨을 차례로 진행합니다
- 점수: 금 250 · 경비병 75 · 레벨 1500. 최고 점수는 `localStorage` 키 `lodeRunnerHigh`
- SiteNav 는 `shared/sitenav.mjs` 한 벌을 씁니다. 로그인 아이콘은 `localStorage.loggedIn` 을 **읽기만** 합니다
- 키: `← →` 이동 · `↑ ↓` 사다리 · `U`/`Z` 왼쪽 파기 · `O`/`X` 오른쪽 파기 · `C` 시작 · `P` 일시정지.
  `I J K L` 도 이동에 매핑되어 있습니다(원판 키 배열). 모바일은 화면 아래 터치 버튼입니다

## 테스트

```sh
node --test lode-runner/core.test.mjs   # 11개: 파기·구멍·추격·숨은 사다리·완료 등
npm test                                 # 루트 전체에 포함
```
