# 모먼트(Moment) — 완성 예제 코드

전자책 **『비전공자도 끝까지 만드는 첫 풀스택 웹 서비스』**(지은이 박형용)에서
한 줄씩 만든 커뮤니티 앱 **모먼트**의 완성 소스입니다.
React · Supabase · Vercel로 회원가입 · 글(CRUD) · 사진 · 좋아요/댓글 실시간 · 배포까지 모두 담겨 있습니다.

> 보안을 위해 `.env.local`(Supabase 키)은 포함돼 있지 않습니다. 아래 2)에서 본인 키로 만들어야 동작합니다.

## 실행 방법

### 1) 의존성 설치
```
npm install
```

### 2) Supabase 키 넣기
최상위에 `.env.local` 파일을 만들고(`.env.example`을 복사해 쓰면 편합니다), 본인 값으로 채웁니다.
```
VITE_SUPABASE_URL=...   # Supabase Connect 화면의 Project URL (책 12장)
VITE_SUPABASE_KEY=...   # publishable 키 (책 12장)
```

### 3) 백엔드 준비 (Supabase 대시보드)
1. **Storage**에서 `photos` 버킷을 **Public**으로 생성 (책 17장)
2. **SQL Editor**에 `supabase_setup.sql` 전체를 붙여넣고 실행 (테이블·정책·실시간)
3. **Authentication → Sign In/Providers → Email**에서 `Confirm email` 끄기 (연습용, 책 14장)

### 4) 실행
```
npm run dev
```
브라우저에서 안내된 주소(보통 http://localhost:5173)로 접속하세요.

### 5) 배포 (선택)
GitHub에 올리고 Vercel에 연결하면 됩니다(책 20·21장). `vercel.json`이 SPA 새로고침 404를 막아 줍니다.
Vercel에는 `.env.local`이 올라가지 않으므로, Vercel 프로젝트 설정의 Environment Variables에 같은 두 값을 다시 등록하세요.

## 폴더 구조
```
moment/
├─ index.html
├─ vercel.json              # SPA 라우팅 (20장)
├─ supabase_setup.sql       # 테이블·정책·실시간 한 번에
├─ .env.example             # 환경 변수 양식 (.env.local로 복사해 사용)
└─ src/
   ├─ main.jsx              # 앱 시작점 · BrowserRouter (11장)
   ├─ App.jsx               # 세션 관리 · 라우트 (14장)
   ├─ index.css             # 전체 스타일 (19장)
   ├─ lib/supabase.js       # Supabase 연결 (12장)
   ├─ api/                  # posts.js · likes.js · comments.js (15·17·18장)
   ├─ pages/                # FeedPage · PostDetailPage · AuthPage
   └─ components/           # Header · PostCard · NewPostForm
```

## 참고
이 코드는 학습용 완성본입니다. 책을 따라 직접 만든 뒤, 막히거나 다 만든 다음 비교용으로 보면 가장 좋습니다.

집필·검증 기준: React 19 · React Router 7 · @supabase/supabase-js v2 · Node.js 24 LTS · Vite · Vercel
