import { supabase } from "../lib/supabase";

// 글별 좋아요 개수를 한 번에 가져와 { 글id: 개수 } 형태로 정리
export async function fetchLikeCounts() {
  const { data, error } = await supabase.from("likes").select("post_id");
  if (error) throw error;

  const counts = {};
  for (const like of data) {
    counts[like.post_id] = (counts[like.post_id] ?? 0) + 1;
  }
  return counts;
}

// 좋아요 추가 / 취소
export async function addLike(postId, userId) {
  await supabase.from("likes").insert({ post_id: postId, user_id: userId });
}
export async function removeLike(postId, userId) {
  await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
}
