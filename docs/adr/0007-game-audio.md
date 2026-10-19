# ADR-0007: 게임 오디오는 공유 hook 하나와 두 adapter로 둔다

- **상태**: Accepted (2026-10-18)
- **관련**: ADR-0001, ADR-0006, `GLOSSARY.md`

## 맥락

테트리스와 알카노이드는 같은 오디오 개념을 각자 구현하고 있었습니다.

- **공통**: 효과음 하나당 보이스 4개 풀, `NEXT_PUBLIC_BASE_PATH` 기반 `audioUrl`,
  `play` 의 “놀고 있는 보이스 우선, 아니면 차례로 빼앗기”, unmount 시 `pause`.
- **테트리스만**: `enabled`/`toggle`, 테마곡(`loop`, `preload='none'`), `startTheme`/`stopTheme`.
- **알카노이드만**: 첫 제스처에서 모든 보이스를 재생·정지하는 `unlock`.

interface 는 서로 호환되지 않았습니다 — 테트리스는
`{ enabled, play, startTheme, stopTheme, toggle }`, 알카노이드는 `{ play, unlock }`.
같은 파일명 `hooks/useAudio.js` 가 두 프로젝트에 다른 계약으로 존재했습니다.

## 결정

1. **`shared/game-audio.mjs`** 에 `useGameAudio({ sounds, themeFile })` 하나를 둡니다.
   반환은 `{ enabled, play, unlock, startTheme, stopTheme, toggle }`.
2. **`shared/game-audio-core.mjs`** 에 React 없는 순수 부분(`audioUrl`, `pickVoice`,
   `VOICES_PER_SOUND`)을 둡니다.
3. 각 프로젝트의 `hooks/useAudio.js` 는 **module 상수 `SFX` 를 넘기는 얇은 adapter** 입니다.
   테트리스만 `themeFile: 'theme.mp3'` 를 넘깁니다.
4. 전달은 기존 prebuild 복사 방식을 따릅니다. `scripts/sync-site-nav.mjs` 를
   **`scripts/sync-shared.mjs`** 로 이름을 바꾸고, sitenav 는 세 프로젝트에,
   game-audio 는 tetris·arkanoid 에만 복사합니다.

## 근거

- **두 adapter 가 실재합니다.** 테마곡 유무가 유일한 실질 차이이고, 나머지는 같은 규칙입니다.
  하나의 module 뒤에 option 하나로 표현할 수 있습니다.
- **interface 를 하나로 만들면 호출부가 같아집니다.** 두 게임 모두 같은 hook 모양을 보고,
  쓰지 않는 method 는 호출하지 않습니다.
- **pool 선택은 순수 함수로 뽑을 수 있습니다.** `pickVoice(voices, next)` 는
  `paused` 속성만 가진 가짜 객체로 테스트할 수 있습니다 (ADR-0006 과 같은 이유).
- **배열은 module 상수여야 합니다.** `sounds` 를 render 마다 새 배열로 넘기면 effect 의존성이
  바뀌어 Audio 객체가 매 render 재생성됩니다. adapter 에서 상수로 둡니다.
- **동작 보존**: `play` 는 `enabled` 를 확인하지만 두 게임 모두 기본값이 true 이고
  알카노이드는 토글을 호출하지 않으므로 동작이 같습니다. 테마가 없으면 관련 method 는 no-op 입니다.

## 결과

- `hooks/useAudio.js` 가 두 프로젝트에서 같은 계약을 갖습니다.
- 테트리스는 `unlock` 을, 알카노이드는 `enabled`/`toggle`/테마 method 를 얻지만 사용하지 않습니다.
- 효과음 mp3 파일은 여전히 각 프로젝트의 `public/audio/` 에 중복되어 있습니다 (이번 범위 밖).
- `minesweeper-src` 는 오디오가 없어 game-audio 를 복사받지 않습니다.
- `tetris/`·`arkanoid/` 산출물을 재빌드해야 합니다.
