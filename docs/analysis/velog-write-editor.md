# velog.io 글쓰기·편집 기능 분석 (REA)

- 분석일: 2026-11-06
- 대상: `https://velog.io/write` (작성 화면), `https://velog.io/`
- 목적: 앨범(`moment/`)의 글쓰기 기능을 velog 수준으로 확장하기 위한 구현 참고자료
- 도구: REA 6.5.0 — 정적 번들 분석 + 헤드리스 Chrome CDP 관찰 (MCP 미연결 → CLI 경로 사용)

## 0. 방법과 한계

| 구분 | 내용 |
| --- | --- |
| 런타임 관찰 (헤드리스) | REA `inspect-web-page` (증거 `ev_d77cd586…02b5d`). 익명 세션, `/write` DOM·접근성 트리·스토리지 키 |
| 런타임 관찰 (데스크톱) | ego lite 0.6.1.13 (Chromium 156) — **REA 증거가 아님**. 같은 `/write`를 넓은 뷰포트로 열어 툴바·contenteditable·번들 출처 확인 |
| 정적 분석 | REA `analyze-javascript-application` (증거 `ev_007d1dd9…1018`, 18,830 AST 노드, 파싱 실패 0). `/write`가 로드하는 8개 청크 |
| 보조 | 청크 원문 grep / beautify — **REA 증거가 아닌 일반 도구 결과**로 표시함 |

**한계**
- 로그인 상태의 화면은 관찰하지 않았습니다. **의도된 범위 제외**입니다 — 앨범은 velog 인증을 쓰지 않고 기존 Supabase 세션을 쓰므로, velog 계정 화면은 구현에 필요하지 않습니다. 참고로 ego lite 프로필에도 velog 세션은 없었습니다(인증 쿠키 0건).
- 데스크톱 관찰(ego lite)로 `/write`가 여전히 레거시 CRA 번들(`static.velog.io`)임을 확인했습니다. 즉 Next.js 마이그레이션은 작성 화면에 아직 적용되지 않았습니다.
- GraphQL 응답 스키마·서버 측 제한(태그 개수, 본문 길이, 요청 한도)은 확인하지 못했습니다.
- velog.io는 마이그레이션 중입니다. `/`(목록)는 Next.js 청크(`assets.velcdn.com`), `/write`는 레거시 CRA 청크(`static.velog.io`)를 씁니다. 분석 시점의 배포본 기준입니다.

## 1. 스택 (관찰)

- React + Redux + Apollo Client 2, styled-components — 레거시 CRA 번들
- **CodeMirror 5** (`CodeMirror.fromTextArea`) — 마크다운 편집기
- unified/remark/rehype — 마크다운 ↔ HTML 변환 (청크 `22.7ffee3bc`, `4.6만 B`)
- PrismJS 1.14.0 + KaTeX + iframe 임베드 — 본문 렌더러 (청크 `1.c2610806`, 2.8만 B)
- Cloudflare Turnstile — 발행 시 봇 검증 토큰

## 2. 에디터 모드

- Redux 슬라이스 `write` 초기 상태 (main 청크 오프셋 125,531):
  `{ mode: "MARKDOWN", markdown, title, html, tags, publish, textBody, defaultDescription, description, isPrivate, urlSlug, thumbnail, editSeries, selectedSeries, postId, isTemp, initialTitle, initialBody }`
- 모드 enum은 `MARKDOWN` / `WYSIWYG` 두 가지이고 "마크다운 에디터로 전환 / 쉬운 에디터로 전환" 확인 모달 문자열도 번들에 있습니다.
- **그러나 이 배포본에서 WYSIWYG 경로는 도달 불가능해 보입니다(추론).**
  - 문서에 `contenteditable` 리치 에디터 요소가 없고(태그 입력 영역 제외), Quill·ProseMirror·Slate·Draft 흔적도 없습니다.
  - 데스크톱 뷰포트(ego lite)에서도 `[contenteditable]` 노드는 **0개**였습니다. 편집 영역은 CodeMirror(`cm-s-one-light`, `CodeMirror-wrap`, `CodeMirror-empty`) 하나뿐입니다.
  - `html` 상태를 채우는 코드는 마크다운→HTML 변환 콜백 하나뿐이며, 그 콜백(`onConvert`)을 넘기는 툴바가 인자를 버립니다.
  - 실제 렌더링은 CodeMirror(`cm-not-content` 클래스, 숨은 textarea) + 미리보기 패널입니다.
- ⚠️ 실사용 결론: **현재 velog 작성 화면은 사실상 마크다운 단일 모드**로 보는 것이 안전합니다.

## 3. 마크다운 에디터 동작

CodeMirror 초기화 (WritePage 청크 오프셋 13,148):

