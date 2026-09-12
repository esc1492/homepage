import { useState } from "react";

function NewPostForm({ onAdd }) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (content.trim() === "" && !file) return;
    setBusy(true);
    setError("");
    try {
      await onAdd(content, file); // 글 내용과 사진을 부모에게 전달
      setContent("");
      setFile(null);
    } catch (err) {
      console.error("글 올리기 실패:", err);
      setError(err?.message || "글을 올리지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <textarea
        className="form-input"
        placeholder="오늘의 한 장면을 적어보세요"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button type="submit" disabled={busy}>
        {busy ? "올리는 중…" : "올리기"}
      </button>
      {error && <p className="auth-error">{error}</p>}
    </form>
  );
}

export default NewPostForm;
