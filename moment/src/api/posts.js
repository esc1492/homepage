import { supabase } from "../lib/supabase";
import { displayName } from "../lib/displayName";

// 글 목록 불러오기 (최신순)
export async function fetchPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// 글 하나 불러오기
export async function fetchPost(id) {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// 사진을 올리고 공개 URL을 돌려줌
export async function uploadImage(file, userId) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("photos").upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from("photos").getPublicUrl(path);
  return data.publicUrl;
}

// 새 글 작성 (사진 주소 포함)
export async function createPost({ content, imageUrl, user }) {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      content,
      image_url: imageUrl,
      user_id: user.id,
      username: displayName(user),
    })
    .select();

  if (error) throw error;
  return data[0];
}

// 글 삭제
export async function deletePost(id) {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}

// 글 수정
export async function updatePost(id, content) {
  const { data, error } = await supabase
    .from("posts")
    .update({ content })
    .eq("id", id)
    .select();

  if (error) throw error;
  return data[0];
}