```js
CodeMirror.fromTextArea(el, {
  mode: "markdown",
  theme: "one-" + theme,
  placeholder: "당신의 이야기를 적어보세요...",
  lineWrapping: true,
})
```

- 툴바 버튼: `H1~H4`, 굵게, 기울임, 밑줄(WYSIWYG 전용), 취소선, 인용, 링크, 이미지, 코드블록
  - 데스크톱(markdown 모드)에서 실제 렌더링된 11개: `H1 H2 H3 H4 | B I S " | 🔗 🖼 <>` — 밑줄은 없습니다.
  - 아이콘 버튼에는 접근성 이름(`aria-label`)이 없어 접근성 트리 스냅샷에는 `H1~H4`만 노출됩니다. (앞서 헤드리스 관찰에서 버튼이 4개만 보인 이유)
  - iOS에서는 굵게·기울임·코드블록 버튼을 숨깁니다.
- 삽입 규칙(관찰):
  - 제목: 현재 줄 접두사를 `#`×n 으로 교체(같은 레벨 재클릭 시 제거)
  - 굵게/기울임: 선택 영역을 `**…**` / `_…_` 로 감싸고, 기본 텍스트는 "텍스트"
  - 링크: 선택 없으면 `[링크텍스트](URL)` 삽입 후 링크텍스트 선택
  - 이미지: 파일 선택기를 열어 업로드 → `![](업로드경로)` 삽입
- iOS는 CodeMirror 대신 숨은 textarea로 같은 마크다운 조작을 수동 구현(한글/IME 대응)합니다.
- 미리보기: `#preview` 패널에 `markdown` 상태를 실시간 렌더링. 커서가 끝에서 5줄 이내면 미리보기를 바닥으로 자동 스크롤.

## 4. 자동 저장 (서버 임시저장)

- 편집 후 **10초 디바운스**로 임시저장. `Ctrl/Cmd+S`는 즉시 저장.
- 저장 조건: 제목/본문이 초기값과 다를 때. 단 `postId`가 없고 제목이 비었으며 본문이 30자 미만이면 건너뜁니다.
- **localStorage 초안은 쓰지 않습니다.** 테마 등 잡다한 값만 있고, 초안은 서버의 `is_temp: true` 포스트입니다.
- 최초 저장 시 `Temp Title`/`Temp Body` 로 임시 포스트를 만들고 `writePost.id`를 받아 URL을 `/write?id=<id>`로 바꿉니다. 이후 저장은 `editPost`(`is_temp: true`).
- 초안 복구: 진입 시 `lastPostHistory(post_id)`를 받아 포스트 `updated_at`보다 최신이거나 내용이 다르면 "임시저장된 포스트를 불러오시겠습니까?" 모달을 띄웁니다.

## 5. 데이터 모델 · API (GraphQL)

엔드포인트: `https://v2.velog.io/graphql`, Apollo `credentials: "include"`, 캐시는 `window.__APOLLO_STATE__`에서 복원 (main 청크 오프셋 4,742).

```graphql
mutation WritePost($title: String, $body: String, $tags: [String],
  $is_markdown: Boolean, $is_temp: Boolean, $is_private: Boolean,
  $url_slug: String, $thumbnail: String, $meta: JSON, $series_id: ID, $token: String) {
  writePost(...) { id user { id username } url_slug }
}

mutation EditPost($id: ID!, ...same fields) { editPost(...) { id user { id username } url_slug } }

query ReadPostForEdit($id: ID) {
  post(id: $id) { id title tags body short_description is_markdown is_private
    is_temp thumbnail url_slug updated_at series { id name } user { id } }
}
```

- 발행 페이로드: `body`는 마크다운 모드면 `markdown` 원문, 아니면 **HTML**(`module 411.b` — 헤딩에 id만 부여하고 innerHTML을 반환). **HTML→마크다운 역변환기는 번들에 없습니다.** 서버는 `is_markdown` 플래그로 두 형식을 구분해 저장합니다. `meta: { short_description }`, `url_slug`는 제목 슬러그, `token`은 Turnstile 토큰.
- 발행 성공 시 Apollo 캐시 리셋 후 `/@username/url_slug`로 이동.
- 관련 오퍼레이션: `CreatePostHistory`, `GetLastPostHistory`, `RemovePost`, `ReadPost`.

## 6. 이미지 업로드

- `POST /api/v2/files/upload` (multipart) — 필드 `image`(파일), `type`(`"post"`), `ref_id`(포스트 id) → `{ path }`
- `ref_id`가 필요하므로 **글 없이 이미지부터 올리면**: 임시 포스트를 먼저 만들고 → `/write?id=`로 이동 → 업로드.
- 업로드 중에는 blob URL로 `![업로드중..](blob:…)` 를 먼저 넣고, 완료되면 실제 경로로 교체합니다.
- 붙여넣기: 텍스트가 URL이면 링크로, 클립보드에 이미지 파일이 있으면 업로드. 드래그&드롭 오버레이도 같은 업로드를 호출합니다.

