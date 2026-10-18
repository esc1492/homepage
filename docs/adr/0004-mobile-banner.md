# ADR-0004: 모바일 상단 배너는 고정하지 않는다

- **상태**: Accepted (2026-10-18)
- **관련**: `CLAUDE.md`의 Frontend Architecture

## 맥락

`index.html`의 배너 CSS는 두 블록으로 나뉘어 있었습니다.

- `@media (max-width: 768px)` 블록이 `.banner-wrap { position: fixed; top: 56px; z-index: 50 }`과
  `.top-banner { height: min(70px, 30vh); object-fit: cover }`를 선언했습니다.
- 그 **뒤에** base 블록이 `.banner-wrap { position: relative }`와 `.top-banner { height: 100% }`를
  같은 specificity로 선언했습니다.

나중 선언이 이기므로 모바일의 `position: fixed`와 `height: min(70px,30vh)`는 **적용되지 않았습니다**.
그런데도 `top: 56px`·`left/right: 0`·`z-index: 50`·`object-fit: cover`는 경쟁 규칙이 없어 **그대로
적용**되고 있었습니다. 즉 “고정 배너”를 의도한 블록이 절반만 살아 있는 상태였습니다.

2026-10-18 세션에서 모바일 고정 배너 문제는 **의도적으로 미수정**하기로 합의했습니다.

## 결정

1. 모바일 배너는 **고정하지 않고 흐르게** 둡니다 (`position: relative`).
2. 효력이 없던 `position: fixed`와 `height: min(70px,30vh)`를 **삭제**합니다.
3. 배너 base 규칙을 media 블록 **앞으로 옮깁니다**. 이후에 추가하는 모바일 규칙이 조용히 덮이지 않게.
4. 현재 적용 중인 `top: 56px`은 **fixed nav(56px) 아래로 내리는 상대 오프셋**으로 남기고 주석으로 명시합니다.
   `object-fit: cover`도 모바일 규칙으로 남깁니다.
5. `.wrap`의 모바일 여백 `calc(56px + min(70px,30vh) + …)`은 **현재 화면의 여백**으로 유지합니다.
   고정 배너 예약이라는 원래 의미는 없어졌지만, 줄이면 콘텐츠가 위로 올라오는 시각 변화가 생깁니다.

## 근거

- **동작을 뒤집지 않습니다.** 이 카드는 고정 배너를 되살리는 제안이 아니라, 다음에 배너를 만질 때
  같은 source-order 함정을 반복하지 않자는 정리입니다.
- **죽은 선언은 함정입니다.** `position: fixed`가 적혀 있는데 실제로는 `relative`인 상태는
  다음 사람이 “고정이 왜 안 되지?”로 다시 조사하게 만듭니다.
- **`top: 56px`은 지금 화면의 일부입니다.** fixed nav 아래로 배너를 내리는 역할을 하고 있어,
  지우면 모바일 배너가 nav 뒤로 올라갑니다.
- **여백은 사용자가 보고 있는 화면입니다.** 예약이라는 원래 의도는 사라졌지만, 값을 바꾸는 것은
  이번 결정의 범위가 아닙니다.

## 결과

- 모바일에서 배너는 문서 흐름을 따라 스크롤됩니다.
- media 블록이 base 뒤에 오므로, 앞으로 추가하는 모바일 규칙이 정상적으로 이깁니다.
- 가로 보기 블록은 `top/left/right`를 `auto`로 되돌려 상대 오프셋을 취소합니다 (그대로 유지).
- 화면 변화 0 — 390×844에서 수정 전후를 측정해 `position`·`top`·배너 높이·`object-fit`·
  `.wrap` 여백이 모두 동일함을 확인했습니다.
- 고정 배너를 다시 원하면 이 ADR을 먼저 뒤집어야 합니다.
