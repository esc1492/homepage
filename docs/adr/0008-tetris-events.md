# ADR-0008: 테트리스 reducer 는 표현 이벤트를 돌려준다

- **상태**: Accepted (2026-10-18)
- **관련**: ADR-0007, `GLOSSARY.md`, `CLAUDE.md`의 테트리스 절

## 맥락

테트리스 reducer 는 사운드를 낼 수 없어서 `locks` 라는 카운터를 상태에 넣고,
컴포넌트가 이전 상태와 diff 해 “고정됐다”, “줄이 지워졌다” 를 추론했습니다.

- `state.locks > prev.locks` → `drop` 소리
- `state.lines > prev.lines` → `break` 소리
- `status` 변화 → 테마 정지
- 회전은 reducer 와 무관하게 `handleRotate` 가 **성공 여부와 상관없이** `change` 를 재생

`locks` 는 게임 규칙이 아니라 표현 관심사인데 module interface(상태)에 들어가 있었고,
diff 추론은 회전 실패·재시작·중복 재생 같은 경계를 컴포넌트에 흩어 놓았습니다.
알카노이드는 이미 `stepWorld` 가 events 배열을 돌려주는 형태였습니다.

## 결정

1. `reduceWithEvents(state, action)` 가 **`{ state, events }`** 를 돌려줍니다.
2. 이벤트는 `{type:'lock'}` · `{type:'clear', lines}` · `{type:'rotate'}` · `{type:'over'}` 입니다.
3. **`locks` 를 상태에서 제거**합니다.
4. `rotate` 이벤트는 **회전이 실제로 성공했을 때만** 발생합니다.
5. 컴포넌트는 `useState` + 동기 dispatch 로 상태를 갱신하고, 같은 동작에서 이벤트를 사운드로 매핑합니다.
6. `reduce(state, action)` 는 이벤트가 필요 없는 호출부를 위한 얇은 wrapper로 남깁니다.

## 근거

- **표현 관심사가 interface 밖으로 나옵니다.** 상태는 게임 규칙만 담고, 사운드 트리거는 이벤트로 명시됩니다.
- **diff 추론보다 정확합니다.** 이벤트 순서가 보존되고, 회전 실패에 소리가 나지 않습니다.
- **두 게임이 같은 seam 모양**을 갖습니다 (테트리스 `{state, events}`, 알카노이드 `events[]`).
- **테스트 표면이 생깁니다.** `reduceWithEvents` 의 이벤트 순서를 단위 테스트할 수 있습니다
  (lock → clear, lock → over, 성공한 rotate만).
- **동기 dispatch**: rAF 루프가 최신 상태를 즉시 읽어야 하므로 `stateRef` 를 dispatch 안에서 갱신합니다.
  사운드는 React updater 밖(이벤트/rAF 콜백)에서 재생하므로 StrictMode 이중 호출과 무관합니다.

## 결과

- 테트리스 테스트는 31개입니다 (기존 24 + 이벤트 7).
- `TetrisGame` 에서 상태 diff effect 가 사라졌습니다.
- 회전 실패 시 `change` 소리가 나지 않습니다 (의도된 동작 변경).
- 사운드 재생은 dispatch 안에서 일어나므로, reducer 를 순수하게 유지하려면 dispatch 를 거쳐야 합니다.
- `tetris/` 산출물을 재빌드해야 합니다.
