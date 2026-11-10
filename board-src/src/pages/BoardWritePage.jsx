import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { fetchBoardPost, createBoardPost, updateBoardPost } from "../api/board";
import { uploadImage } from "../api/uploads";
import MarkdownEditor from "../components/MarkdownEditor";

// "회고, 개발, #일상" → ["회고", "개발", "일상"]
function parseTags(text) {
  const tags = text
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);
  return [...new Set(tags)];
}

function BoardWritePage({ user }) {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) return;
    fetchBoardPost(id)
      .then((post) => {
        if (post.user_id !== user.id) {
          navigate("/" + id, { replace: true });
          return;
        }
        setTitle(post.title);
        setTagsText((post.tags || []).join(", "));
        setBody(post.body);
      })
      .catch((e) => setError(e.message || "글을 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, [editing, id, user.id, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = { title: title.trim(), body, tags: parseTags(tagsText) };
      const saved = editing
        ? await updateBoardPost(id, payload)
        : await createBoardPost({ ...payload, user });
      navigate("/" + saved.id);
    } catch (err) {
      console.error("게시판 저장 실패:", err);
      setError(err.message || "저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="loading">불러오는 중…</p>;

  return (
    <div className="board">
      <form className="board-form" onSubmit={handleSubmit}>
        <input
          className="board-title-input"
          placeholder="제목을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
        />
        <input
          className="board-tags-input"
          placeholder="태그 (쉼표로 구분, 예: 회고, 개발)"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          disabled={busy}
        />

        <MarkdownEditor
          value={body}
          onChange={setBody}
          onUploadImage={(file) => uploadImage(file, user.id)}
          disabled={busy}
        />

        {error && <p className="auth-error">{error}</p>}

        <div className="board-form-actions">
          <Link className="board-cancel" to={editing ? "/" + id : "/"}>취소</Link>
          <button type="submit" disabled={busy}>
            {busy ? "저장 중…" : editing ? "수정하기" : "발행하기"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default BoardWritePage;
