---
paths:
  - "arkanoid-src/**"
  - "arkanoid/**"
---

# 알카노이드 — `/arkanoid`

> 루트 `CLAUDE.md` 의 해당 절을 그대로 옮긴 상세 문서입니다. `paths` 에 매칭되는 파일을
> 열 때만 로드됩니다. 요약 카드는 루트 `CLAUDE.md` 에 있습니다.


`arkanoid_streamlit.py` 를 Next.js 정적 export 로 옮긴 것입니다.

- **소스**: `arkanoid-src/` (Next.js 16 + React 19, `output: 'export'`)
- **서빙**: `arkanoid/` — 빌드 산출물. Vercel은 빌드하지 않으므로 **이 폴더가 실제 배포본**
- **경로**: `https://homepage-dwkim.vercel.app/arkanoid` (홈페이지 바로가기 '게임 → ARKANOID' 타일 → 새 탭)

## ⚠️ 원본은 파이썬 게임이 아니었습니다

`arkanoid_streamlit.py`(927행)는 **게임을 담은 HTML 문자열을 띄우는 ~20줄짜리 호스트**입니다. 게임
전체(입력·물리·렌더·오디오)가 `GAME_HTML_TEMPLATE` 안의 순수 JS이고 `st.session_state`·rerun 루프·
`time.sleep`·서버 상태가 전혀 없습니다. 그래서 이 작업은 **Python 포팅이 아니라 JS → React 포팅**이며,
물리·레벨·그리기는 원본 코드를 거의 그대로 옮긴 것입니다.

## 설계 요점 (테트리스와 다른 부분)

| 항목 | 테트리스 | 알카노이드 | 이유 |
| --- | --- | --- | --- |
| 상태 | `useState` + `reduceWithEvents` (순수) | **ref 안의 가변 월드** | 입력이 이산적이지 않습니다 — 패들이 손가락을 초당 60회 따라가고 공도 매 틱 움직입니다. HUD·오버레이·점수·목숨이 전부 캔버스에 그려지므로(`drawHUD` 가 목숨을 미니 패들로 그림) 매 프레임 React 가 다시 그릴 것이 없고, 상태가 커서 60Hz 로 복사할 이유도 없습니다 |
| 부수효과 | `reduceWithEvents` 가 **`{state, events}` 반환** | `stepWorld` 가 **events 배열 반환** | 두 게임 모두 이벤트를 데이터로 돌려줍니다. diff 추론보다 정확하고 순서가 보존됩니다 |
| 시간 | `MAX_FRAME_DELTA_MS = 200` | **`MAX_TICKS_PER_FRAME × TICK_MS` = 83.3ms (파생)** | 200ms 를 그대로 쓰면 16.667ms 틱에서 12틱이 한 프레임에 몰려, 라운드 5에서 공이 최대 71px 을 순간이동해 브릭(높이 16px)과 패들을 통과합니다 |
| 루프 | `if (acc >= interval)` | **`while`** | 30fps 화면에서도 60Hz 시뮬레이션을 유지하려면 프레임당 여러 틱이 필요합니다 |
| 터치 | `useSwipe`(이산 제스처) | **`usePointer`(Pointer Events)** | 알카노이드는 절대 위치 연속 드래그라 제스처 판정이 아닙니다 |

- **RNG 주입**: `createWorld({ rng })`. 상수 RNG 로 "가드가 걸린 것"과 "주사위가 안 굴러간 것"을
  구분합니다 — `dropItem` 이 `maxHp !== 1` 로 거르는지, 12% 확률로 거르는지를 따로 검증합니다.
- **`setTimeout` 2개를 틱 카운터로** 바꿨습니다(800ms→48틱, 1200ms→72틱). 언마운트 뒤에 발화하는
  타이머가 **구조적으로 불가능**해지고, 일시정지에도 맞습니다.
- `game/` 은 테트리스처럼 **React·DOM 을 import 하지 않습니다** (`node --test` 47개).

## ⚠️ 변환 시 걸린 함정 (재발 방지)

