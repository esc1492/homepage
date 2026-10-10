import { useRef, useState } from "react";

function NewPostForm({ onAdd }) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // <input type="file"> 은 비제어라 React 가 value 를 쓰지 않습니다.
  // setFile(null) 만 하면 상태는 비어도 화면에는 직전 파일명이 남습니다.
  const fileInput = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (content.trim() === "" && !file) return;
    setBusy(true);
    setError("");
    try {
      await onAdd(content, file); // 글 내용과 사진을 부모에게 전달
      setContent("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = ""; // 화면의 파일명도 함께 비움
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
        ref={fileInput}
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
