import test from "node:test";
import assert from "node:assert/strict";
import { applyCommand, insertAtCursor } from "./markdownEdit.js";

test("굵게: 선택 영역을 ** 로 감싼다", () => {
  const next = applyCommand(
    { value: "hello", selectionStart: 0, selectionEnd: 5 },
    "bold"
  );
  assert.equal(next.value, "**hello**");
  assert.equal(next.selectionStart, 2);
  assert.equal(next.selectionEnd, 7);
});

test("굵게: 선택이 없으면 '텍스트'를 넣고 선택한다", () => {
  const next = applyCommand(
    { value: "abc", selectionStart: 3, selectionEnd: 3 },
    "bold"
  );
  assert.equal(next.value, "abc**텍스트**");
  assert.equal(next.value.slice(next.selectionStart, next.selectionEnd), "텍스트");
});

test("굵게: 이미 감싸진 선택은 벗긴다", () => {
  const next = applyCommand(
    { value: "**hi**", selectionStart: 2, selectionEnd: 4 },
    "bold"
  );
  assert.equal(next.value, "hi");
});

test("제목: 같은 레벨을 다시 누르면 접두사가 빠진다", () => {
  const added = applyCommand(
    { value: "제목", selectionStart: 1, selectionEnd: 1 },
    "heading2"
  );
  assert.equal(added.value, "## 제목");
  const removed = applyCommand(added, "heading2");
  assert.equal(removed.value, "제목");
});

test("제목: 다른 레벨로는 교체된다", () => {
  const next = applyCommand(
    { value: "# 제목", selectionStart: 3, selectionEnd: 3 },
    "heading3"
  );
  assert.equal(next.value, "### 제목");
});

test("인용: 여러 줄을 접두사로 감싸고 다시 누르면 벗긴다", () => {
  const quoted = applyCommand(
    { value: "a\nb", selectionStart: 0, selectionEnd: 3 },
    "blockquote"
  );
  assert.equal(quoted.value, "> a\n> b");
  const unquoted = applyCommand(quoted, "blockquote");
  assert.equal(unquoted.value, "a\nb");
});

test("코드블록: 선택 영역을 펜스로 감싼다", () => {
  const next = applyCommand(
    { value: "const a = 1;", selectionStart: 0, selectionEnd: 12 },
    "codeblock"
  );
  assert.equal(next.value, "```\nconst a = 1;\n```");
});

test("링크: 선택이 없으면 URL 부분을 선택해 준다", () => {
  const next = applyCommand(
    { value: "", selectionStart: 0, selectionEnd: 0 },
    "link"
  );
  assert.equal(next.value, "[링크텍스트](URL)");
  assert.equal(next.value.slice(next.selectionStart, next.selectionEnd), "URL");
});

test("링크: 선택 영역을 라벨로 쓴다", () => {
  const next = applyCommand(
    { value: "velog", selectionStart: 0, selectionEnd: 5 },
    "link"
  );
  assert.equal(next.value, "[velog](URL)");
  assert.equal(next.value.slice(next.selectionStart, next.selectionEnd), "URL");
});

test("insertAtCursor: 선택 영역을 대체하고 커서를 끝으로 옮긴다", () => {
  const next = insertAtCursor(
    { value: "abcDEF", selectionStart: 3, selectionEnd: 6 },
    "![사진](https://x/y.png)\n"
  );
  assert.equal(next.value, "abc![사진](https://x/y.png)\n");
  assert.equal(next.selectionStart, next.value.length);
});
