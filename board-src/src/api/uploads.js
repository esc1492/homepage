import { supabase } from "../lib/supabase";
import { toUploadable } from "../lib/heic";

// 게시판 이미지 업로드. 앨범과 같은 photos 버킷을 쓰되 board/ 아래에 둡니다.
// HEIC 는 브라우저가 그리지 못하므로 올리기 전에 JPEG 로 바꿉니다.
export async function uploadImage(file, userId) {
  const upload = await toUploadable(file);
  const ext = upload.name.split(".").pop();
  const path = `${userId}/board/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("photos").upload(path, upload);
  if (error) throw error;

  const { data } = supabase.storage.from("photos").getPublicUrl(path);
  return data.publicUrl;
}
