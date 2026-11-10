import { supabase } from "../lib/supabase";
import { displayName } from "../lib/displayName";

const COLUMNS = "id,title,body,tags,username,user_id,created_at,updated_at";

// 게시판 글 목록 (최신순)
export async function fetchBoardPosts() {
  const { data, error } = await supabase
    .from("board_posts")
    .select(COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchBoardPost(id) {
  const { data, error } = await supabase
    .from("board_posts")
    .select(COLUMNS)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// 같은 글의 이웃 — prev 는 더 오래된 글, next 는 더 최근 글
export async function fetchAdjacentBoardPosts(post) {
  const [older, newer] = await Promise.all([
    supabase
      .from("board_posts")
      .select("id,title")
      .lt("created_at", post.created_at)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("board_posts")
      .select("id,title")
      .gt("created_at", post.created_at)
      .order("created_at", { ascending: true })
      .limit(1),
  ]);

  if (older.error) throw older.error;
  if (newer.error) throw newer.error;

  return { prev: older.data[0] ?? null, next: newer.data[0] ?? null };
}

export async function createBoardPost({ title, body, tags, user }) {
  const { data, error } = await supabase
    .from("board_posts")
    .insert({
      title,
      body,
      tags,
      user_id: user.id,
      username: displayName(user),
    })
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateBoardPost(id, { title, body, tags }) {
  const { data, error } = await supabase
    .from("board_posts")
    .update({ title, body, tags, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBoardPost(id) {
  const { error } = await supabase.from("board_posts").delete().eq("id", id);
  if (error) throw error;
}
