---
paths:
  - "minesweeper-src/**"
  - "minesweeper/**"
---

# 지뢰찾기 — `/minesweeper`

> 루트 `CLAUDE.md` 의 해당 절을 그대로 옮긴 상세 문서입니다. `paths` 에 매칭되는 파일을
> 열 때만 로드됩니다. 요약 카드는 루트 `CLAUDE.md` 에 있습니다.


윈도우 95 클래식 스킨의 지뢰찾기입니다. 순수 클라이언트 사이드라 **백엔드·인증이 없습니다.**

- **소스**: `minesweeper-src/` (Next.js 16 + React 19, `output: 'export'`)
- **서빙**: `minesweeper/` — 빌드 산출물. Vercel은 빌드하지 않으므로 **이 폴더가 실제 배포본**
- **경로**: `https://homepage-dwkim.vercel.app/minesweeper` (홈페이지 바로가기 '게임 → MINESWEEPER' 타일 → 새 탭)

## 설계 요점

- **테트리스와 같은 골격** — `game/minesweeper.js` 는 React·DOM 을 import 하지 않는 순수 로직이라 `node --test` 로 그대로 검증됩니다. 상태는 불변 스냅샷이고 `reveal`/`toggleFlag`/`chord` 는 새 객체를 돌려주며, **입력이 무효하면 같은 참조를 그대로 돌려줍니다**(컴포넌트가 `setState` 를 건너뛸 수 있게).
- 다만 `useReducer` 대신 `useState` + 순수 함수 조합입니다 — 액션이 3개뿐이고 파생 상태가 없어 reducer 의 이점이 없습니다.
- **턴제라 프레임 루프가 없습니다** — 알카노이드의 ref + rAF 와 달리 React 스케줄러를 그대로 씁니다.
- **첫 클릭은 절대 안전합니다** — `placeMines` 가 클릭 칸과 그 8이웃에 지뢰를 두지 않습니다. 보드가 빽빽해 제외 구역을 다 비울 수 없으면(고급 30×16·99) 클릭 칸만 비웁니다.
- **chord** — 열린 숫자칸을 누르면 주변 깃발 수가 숫자와 같을 때 나머지 이웃을 엽니다. 깃발이 잘못 꽂혀 있으면 지뢰를 밟아 패배합니다.
- **터치에는 우클릭이 없습니다** — **길게 누르기(450ms)** 를 깃발로 씁니다. 발동 직후 따라오는 `click`/`contextmenu` 를 `pressFired` 로 한 번씩 삼킵니다. 없으면 한 번 눌러 깃발과 열기가 같이 동작합니다.
- **최고기록**은 `localStorage` 키 `minesweeper-best-<난이도>` (홈페이지 `myTodos`·테트리스 `tetrisHighScore` 와 같은 평면 네이밍). `localStorage` 는 브라우저 전용이라 **렌더 중에 읽지 않고 effect 에서** 읽습니다 — 서버 프리렌더에서 불일치가 생깁니다.
- 타이머는 첫 공개(playing 진입)에 시작해 승패에 멈춥니다.

## 파일 구조

| 경로 | 역할 |
| --- | --- |
| `game/minesweeper.js` | 순수 게임 로직 (React·DOM 미import) + RNG 주입 |
| `game/minesweeper.test.js` | 단위 테스트 17개 (`node --test`) |
| `components/MinesweeperGame.jsx` | 화면 전체 (Win95 창·메뉴·HUD·보드) |
| `app/globals.css` | Win95 스킨 |
| `app/layout.jsx` | `<title>Minesweeper</title>` |

## ⚠️ 빌드 산출물을 커밋하므로 소스 수정 시 재빌드 필수

```sh
cd minesweeper-src && npm test      # 순수 로직 단위 테스트 17개
cd minesweeper-src && npm run build # → repo 루트 minesweeper/ 갱신
```

**`minesweeper/`를 커밋하지 않으면 배포본이 소스와 어긋납니다.**

## ⚠️ `.vercelignore` 에 `minesweeper-src/` 를 빠뜨리지 마십시오

`tetris-src/`·`arkanoid-src/` 와 달리 처음에 제외 목록에 없어 **소스가 그대로 서빙되었습니다** (2026-10-08 확인 — `/minesweeper-src/game/minesweeper.js`·`package.json`·`next.config.mjs`·`app/page.jsx` 가 모두 200). 시크릿은 없었지만 배포 용량이 늘고 관례를 어깁니다.
