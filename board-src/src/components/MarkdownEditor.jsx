import { useDeferredValue, useEffect, useRef, useState } from "react";
import MarkdownView from "./MarkdownView";
import { applyCommand, insertAtCursor } from "../lib/markdownEdit";

const COMMANDS = [
  { command: "heading1", label: "H1", title: "제목 1" },
  { command: "heading2", label: "H2", title: "제목 2" },
  { command: "heading3", label: "H3", title: "제목 3" },
  { command: "heading4", label: "H4", title: "제목 4" },
  { separator: true },
  { command: "bold", label: "B", title: "굵게" },
  { command: "italic", label: "I", title: "기울임" },
  { command: "strike", label: "S", title: "취소선" },
  { separator: true },
  { command: "blockquote", label: "❝", title: "인용" },
  { command: "link", label: "🔗", title: "링크" },
  { command: "image", label: "🖼", title: "이미지" },
  { command: "codeblock", label: "</>", title: "코드 블록" },
];

function readState(textarea) {
  return {
    value: textarea.value,
    selectionStart: textarea.selectionStart,
    selectionEnd: textarea.selectionEnd,
  };
}

function MarkdownEditor({ value, onChange, onUploadImage, disabled = false }) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const pendingSelection = useRef(null);
  // 파일 선택기가 열리면 textarea 포커스가 풀려 커서 위치를 잃을 수 있어, 열기 직전 상태를 기억합니다.
  const uploadState = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const deferredValue = useDeferredValue(value);

  // 명령 실행 후 커서/선택 위치를 되돌려 놓습니다.
  useEffect(() => {
    const pending = pendingSelection.current;
    const textarea = textareaRef.current;
    if (!pending || !textarea) return;
    textarea.focus();
    textarea.setSelectionRange(pending[0], pending[1]);
    pendingSelection.current = null;
  }, [value]);

  const busy = disabled || uploading;

  function runCommand(command) {
    const textarea = textareaRef.current;
    if (!textarea || busy) return;
    if (command === "image") {
      uploadState.current = readState(textarea);
      fileInputRef.current?.click();
      return;
    }
    const next = applyCommand(readState(textarea), command);
    pendingSelection.current = [next.selectionStart, next.selectionEnd];
    onChange(next.value);
  }

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = ""; // 같은 파일을 다시 고를 수 있게 비웁니다
    if (!files.length || !onUploadImage) return;

    const textarea = textareaRef.current;
    const captured = uploadState.current;
    uploadState.current = null;
    let state = textarea
      ? readState(textarea)
      : { value, selectionStart: value.length, selectionEnd: value.length };
    if (captured) {
      // 선택기는 커서를 흔들 수 있으므로, 열기 직전 위치를 우선합니다.
      const start = Math.min(captured.selectionStart, state.value.length);
      const end = Math.min(captured.selectionEnd, state.value.length);
      state = { value: state.value, selectionStart: start, selectionEnd: end };
    }

    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const url = await onUploadImage(file);
        const alt = file.name.replace(/\.[^.]+$/, "");
        const needsNewline =
          state.selectionStart > 0 && state.value[state.selectionStart - 1] !== "\n";
        const prefix = needsNewline ? "\n" : "";
        state = insertAtCursor(state, prefix + "![" + alt + "](" + url + ")\n");
        onChange(state.value);
      }
      pendingSelection.current = [state.selectionStart, state.selectionEnd];
    } catch (err) {
      console.error("이미지 업로드 실패:", err);
      setError("이미지를 올리지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="editor">
      <div className="editor-toolbar" role="toolbar" aria-label="마크다운 서식">
        {COMMANDS.map((item, index) =>
          item.separator ? (
            <span key={"sep-" + index} className="sep" aria-hidden="true" />
          ) : (
            <button
              key={item.command}
              type="button"
              aria-label={item.title}
              title={item.title}
              onClick={() => runCommand(item.command)}
              disabled={busy}
            >
              {item.label}
            </button>
          )
        )}
      </div>

      <textarea
        ref={textareaRef}
        className="editor-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="오늘의 한 장면을 적어보세요. 마크다운을 쓸 수 있어요."
        disabled={disabled}
        spellCheck={false}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleFiles}
      />

      <div className="editor-actions">
        <span className="editor-hint">
          {uploading ? "이미지 올리는 중…" : "이미지는 여러 장 한 번에 올릴 수 있어요"}
        </span>
        <button
          type="button"
          className="editor-preview-toggle"
          onClick={() => setShowPreview((open) => !open)}
          aria-expanded={showPreview}
        >
          {showPreview ? "미리보기 닫기" : "미리보기"}
        </button>
      </div>

      {error && <p className="auth-error">{error}</p>}

      {showPreview && (
        <div className="editor-preview">
          {deferredValue.trim() ? (
            <MarkdownView content={deferredValue} />
          ) : (
            <p className="editor-empty">아직 쓴 내용이 없어요.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default MarkdownEditor;
