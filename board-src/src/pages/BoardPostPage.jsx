import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  fetchBoardPost,
  fetchAdjacentBoardPosts,
  deleteBoardPost,
} from "../api/board";
import MarkdownView from "../components/MarkdownView";

function BoardPostPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [adjacent, setAdjacent] = useState({ prev: null, next: null });
  const [error, setError] = useState("");

  useEffect(() => {
    setPost(null);
    setAdjacent({ prev: null, next: null });
    setError("");
    fetchBoardPost(id)
      .then(setPost)
      .catch((e) => setError(e.message || "글을 불러오지 못했어요."));
  }, [id]);

  // 이전·다음 글은 덧붙는 안내라, 실패해도 글 읽기를 막지 않고 표시만 생략합니다.
  useEffect(() => {
    if (!post) return;
    fetchAdjacentBoardPosts(post)
      .then(setAdjacent)
      .catch(() => setAdjacent({ prev: null, next: null }));
  }, [post]);

  async function handleDelete() {
    if (!confirm("이 글을 삭제할까요?")) return;
    try {
      await deleteBoardPost(id);
      navigate("/");
    } catch (e) {
      setError(e.message || "삭제하지 못했어요.");
    }
  }

  if (error) {
    return (
      <div className="board">
        <Link to="/" className="back">← 게시판으로</Link>
        <p className="auth-error">{error}</p>
      </div>
    );
  }

  if (!post) return <p className="loading">불러오는 중…</p>;

  const isMine = user && user.id === post.user_id;

  return (
    <div className="board">
      <article className="board-post">
        <h1 className="board-title">{post.title}</h1>
        <div className="board-meta">
          <span>{post.username}</span>
          <span>{new Date(post.created_at).toLocaleString()}</span>
          {post.updated_at !== post.created_at && <span>수정됨</span>}
        </div>
        {post.tags?.length > 0 && (
          <div className="board-tags">
            {post.tags.map((tag) => (
              <em key={tag}>#{tag}</em>
            ))}
          </div>
        )}

        <MarkdownView content={post.body} className="board-body" />

        {isMine && (
          <div className="board-actions">
            <Link className="board-edit" to={"/" + post.id + "/edit"}>수정</Link>
            <button className="board-del" onClick={handleDelete}>삭제</button>
          </div>
        )}
      </article>

      {(adjacent.prev || adjacent.next) && (
        <nav className="post-nav" aria-label="이전·다음 글">
          {adjacent.prev && (
            <Link to={"/" + adjacent.prev.id} className="post-nav-item">
              <span className="post-nav-arrow" aria-hidden="true">←</span>
              <span className="post-nav-text">
                <span className="post-nav-label">이전 포스트</span>
                <span className="post-nav-title">{adjacent.prev.title}</span>
              </span>
            </Link>
          )}
          {adjacent.next && (
            <Link to={"/" + adjacent.next.id} className="post-nav-item next">
              <span className="post-nav-arrow" aria-hidden="true">→</span>
              <span className="post-nav-text">
                <span className="post-nav-label">다음 포스트</span>
                <span className="post-nav-title">{adjacent.next.title}</span>
              </span>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

export default BoardPostPage;
