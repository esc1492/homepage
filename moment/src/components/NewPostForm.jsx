import { useState } from "react";
import MarkdownEditor from "./MarkdownEditor";
import { firstImageUrl } from "../lib/markdown";

function NewPostForm({ onAdd, onUploadImage }) {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (content.trim() === "") return;
    setBusy(true);
    setError("");
    try {
      await onAdd(content, firstImageUrl(content)); // 사진은 에디터가 이미 올렸습니다
      setContent("");
    } catch (err) {
      console.error("글 올리기 실패:", err);
      setError(err?.message || "글을 올리지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <MarkdownEditor
        value={content}
        onChange={setContent}
        onUploadImage={onUploadImage}
        disabled={busy}
      />
      <button type="submit" disabled={busy}>
        {busy ? "올리는 중…" : "올리기"}
      </button>
      {error && <p className="auth-error">{error}</p>}
    </form>
  );
}

export default NewPostForm;
