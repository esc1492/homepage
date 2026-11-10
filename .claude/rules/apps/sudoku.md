---
paths:
  - "sudoku/**"
---

# 스도쿠 — `/sudoku`

> 루트 `CLAUDE.md` 의 해당 절을 그대로 옮긴 상세 문서입니다. `paths` 에 매칭되는 파일을
> 열 때만 로드됩니다. 요약 카드는 루트 `CLAUDE.md` 에 있습니다.


클래식 스도쿠입니다. 서버·인증·빌드가 없습니다.

- **소스 = 서빙**: `sudoku/index.html`(UI) + `sudoku/core.mjs`(순수 로직). Next.js 산출물이 아니므로 **재빌드가 없습니다**
- **경로**: `https://homepage-dwkim.vercel.app/sudoku` (홈페이지 바로가기 '게임 → SUDOKU' 타일)

## sudoku.com 분석에서 가져온 것과 아닌 것

2026-10-25 에 sudoku.com 번들을 정적 분석해 모델을 확인했습니다.

- **가져온 것** — 81자 `mission`/`solution` 문자열('0'=빈칸), `{val, editable}` 셀, 81×9 메모 배열(`notes[cell][digit-1]`), 같은 숫자 재입력 시 지우기, 실수 3회·힌트 3회, 행/열/박스 중복 하이라이트, 타이머, 저장/복원, 난이도 6단계
- **가져오지 않은 것** — 퍼즐·정답은 원본에서 **서버가 내려줍니다**(`GET /api/v2/level/{difficulty}` → `{id, mission, solution, win_rate}`). 우리는 서버가 없으므로 **생성기와 유일해 보장을 직접 구현**했습니다
- ⚠️ **난이도는 "힌트 수"로만 정합니다** — 원본은 서버가 난이도를 책정합니다(풀이 기법 기준으로 보이나 확인하지 못했습니다). 우리 등급은 빈칸 수 기준이라 같은 난이도라도 체감이 다를 수 있습니다
- 원본의 killer 모드·daily·토너먼트·광고는 **범위 밖**입니다

## 설계 요점

- `sudoku/core.mjs` 는 **DOM·브라우저 API 를 import 하지 않습니다** — 게임 3종의 `game/*.js` 와 같은 원칙이라 `node --test` 로 그대로 검증됩니다
- **생성**: 무작위 완성 격자(MRV 백트래킹) → 칸을 무작위 순서로 비우며 **`countSolutions(..., 2) === 1` 일 때만 확정**. 유일해가 깨지는 제거는 되돌리므로 결과 퍼즐은 항상 해가 하나입니다
- **성능**: 전 난이도 실측 0.3~3.7ms (극한 24힌트 기준). 브라우저에서는 `requestAnimationFrame` 한 프레임 뒤 생성해 "만드는 중…" 문구가 먼저 그려집니다
- **실수 판정**: 입력값이 정답과 다르면 mistake, 중복은 conflict 로 **즉시** 표시합니다(원본의 `autoCheckMistakes` 기본값과 같습니다). 같은 숫자를 다시 누르면 지워지고 **실수는 줄지 않습니다** — 원본과 같습니다
- **메모**: 81개 Set. 정답을 맞히면 같은 행/열/박스의 메모에서 그 숫자를 지웁니다
- **저장**: `localStorage` 키 `sudoku-save` 하나에 puzzle·solution·values·notes·mistakes·hints·elapsedMs 를 담고, 새로고침하면 자동 복원합니다. 최고 기록은 `sudoku-best-<난이도>`(초). 홈페이지 `myTodos`·테트리스 `tetrisHighScore` 와 같은 평면 네이밍입니다
- **렌더**: 원본은 canvas 지만 여기서는 DOM 격자입니다 — 굵은 3×3 경계를 클래스로 주고, 접근성(버튼·aria-label)과 반응형이 그대로 따라옵니다
- SiteNav 는 `shared/sitenav.mjs` 한 벌을 씁니다. 로그인 아이콘은 `localStorage.loggedIn` 을 **읽기만** 합니다(게임 3종과 같은 방식)

## 테스트

```sh
node --test sudoku/core.test.mjs   # 10개: 유일해·힌트 수·결정론·중복 검출 등
npm test                            # 루트 전체에 포함
```
