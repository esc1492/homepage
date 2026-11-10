---
paths:
  - "tetris-src/**"
  - "tetris/**"
---

# 테트리스 — `/tetris`

> 루트 `CLAUDE.md` 의 해당 절을 그대로 옮긴 상세 문서입니다. `paths` 에 매칭되는 파일을
> 열 때만 로드됩니다. 요약 카드는 루트 `CLAUDE.md` 에 있습니다.


Streamlit 앱(`tetris_streamlit.py`)을 Next.js 정적 export 로 옮긴 것입니다.

- **소스**: `tetris-src/` (Next.js 16 + React 19, `output: 'export'`)
- **서빙**: `tetris/` — 빌드 산출물. Vercel은 빌드하지 않으므로 **이 폴더가 실제 배포본**
- **경로**: `https://homepage-dwkim.vercel.app/tetris` (홈페이지 바로가기 '게임 → TETRIS' 타일 → 새 탭)
- **인증·백엔드 없음** — 완전한 클라이언트 사이드 게임

## ⚠️ 소스 폴더명이 `tetris-src` 인 이유

`next.config.mjs`의 `basePath: '/tetris'` 와 **서빙 폴더명이 반드시 일치**해야 합니다.
Next.js는 자산을 `/tetris/_next/...` 로 참조하므로, 산출물이 `tetris/` 가 아니면 전부 404가 됩니다.
소스와 산출물을 같은 폴더에 둘 수 없어(빌드 시 덮어씀) `moment/` → `album/` 과 같은 방식으로 이름을 분리했습니다.

## 구조

| 경로 | 역할 |
| --- | --- |
| `game/constants.js` | 보드 크기·색·테트로미노·속도 공식 |
| `game/reducer.js` | **순수 게임 로직** (React 미import — 그대로 테스트 가능) |
| `game/reducer.test.js` | 게임 로직 단위 테스트 21개 (`node --test`) |
| `game/render.js` | Canvas 그리기 (`(ctx, state)` 순수 함수) + DPR 보정 |
| `hooks/` | `useGameLoop`(rAF) · `useKeyboard` · `useSwipe` · `useAudio` · `useHighScore` |
| `hooks/useHighScore.test.js` | 저장값 파싱 테스트 3개 |
| `components/TetrisGame.jsx` | 오케스트레이터 |

## 설계 요점

- **상태**: `useState` + 순수 `reduceWithEvents` 가 단일 진실 공급원입니다. reducer 는 `{ state, events }` 를 돌려주고 컴포넌트가 이벤트를 사운드로 매핑합니다. 하강 간격은 `max(80, 800-(level-1)*70)` ms 라 최대 초당 12.5회만 dispatch 됩니다. 60fps는 **그리기에만** 해당하며 rAF 루프가 ref로 명령형 호출합니다(React 렌더 우회).
- **`setInterval` 대신 rAF**: 백그라운드 탭에서 자동 정지, 드리프트 없음. 단 `ts - lastT` 가 커지면 하강이 폭주하므로 `MAX_FRAME_DELTA_MS = 200` 으로 자릅니다.
- **오디오**: 테마곡은 96kbps·2.1MB로 재인코딩해 `public/audio/` 에 두고 `preload="none"` + '시작' 클릭 시 로드. 효과음 4개는 합계 30KB. 효과음은 **소리마다 보이스 4개 풀**을 돌려 연타 시 앞 소리가 잘리지 않게 합니다(`VOICES_PER_SOUND`). 트리거는 reducer 의 events(`lock`·`clear`·`rotate`·`over`)이고, 컴포넌트는 상태를 diff 하지 않습니다 — **실패한 회전은 이벤트가 없어 소리도 나지 않습니다**.
- **최고점수**: `localStorage` 키 `tetrisHighScore` (홈페이지의 `myTodos`·`loggedIn` 과 같은 평면 네이밍). 현재 점수가 기록을 넘는 순간 저장하므로 게임오버를 기다리지 않습니다. `localStorage` 는 브라우저 전용이라 **렌더 중에 읽지 않고 effect 에서** 읽습니다 — 서버 프리렌더에서 `ReferenceError` 가 나거나 하이드레이션 불일치가 생깁니다.

## ⚠️ 변환 시 걸린 함정 (재발 방지)

1. **SSR**: `document`·`canvas.getContext`·`new Audio()`·`requestAnimationFrame` 은 서버에 없습니다. `'use client'` + 반드시 `useEffect` 안에서.
2. **React의 passive 터치 리스너**: React 17+ 는 `touchstart`/`touchmove`/`wheel` 을 루트에 passive로 등록하므로 `onTouchStart` 안의 `preventDefault()` 가 먹지 않습니다. 스와이프·조작 버튼은 **네이티브 리스너(`{passive:false}`)** 로 붙여야 하며, 아니면 한 번 눌러 두 번 동작합니다.
3. **basePath는 문자열 URL에 자동 적용되지 않습니다**: `new Audio('/audio/x.mp3')` 는 404. `process.env.NEXT_PUBLIC_BASE_PATH` 를 붙여야 합니다.
4. **StrictMode 이중 마운트**: 개발 모드에서 effect가 두 번 실행되어 rAF 루프·Audio 객체가 2개 생깁니다. cleanup에서 `cancelAnimationFrame` 필수.
5. `rewrites` destination에 **`.html` 금지** (위 Deployment 절 참조).

## ⚠️ 빌드 산출물을 커밋하므로 소스 수정 시 재빌드 필수

```sh
cd tetris-src && npm test      # 순수 로직 단위 테스트
cd tetris-src && npm run build # → repo 루트 tetris/ 갱신 (next build && cp -R out ../tetris)
```

**`tetris/`을 커밋하지 않으면 배포본이 소스와 어긋납니다.**

`tetris_streamlit.py` 는 **보관용으로 남겨둡니다**(`arkanoid_streamlit.py`·`family-todos.gs` 와 같은 선례). Streamlit Cloud 앱은 별도로 살아 있습니다.
