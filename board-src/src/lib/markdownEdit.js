// 마크다운 편집 순수 함수 모음.
// textarea 상태({ value, selectionStart, selectionEnd })를 받아 새 상태를 돌려줍니다.
// DOM 을 모르므로 node --test 로 그대로 검증합니다.

function lineBounds(value, index) {
  const start = value.lastIndexOf("\n", index - 1) + 1;
  const found = value.indexOf("\n", index);
  const end = found === -1 ? value.length : found;
  return { start, end };
}

function replaceRange(value, start, end, text, caret) {
  return {
    value: value.slice(0, start) + text + value.slice(end),
    selectionStart: caret,
    selectionEnd: caret,
  };
}

// 선택 영역을 마커로 감싸고, 이미 감싸져 있으면 벗깁니다.
function toggleWrap(state, marker, placeholder) {
  const { value, selectionStart: start, selectionEnd: end } = state;
  const selected = value.slice(start, end);
  const len = marker.length;

  const wrappedOutside =
    value.slice(start - len, start) === marker && value.slice(end, end + len) === marker;
  if (wrappedOutside) {
    const inner = value.slice(0, start - len) + selected + value.slice(end + len);
    return {
      value: inner,
      selectionStart: start - len,
      selectionEnd: end - len,
    };
  }

  if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= len * 2) {
    const inner = selected.slice(len, selected.length - len);
    return {
      value: value.slice(0, start) + inner + value.slice(end),
      selectionStart: start,
      selectionEnd: start + inner.length,
    };
  }

  if (!selected) {
    const text = placeholder;
    const insert = marker + text + marker;
    const next = replaceRange(value, start, end, insert, start + len);
    next.selectionEnd = start + len + text.length;
    return next;
  }

  const next = replaceRange(value, start, end, marker + selected + marker, start + len);
  next.selectionEnd = end + len;
  return next;
}

function setHeading(state, level) {
  const { value, selectionStart: start } = state;
  const { start: lineStart, end: lineEnd } = lineBounds(value, start);
  const line = value.slice(lineStart, lineEnd);
  const existing = line.match(/^(#{1,4}) /);

  let nextLine;
  if (existing && existing[1].length === level) {
    nextLine = line.slice(existing[0].length); // 같은 레벨이면 해제
  } else if (existing) {
    nextLine = "#".repeat(level) + " " + line.slice(existing[0].length);
  } else {
    nextLine = "#".repeat(level) + " " + line;
  }

  const delta = nextLine.length - line.length;
  const caret = Math.max(lineStart, start + delta);
  return replaceRange(value, lineStart, lineEnd, nextLine, caret);
}

function toggleBlockquote(state) {
  const { value, selectionStart: start, selectionEnd: end } = state;
  const first = lineBounds(value, start);
  const last = lineBounds(value, end);
  const block = value.slice(first.start, last.end);
  const lines = block.split("\n");
  const quoted = lines.every((line) => line === "" || line.startsWith("> "));

  const nextLines = lines.map((line) => {
    if (quoted) return line.replace(/^> /, "");
    return line === "" ? line : "> " + line;
  });

  const nextBlock = nextLines.join("\n");
  // 블록 전체를 선택해 두어, 다시 누르면 같은 범위가 해제되게 합니다.
  return {
    value: value.slice(0, first.start) + nextBlock + value.slice(last.end),
    selectionStart: first.start,
    selectionEnd: first.start + nextBlock.length,
  };
}

function insertCodeBlock(state) {
  const { value, selectionStart: start, selectionEnd: end } = state;
  const selected = value.slice(start, end);
  if (!selected) {
    const insert = "```\n\n```";
    return {
      value: value.slice(0, start) + insert + value.slice(end),
      selectionStart: start + 4,
      selectionEnd: start + 4,
    };
  }
  const insert = "```\n" + selected + "\n```";
  return {
    value: value.slice(0, start) + insert + value.slice(end),
    selectionStart: start + 4,
    selectionEnd: start + 4 + selected.length,
  };
}

function insertLink(state) {
  const { value, selectionStart: start, selectionEnd: end } = state;
  const selected = value.slice(start, end);
  const label = selected || "링크텍스트";
  const insert = "[" + label + "](URL)";
  const urlStart = start + 1 + label.length + 2; // '[' + label + ']('
  return {
    value: value.slice(0, start) + insert + value.slice(end),
    selectionStart: urlStart,
    selectionEnd: urlStart + 3,
  };
}

export function applyCommand(state, command) {
  switch (command) {
    case "heading1":
      return setHeading(state, 1);
    case "heading2":
      return setHeading(state, 2);
    case "heading3":
      return setHeading(state, 3);
    case "heading4":
      return setHeading(state, 4);
    case "bold":
      return toggleWrap(state, "**", "텍스트");
    case "italic":
      return toggleWrap(state, "_", "텍스트");
    case "strike":
      return toggleWrap(state, "~~", "텍스트");
    case "blockquote":
      return toggleBlockquote(state);
    case "codeblock":
      return insertCodeBlock(state);
    case "link":
      return insertLink(state);
    default:
      return state;
  }
}

// 커서 위치에 문자열을 끼워 넣고 커서를 끝으로 옮깁니다.
export function insertAtCursor(state, text) {
  const { value, selectionStart: start, selectionEnd: end } = state;
  const caret = start + text.length;
  return {
    value: value.slice(0, start) + text + value.slice(end),
    selectionStart: caret,
    selectionEnd: caret,
  };
}
