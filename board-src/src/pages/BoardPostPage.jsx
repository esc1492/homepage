import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { fetchBoardPost, deleteBoardPost } from "../api/board";
import MarkdownView from "../components/MarkdownView";

function BoardPostPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBoardPost(id)
      .then(setPost)
      .catch((e) => setError(e.message || "글을 불러오지 못했어요."));
  }, [id]);

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
      <Link to="/" className="back">← 게시판으로</Link>

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
    </div>
  );
}

export default BoardPostPage;
