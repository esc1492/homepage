import { useState } from "react";
import { addLike, removeLike } from "../api/likes";

function PostCard({ post, user, count = 0, initialLiked = false, onDelete }) {
  // 내가 이미 누른 좋아요인지 DB에서 받아 시작 (하트 토글은 이후 로컬에서 관리)
  const [liked, setLiked] = useState(initialLiked);
  const isMine = user && user.id === post.user_id;

  async function toggleLike() {
    if (!user) return;
    try {
      if (liked) {
        await removeLike(post.id, user.id);
        setLiked(false);
      } else {
        await addLike(post.id, user.id);
        setLiked(true);
      }
    } catch (err) {
      // 실패하면 하트 상태를 바꾸지 않는다 (낙관적 갱신 취소)
      console.error("좋아요 처리 실패:", err);
    }
  }

  return (
    <article className="card">
      <div className="card-head">
        <strong>{post.username}</strong>
        <span className="time">{new Date(post.created_at).toLocaleString()}</span>
      </div>
      <p className="card-body">{post.content}</p>
      {post.image_url && (
        <img className="card-image" src={post.image_url} alt="첨부 사진" />
      )}
      <button className="like" onClick={toggleLike}>♥ {count}</button>
      {isMine && (
        <button className="card-del" onClick={() => onDelete(post.id)}>삭제</button>
      )}
    </article>
  );
}

export default PostCard;
