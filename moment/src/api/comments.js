import { supabase } from "../lib/supabase";
import { displayName } from "../lib/displayName";

// 한 글의 댓글을 오래된 순으로 불러오기
export async function fetchComments(postId) {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

// 댓글 작성
export async function addComment({ postId, content, user }) {
  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      content,
      user_id: user.id,
      username: displayName(user),
    })
    .select();

  if (error) throw error;
  return data[0];
}