1. **DPR 좌표 환산** — 원본은 `bc.width / rect.width` 로 환산했는데, 그건 `width` 속성이 논리 크기(400)라서 맞는 식이었습니다. 이 포트는 `setupCanvas` 가 `canvas.width = cssW * dpr` 로 백킹 스토어를 키우므로 **`canvas.width` 를 쓰면 2배 화면에서 패들이 손가락의 2배 위치로 날아갑니다.** 논리 상수 `W` 를 쓰십시오 (`physics.js` 의 `paddleXFromClientX`).
2. **`box-sizing: border-box` 와 테두리** — 전역 `*` 규칙 때문에 `style.width = 400px` 에 테두리 4px 가 포함되어 그리기 영역은 `clientWidth`(396)이고 원점은 `rect.left + clientLeft` 입니다. `rect` 를 그대로 넘기면 테두리만큼(약 1%) 어긋납니다.
3. **`touch-action: none` 이 스크롤 차단의 핵심** — `preventDefault()` 가 아닙니다. 원본은 Streamlit **iframe 안**이라 페이지 스크롤 문제가 없었지만, 이제 게임이 최상위 문서를 차지하므로 `touch-action: none`(캔버스) + `overscroll-behavior: none`(html/body, 당겨서 새로고침)이 필요합니다. **`overflow: hidden` 은 쓰지 않습니다** — 세로가 짧은 화면에서 조작 버튼에 닿을 수 없게 됩니다.
4. **React 17+ 의 passive 리스너** — `touchmove` 를 React prop 으로 받으면 `preventDefault()` 가 무효입니다. Pointer Events 는 그 passive 목록(`touchstart`/`touchmove`/`wheel`)에 없어 이 함정을 비켜갑니다.
5. **`ctx.roundRect`** — Chrome 99+/Safari 16.4+ 이고, 없으면 **TypeError 가 `drawScene` 전체를 중단시켜 게임이 멈춘 것처럼 보입니다**. `quadraticCurveTo` 기반 `roundRectPath` 로 대체했습니다.
6. **`createWorld()` 는 DOM 을 모릅니다** — `navigator` 를 읽으면 `useRef(createWorld())` 초기화가 렌더 중(SSR)에 돌아 빌드가 깨집니다. `isMobile` 은 마운트 후 effect 에서 설정합니다.
7. `rewrites` destination에 **`.html` 금지** (위 Deployment 절 참조).

## 원본에서 고친 결함 2가지

- **레벨 4 소프트락** — `checkLevelComplete` 는 `visible` 브릭을 세므로 파괴 불가 골드 브릭 10개가 남아 있는 한 레벨이 끝나지 않습니다. 통과 수단은 B 포탈뿐인데 1-HP 브릭 30개 × 12% × 5% 로는 대부분 막혀 **약 86%가 클리어 불가**였습니다. 마지막 레벨에서 첫 1-HP 브릭 파괴 시 B 를 확정 지급합니다(`world.portalGranted`).
- **게임오버가 스스로 풀리던 문제** — 원본은 이전 생명 감소의 `setTimeout` 을 남겨 두어, 게임오버 800ms 뒤 `resetBall` 이 `gameState` 를 `'ready'` 로 되돌렸습니다. 틱 카운터로 옮기며 `transition = null` 로 정리합니다.

## 파일 구조

| 경로 | 역할 |
| --- | --- |
| `game/constants.js` | 보드·아이템 수치 + 틱 상수 |
| `game/levels.js` | `makeBrick` · `genLevel` (5개 레벨) |
| `game/world.js` | 월드 생성·액션·`ballSpeed` (`physics` 가 import 하는 단방향) |
| `game/physics.js` | 틱당 물리 + `paddleXFromClientX` |
| `game/step.js` | `stepWorld(world, input) → events[]` — 틱 진입점 |
| `game/render.js` | `setupCanvas`(DPR) + 모든 `draw*` |
| `hooks/` | `useGameLoop`(고정 타임스텝) · `usePointer` · `useKeyboard` · `useAudio` |
| `components/ArkanoidGame.jsx` | 오케스트레이터 (**`useState` 없음**) |
| `game/*.test.js` | 단위 테스트 47개 (`node --test`) |

## ⚠️ 빌드 산출물을 커밋하므로 소스 수정 시 재빌드 필수

```sh
cd arkanoid-src && npm test      # 순수 로직 단위 테스트 47개
cd arkanoid-src && npm run build # → repo 루트 arkanoid/ 갱신 (next build && cp -R out ../arkanoid)
```

**`arkanoid/`을 커밋하지 않으면 배포본이 소스와 어긋납니다.**

배경 이미지는 `images/arkanoid.png`(1024×1024, 1.3MB)를 **WebP 131KB 로 재인코딩**해 `public/bg/` 에 둡니다 (테트리스 테마곡을 96kbps 로 재인코딩한 선례와 같습니다). 효과음 4개는 `sound/` 에서 `public/audio/` 로 복사하며, 테트리스와 **같은 파일**(swipe·drop·change·break)입니다.

`arkanoid_streamlit.py` 는 **보관용으로 남겨둡니다** — 포팅 검증의 기준 구현입니다.
