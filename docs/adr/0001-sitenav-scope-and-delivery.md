# ADR-0001: SiteNav 공유 범위와 전달 방식

- **상태**: Accepted (2026-10-18)
- **관련**: `GLOSSARY.md`, `CLAUDE.md`의 「공유 SiteNav module」

## 맥락

서브 페이지 상단 내비게이션(SiteNav)이 일곱 벌로 존재했습니다.

- 정적 페이지 3곳(`chat`·`ocr`·`voca`): 각자 `.sitenav` CSS 69줄 + 마크업 21줄 + 바인딩 스크립트를 인라인으로 보유
- Next.js 게임 3곳: `components/SiteNav.jsx`가 **바이트 단위로 동일한** 세 복사본
- `moment/src/components/SiteNav.jsx`: `user` prop을 받는 네 번째 React 변형

정적 사본은 `#homeBtn`·`#backBtn`·`#userBtn` DOM 계약이었고, 로그인 상태를 **밖에서**
`userBtn.classList.add('logged-in')`으로 밀어 넣었습니다. 주석은 “홈페이지 .nav와 동일 디자인”이라고
적혀 있었지만 실제로는 홈이 parchment 불투명 바탕, 서브 페이지가 반투명 + blur로 갈라져 있었습니다.

## 결정

1. **공유 범위는 서브 페이지 6곳**으로 한정합니다: `chat`·`ocr`·`voca` + 테트리스·알카노이드·지뢰찾기.
2. **홈 `index.html`의 `.nav`는 제외**합니다. 햄버거가 홈 이동이 아니라 드롭다운 메뉴를 열고,
   문이 포커스 모드, 아이콘이 로그인 모달을 엽니다. 같은 interface로 묶으면 메뉴·모달·포커스 모드가
   module의 interface로 들어와 module이 얕아집니다.
3. **전달은 prebuild 복사**입니다. `scripts/sync-shared.mjs`(당시 이름 `sync-site-nav.mjs`)가 `shared/`의 두 파일을
   `tetris-src/shared/`·`arkanoid-src/shared/`·`minesweeper-src/shared/`로 복사하고,
   각 프로젝트의 `predev`·`prebuild`가 실행합니다. 복사본은 gitignore 대상입니다.
4. **시각 기준은 parchment**(홈 `.nav`와 동일, blur 없음)입니다.
5. **로그인 상태는 module의 입력**입니다. module은 localStorage를 모르고, React adapter가 읽어서
   `loggedIn`으로 넘기며, 정적 페이지는 `window.siteNav.setLoggedIn(bool)`을 호출합니다.
6. **테스트 표면은 view-model**입니다. `navViewModel({ loggedIn })`이 아이콘 class·title·aria를
   결정하고, `node --test`로 검증합니다. DOM 바인딩은 브라우저 확인으로 대체합니다.

## 근거

- **Next 세 프로젝트가 상대 경로 import를 쓸 수 없습니다.** 각 `next.config.mjs`는
  `turbopack.root`를 프로젝트 디렉터리로 고정합니다 — 상위 저장소의 `package-lock.json` 때문에
  Next가 워크스페이스 루트를 잘못 추론하기 때문입니다. 상대 import나 `file:` 패키지는 이 고정을
  다시 건드리고, 잠금파일 세 개를 바꿉니다. 복사는 그 제약을 건드리지 않습니다.
- **홈을 흡수하면 interface가 넓어집니다.** 메뉴 항목·포커스 모드·로그인 모달은 서브 페이지에
  존재하지 않는 개념입니다. 하나의 module에 넣으면 호출부마다 쓰지 않는 옵션이 늘어납니다.
- **parchment는 2026-10-18 헤더 가독성 수정의 결과**입니다. 서브 페이지의 blur는 그 결정 이전
  상태였고, 한 module로 합치면서 제거했습니다.
- **`moment`는 범위 밖**입니다. 앨범 앱은 자체 라우터와 `user` prop을 쓰는 별도 변형이며,
  이번 변경의 hot spot이 아니었습니다.

## 결과

- 마크업·CSS·동작의 원본은 `shared/sitenav.mjs`·`shared/sitenav.css` 하나입니다.
- 서브 페이지 추가는 mount 지점 + `/shared/...` 링크 두 줄이면 됩니다. 중앙 라우트 목록은 없습니다.
- `shared/`를 고치면 세 Next 프로젝트의 산출물을 재빌드해야 합니다 (다른 소스 변경과 같은 규칙).
- `next build`를 `npm run build` 없이 직접 실행하면 복사본이 갱신되지 않습니다. import가
  실패하므로 조용히 지나가지 않습니다.
- 홈 `.nav`와 서브 페이지 SiteNav는 시각적으로 같아졌지만 **코드는 여전히 별개**입니다.
  홈 헤더를 바꿀 때 서브 페이지도 함께 볼 필요가 있습니다.
