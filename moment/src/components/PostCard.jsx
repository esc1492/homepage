import { useState } from "react";
import { addLike, removeLike } from "../api/likes";

function PostCard({ post, user, count = 0, onDelete }) {
  const [liked, setLiked] = useState(false);
  const isMine = user && user.id === post.user_id;

  async function toggleLike() {
    if (!user) return;
    if (liked) {
      await removeLike(post.id, user.id);
      setLiked(false);
    } else {
      await addLike(post.id, user.id);
      setLiked(true);
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
