-- ============================================================
-- 모먼트(Moment) Supabase 설정 — 테이블 · 정책 · 실시간 한 번에
-- 사용법: Supabase 대시보드 > SQL Editor 에 전체를 붙여넣고 Run
-- (Storage 'photos' 버킷은 대시보드 Storage에서 Public으로 먼저 만드세요)
--
-- ※ 여러 번 실행해도 안전합니다.
--    Supabase SQL Editor 는 스크립트 전체를 한 트랜잭션으로 실행하므로,
--    중간에 한 줄이라도 에러가 나면 앞부분까지 전부 롤백됩니다.
--    그래서 create table / create policy / alter publication 을 모두
--    "이미 있어도 통과"하도록 작성했습니다.
-- ============================================================

-- 1) posts 테이블 (13장)
create table if not exists posts (
  id bigint generated always as identity primary key,
  content text not null,
  username text,
  user_id uuid references auth.users (id),
  image_url text,
  created_at timestamptz default now()
);
alter table posts enable row level security;

-- posts 정책 (15·16장)
drop policy if exists "글은 누구나 볼 수 있다" on posts;
create policy "글은 누구나 볼 수 있다"
on posts for select using ( true );

drop policy if exists "로그인하면 글을 쓸 수 있다" on posts;
create policy "로그인하면 글을 쓸 수 있다"
on posts for insert to authenticated
with check ( (select auth.uid()) = user_id );

drop policy if exists "내 글만 수정" on posts;
create policy "내 글만 수정"
on posts for update to authenticated
using ( (select auth.uid()) = user_id );

drop policy if exists "내 글만 삭제" on posts;
create policy "내 글만 삭제"
on posts for delete to authenticated
using ( (select auth.uid()) = user_id );

-- 2) likes 테이블 (18장)
create table if not exists likes (
  id bigint generated always as identity primary key,
  post_id bigint references posts (id) on delete cascade,
  user_id uuid references auth.users (id),
  created_at timestamptz default now()
);
alter table likes enable row level security;

drop policy if exists "좋아요는 누구나 볼 수 있다" on likes;
create policy "좋아요는 누구나 볼 수 있다"
on likes for select using ( true );

drop policy if exists "내 좋아요 추가" on likes;
create policy "내 좋아요 추가"
on likes for insert to authenticated
with check ( (select auth.uid()) = user_id );

drop policy if exists "내 좋아요 취소" on likes;
create policy "내 좋아요 취소"
on likes for delete to authenticated
using ( (select auth.uid()) = user_id );

-- 3) comments 테이블 (18장)
create table if not exists comments (
  id bigint generated always as identity primary key,
  post_id bigint references posts (id) on delete cascade,
  user_id uuid references auth.users (id),
  username text,
  content text not null,
  created_at timestamptz default now()
);
alter table comments enable row level security;

drop policy if exists "댓글은 누구나 볼 수 있다" on comments;
create policy "댓글은 누구나 볼 수 있다"
on comments for select using ( true );

drop policy if exists "내 댓글 작성" on comments;
create policy "내 댓글 작성"
on comments for insert to authenticated
with check ( (select auth.uid()) = user_id );

-- 4) Storage 업로드 정책 (17장)
--    먼저 대시보드 Storage에서 'photos' 버킷을 Public으로 만든 뒤 실행하세요.
--    storage.objects 는 Supabase가 원래 갖고 있는 테이블이라 drop table 로
--    지워지지 않습니다. 정책만 먼저 지우고 다시 만듭니다.
drop policy if exists "로그인하면 사진 업로드 가능" on storage.objects;
create policy "로그인하면 사진 업로드 가능"
on storage.objects for insert to authenticated
with check ( bucket_id = 'photos' );

-- 5) 실시간 켜기 (18장)
--    이미 추가된 테이블이면 조용히 넘어갑니다 (에러를 내면 전체가 롤백되므로).
do $$
begin
  begin
    alter publication supabase_realtime add table likes;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table comments;
  exception when duplicate_object then null;
  end;
end $$;
