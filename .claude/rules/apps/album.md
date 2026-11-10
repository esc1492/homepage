---
paths:
  - "moment/**"
  - "album/**"
---

# 앨범 (모먼트) — `/album`

> 루트 `CLAUDE.md` 의 해당 절을 그대로 옮긴 상세 문서입니다. `paths` 에 매칭되는 파일을
> 열 때만 로드됩니다. 요약 카드는 루트 `CLAUDE.md` 에 있습니다.


전자책 『비전공자도 끝까지 만드는 첫 풀스택 웹 서비스』의 완성 예제. 사진 게시판(회원가입 · 글 CRUD · 사진 업로드 · 좋아요/댓글 실시간).

- **소스**: `moment/` (Vite + React 19 + react-router 7 + @supabase/supabase-js v2)
- **서빙**: `album/` — 빌드 산출물. Vercel은 빌드하지 않으므로 **이 폴더가 실제 배포본**
- **경로**: `https://homepage-dwkim.vercel.app/album` (홈페이지 바로가기 '앨범' 타일 → 새 탭)
- **백엔드**: 홈페이지와 **같은 Supabase 프로젝트**(`oggzgullnohqehthewuw`). `posts`·`likes`·`comments` 테이블 + `photos` 버킷(Public). 설정 SQL은 `moment/supabase_setup.sql`
- **로그인**: 같은 origin이라 Supabase 세션이 **자동 공유**됨 — 홈페이지에서 로그인하면 앨범은 재로그인 불필요

## ⚠️ 아이폰 HEIC 는 올리기 전에 JPEG 로 바꿉니다 (`lib/heic.js`)

아이폰 기본 카메라 포맷(HEIC)을 **Chrome·Edge·Firefox 가 그리지 못합니다.** 그대로 올리면 `<img>` 가 로드에 실패해 **alt 텍스트("첨부 사진")만** 남습니다 — "사진이 있다고만 표시되고 안 보이는" 증상입니다 (2026-10-11 실제 발생, 글 1건).

- `lib/heic.js` 의 `toUploadable(file)` 이 HEIC 를 JPEG 로 바꿔 돌려주고, `api/posts.js` 의 `uploadImage` 가 그 결과를 올립니다. HEIC 가 아니면 원본을 **같은 객체 참조로 그대로** 통과시킵니다 (불필요한 재인코딩 없음).
- 변환은 `heic2any`(libheif wasm, 1.29MB). **동적 import** 라 HEIC 를 실제로 고른 사람만 받습니다 — 메인 번들은 481KB→483KB 로 사실상 그대로이고 별도 청크로 나옵니다.
- ⚠️ **dev 와 프로덕션의 export 형태가 다릅니다.** `heic2any` 의 `package.json` `main` 이 UMD 라, dev 는 `default` 로, 프로덕션 청크는 이름이 압축된 단일 export(`export{O0 as h}`)로 나옵니다. `mod.default ?? mod` 로 쓰면 **dev 에서만 통과하고 배포본에서 조용히 깨집니다** (실제로 이렇게 썼다가 잡았습니다). 함수인 export 를 찾아 쓰십시오 — **wasm·UMD 류는 반드시 프로덕션 빌드로 검증**하십시오.
- 변환 실패(wasm 로드·디코딩·메모리 부족) 시에는 **원본을 올리지 않고** 한국어 오류를 띄웁니다. 올려도 화면에 안 보이기 때문입니다.
- ⚠️ **같은 아이폰 사진이 업로드 경로에 따라 HEIC 가 되기도 JPEG 가 되기도 합니다.** iOS 사진 피커는 웹이 HEIC 를 못 읽는 걸 알고 자동으로 JPEG 로 바꿔 주지만(**EXIF `Software` 가 변환 시점의 OS 로 갱신됩니다**), **안드로이드 Chrome 파일 선택기·맥 Finder 에는 그 변환이 없습니다.** 2026-09-11 업로드 2건은 JPEG(`Software` 26.3.1), 2026-10-10 1건은 HEIC(`Software` 18.3.2) — 셋 다 같은 iPhone 12 mini 사진입니다. 10월 건은 업로드 요청 로그(`storage_logs`)에 안드로이드 Chrome UA 가 남아 있어 확정됩니다.
- 12MP 기준 변환에 **약 1.7초** 걸립니다 (데스크톱 실측). 결과는 4032×3024 JPEG 약 3MB.

## ⚠️ 빌드 산출물을 커밋하므로 소스 수정 시 재빌드 필수

```sh
cd moment && npm run build     # → repo 루트 album/ 갱신 (vite.config.js의 outDir)
```

`moment/vite.config.js`에 `base: "/album/"`, `build.outDir: "../album"`, `emptyOutDir: true`가 설정되어 있습니다.
**`album/`을 커밋하지 않으면 배포본이 소스와 어긋납니다.** Supabase 키를 회전하면 `moment/.env.local` 수정 후 재빌드해야 합니다 (키가 번들에 인라인됨 — Vercel 환경변수 불필요).
