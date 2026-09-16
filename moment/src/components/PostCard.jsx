import { useState } from "react";
import { addLike, removeLike } from "../api/likes";

function PostCard({ post, user, count = 0, initialLiked = false, onDelete }) {
  // 내가 이미 누른 좋아요인지 DB에서 받아 시작 (하트 토글은 이후 로컬에서 관리)
  const [liked, setLiked] = useState(initialLiked);
  const isMine = user && user.id === post.user_id;

  // ⚠️ FeedPage 가 이 카드를 <Link> 로 감싸므로 카드 전체가 앵커입니다.
  //    버튼 클릭이 앵커로 버블링되면 ♥ 나 삭제를 눌러도 상세 페이지로 이동해 버립니다.
  //    preventDefault(링크 이동 취소) + stopPropagation(Link 의 onClick 차단) 둘 다 필요합니다.
  async function toggleLike(e) {
    e.preventDefault();
    e.stopPropagation();
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

  // toggleLike 와 같은 이유로 앵커 전파를 막습니다 (삭제 후 상세 페이지로 튀지 않도록).
  function handleDelete(e) {
    e.preventDefault();
    e.stopPropagation();
    onDelete(post.id);
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
        <button className="card-del" onClick={handleDelete}>삭제</button>
      )}
    </article>
  );
}

export default PostCard;
