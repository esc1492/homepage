import { useEffect, useState } from "react";
import { Link } from "react-router";
import { fetchBoardPosts } from "../api/board";
import { plainText } from "../lib/markdown";

function BoardListPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBoardPosts()
      .then(setPosts)
      .catch((e) => setError(e.message || "글을 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="board">
      <div className="board-head">
        <h2>모든 글</h2>
        <Link className="board-write" to="/write">
          새 글 쓰기
        </Link>
      </div>

      {loading ? (
        <p className="loading">불러오는 중…</p>
      ) : error ? (
        <p className="auth-error">{error}</p>
      ) : posts.length === 0 ? (
        <p className="empty">아직 게시판 글이 없어요. 첫 글을 써보세요!</p>
      ) : (
        <ul className="board-list">
          {posts.map((post) => (
            <li key={post.id}>
              <Link to={"/" + post.id} className="board-item">
                <h3>{post.title}</h3>
                <p className="board-excerpt">
                  {plainText(post.body, 140) || "내용이 없어요."}
                </p>
                <div className="board-meta">
                  <span>{post.username}</span>
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  {post.tags?.length > 0 && (
                    <span className="board-tags">
                      {post.tags.map((tag) => (
                        <em key={tag}>#{tag}</em>
                      ))}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default BoardListPage;
