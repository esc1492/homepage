---
paths:
  - "board-src/**"
  - "board/**"
---

# 게시판 — `/board`

> 루트 `CLAUDE.md` 의 해당 절을 그대로 옮긴 상세 문서입니다. `paths` 에 매칭되는 파일을
> 열 때만 로드됩니다. 요약 카드는 루트 `CLAUDE.md` 에 있습니다.


velog 스타일 글 게시판입니다. 앨범(사진 피드)과 **별도 앱**이고 데이터도 분리되어 있습니다 (2026-11-06 추가).

- **소스**: `board-src/` (Vite + React 19 + react-router 7 + react-markdown)
- **서빙**: `board/` — 빌드 산출물. Vercel은 빌드하지 않으므로 **이 폴더가 실제 배포본**
- **경로**: `https://homepage-dwkim.vercel.app/board` (바로가기 드롭다운 **앨범 바로 아래 '게시판'**, `data-link="/board"` → 새 탭)
- **테이블**: `board_posts(id, user_id, username, title, body, tags text[], created_at, updated_at)` + RLS 4개(SELECT 전체 / INSERT·UPDATE·DELETE 작성자). SQL 은 `moment/supabase_setup.sql` 6절
- **인증**: 앨범과 같은 Supabase 프로젝트·세션. 로그인 전에는 AuthPage 만 보여줍니다. 같은 오리진이라 홈페이지 로그인과 세션이 공유됩니다
- **상단 내비게이션**: 앨범과 같은 SiteNav **복사본**(`board-src/src/components/SiteNav.jsx` + `index.css`)을 씁니다 — 햄버거가 바로가기 메뉴를 엽니다 (2026-11-09 추가). 공유 module(`shared/sitenav.mjs`)이 아니므로, 메뉴를 고치면 **`shared/`·`moment/`·`board-src/` 세 곳**을 함께 봐야 합니다
- **문 아이콘은 앱을 닫습니다** (`window.close()` → 실패 시 `/`). 이 앱은 내부 라우트가 있어 화면 이동마다 히스토리가 쌓이므로 `history.back()` 으로는 앱이 닫히지 않고 **목록→글→목록을 되짚어 가기만 합니다** (2026-11-09 실제 발생 → 수정). 앨범도 같은 처리입니다
- **에디터**: `board-src/src/components/MarkdownEditor.jsx` — 마크다운 툴바·미리보기·이미지 다중 업로드. `MarkdownView` 로 본문을 렌더합니다 (앨범 앱과 코드가 같지만 **복사본**이므로 한쪽을 고치면 다른 쪽도 확인하십시오)
- **개행**: `MarkdownView` 의 `remarkPlugins={[remarkGfm, remarkBreaks]}` 에서 `remark-breaks` 가 **한 번 누른 엔터를 `<br>`** 로 렌더합니다. 마크다운 규격 기본값은 soft break 라 미리보기·본문에서 줄이 붙어 나옵니다 (2026-11-06 실제 발생 → 수정). 앨범 `MarkdownView` 도 같은 설정입니다
- **이전·다음 글**: 글 상세 하단의 두 카드(← 이전 포스트 / 다음 포스트 →). `fetchAdjacentBoardPosts` 가
  `created_at` 기준으로 **이전 = 더 오래된 글, 다음 = 더 최근 글**을 각각 limit 1 로 조회합니다(2026-11-10).
  목록이 최신순이라 "이전 글"이 목록에서 아래쪽 항목입니다. 480px 이하에서는 두 카드를 세로로 쌓습니다.
  인접 글 조회가 실패해도 본문 표시는 막지 않고 카드만 생략합니다
- 이미지는 앨범과 같은 `photos` 버킷의 `${userId}/board/` 아래에 올리고, HEIC 는 `lib/heic.js` 가 JPEG 로 바꿉니다
- 라우트는 `basename="/board"` 아래라 `vercel.json` 의 `/board/:path*` rewrite 로 새로고침이 됩니다

## ⚠️ 빌드 산출물을 커밋하므로 소스 수정 시 재빌드 필수

```sh
cd board-src && npm test      # 순수 로직 단위 테스트 15개 (markdownEdit · markdown)
cd board-src && npm run build # → repo 루트 board/ 갱신 (vite.config.js의 outDir)
```

**`board/`을 커밋하지 않으면 배포본이 소스와 어긋납니다.** Supabase 키는 `board-src/.env.local` 에서 빌드 시 번들에 인라인됩니다(`moment/.env.local` 과 같은 값).