## 7. 발행 모달

- 제목·태그: 편집기 상단. 태그는 Enter/쉼표로 추가, 클릭으로 삭제.
- `포스트 미리보기`: 썸네일 업로드/재업로드/제거, 소개글 textarea **150자 제한 + 카운터**
- `시리즈 설정`: 기존 시리즈 선택 또는 새 시리즈 생성
- `공개 설정`: 전체 공개 / 비공개
- 하단: `나가기` · `임시저장` · `출간하기`(수정 시 `수정하기`)

## 8. 본문 렌더링

- unified 파이프라인: markdown → mdast → (remark 플러그인: 링크/이미지/임베드/헤딩 id·TOC) → HTML
- 코드 블록: PrismJS로 하이라이트해 `<pre><code class="language-…">` 로 치환
- 임베드: YouTube, Twitter, CodeSandbox, CodePen iframe 정규식 처리
- KaTeX 수식, 헤딩 id 자동 부여 + TOC 추출

## 9. 앨범에 옮길 때 (제안)

**전제: velog를 복제하지 않고 기능만 차용합니다.** 앨범은 이미 Supabase 로그인·RLS가 있으므로 velog의 인증 체계(GraphQL `token`, Turnstile, 소셜 로그인)는 가져오지 않습니다. 작성자 판별·권한은 기존 Supabase 세션과 RLS가 담당합니다.

| 가져올 것 | 가져오지 않을 것 |
| --- | --- |
| 마크다운 편집 + 툴바 삽입 규칙 | GraphQL/Apollo, `is_markdown` 같은 서버 와이어 포맷 |
| 실시간 미리보기(좌우 분할) | velog 계정·소셜 로그인·Turnstile |
| 초안 자동저장·복구(10초 디바운스) | 시리즈, 포스트 히스토리(초기 범위 밖) |
| 이미지 다중 업로드·붙여넣기·드래그&드롭 | 마크다운 ↔ HTML 이중 모드(WYSIWYG) |
| 발행 패널(썸네일·소개 150자·태그·공개/비공개) | velog의 `url_slug` 규칙(앨범은 id 기반 경로 유지) |

현재 앨범은 `content`(평문) + `image_url`(1장) + `NewPostForm` textarea입니다. velog식으로 확장하려면:

1. **데이터**: `posts`에 `body_md text`, `is_temp bool default false`, `tags text[]`, `thumbnail text`, `short_description text`, `updated_at timestamptz` 추가. 기존 `content`/`image_url`은 유지(마이그레이션 중 표시 호환).
2. **초안**: 임시저장은 `is_temp=true` 행 + RLS(작성자만). 피드 쿼리에 `is_temp=false` 필터 필수. 10초 디바운스 + Ctrl/Cmd+S.
3. **에디터**: 마크다운 단일 모드로 시작. CodeMirror 6 또는 textarea + `react-markdown` 미리보기 분할. 툴바는 `H1~H4 · B · I · S · 인용 · 링크 · 이미지 · 코드블록` 8종이면 충분합니다(밑줄은 마크다운에 없음).
4. **이미지**: 기존 `uploadImage()`(HEIC→JPEG 변환 포함)를 그대로 재사용해 `![](publicUrl)` 삽입. 여러 장 삽입이 자연스럽게 지원됩니다.
5. **발행 모달**: 소개 150자, 태그, 공개/비공개. 썸네일은 첫 이미지 자동 지정 + 변경 허용.
6. **복구**: 초기 범위에서는 생략해도 됩니다. 필요해지면 `post_history` 테이블로 velog의 `lastPostHistory` 패턴을 재현.
7. **주의**: velog 번들은 React 16·Apollo 2 시절 코드입니다. 라이브러리 버전을 그대로 따르지 말고 현재 스택(Vite + React 19 + Supabase)에 맞춰 재구현하십시오.

## 10. 미확인 사항

- 로그인 상태 전용 UI(모드 전환 버튼 유무 포함) — 동완님 결정으로 **범위 밖**입니다. velog를 복제하지 않고 기능만 차용하며, 인증은 앨범의 기존 Supabase 세션을 씁니다.
- `createPostHistory` 호출 주체(클라이언트인지 서버 자동 기록인지) — 클라이언트에서 호출 지점을 찾지 못했습니다
- 태그 개수·본문 길이 등 서버 측 제한
- WYSIWYG 모드가 다른 배포/플래그에서 활성화되는지
