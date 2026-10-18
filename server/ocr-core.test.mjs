import test from "node:test";
import assert from "node:assert/strict";

import {
  TRANSLATE_CHUNK,
  chunkText,
  decodeHeader,
  extractText,
  groupLines,
  pickLanguages,
  yRange,
} from "./ocr-core.mjs";

const field = (text, top, bottom) => ({
  inferText: text,
  boundingPoly: { vertices: [{ y: top }, { y: bottom }] },
});

test("decodeHeader: 인코딩된 파일명을 풀고, 깨진 값은 그대로 둔다", () => {
  assert.equal(decodeHeader("%ED%95%9C%EA%B8%80.pdf"), "한글.pdf");
  assert.equal(decodeHeader("%E0%A4%A"), "%E0%A4%A");
});

test("yRange: 꼭짓점이 없으면 (0,0), 있으면 최소·최대 y", () => {
  assert.deepEqual(yRange({}), [0, 0]);
  assert.deepEqual(yRange({ boundingPoly: { vertices: [{ y: 30 }, { y: 10 }] } }), [10, 30]);
});

test("groupLines: 세로로 25% 넘게 겹치면 같은 줄", () => {
  assert.deepEqual(groupLines([field("a", 0, 10), field("b", 1, 11)]), ["a b"]);
  assert.deepEqual(groupLines([field("a", 0, 10), field("b", 40, 50)]), ["a", "b"]);
});

test("groupLines: 빈 텍스트는 건너뛴다", () => {
  assert.deepEqual(groupLines([field("", 0, 10), field("a", 0, 10)]), ["a"]);
});

test("extractText: 빈 응답과 인식 실패를 오류로 돌려준다", () => {
  assert.deepEqual(extractText({}), { error: "OCR 결과가 비어 있습니다." });
  assert.deepEqual(extractText({ images: [{ inferResult: "ERROR", message: "x" }] }), {
    error: "OCR 인식 실패: x",
  });
});

test("extractText: 페이지는 빈 줄 하나로 잇고, 빈 페이지는 건너뛴다", () => {
  const payload = {
    images: [
      { fields: [field("첫", 0, 10)] },
      { fields: [field("둘", 0, 10)] },
      { fields: [] },
    ],
  };
  assert.deepEqual(extractText(payload), { text: "첫\n\n둘" });
});

test("pickLanguages: 한글 비율 30% 초과면 ko→en", () => {
  assert.deepEqual(pickLanguages("안녕하세요"), ["ko", "en"]);
  assert.deepEqual(pickLanguages("hello"), ["en", "ko"]);
  assert.deepEqual(pickLanguages("ab가"), ["ko", "en"]);
});

test("chunkText: 줄 경계를 지키며 나누고, 빈 입력은 빈 배열", () => {
  assert.deepEqual(chunkText(""), []);
  assert.deepEqual(chunkText("a\nb"), ["a\nb"]);

  const long = "x".repeat(TRANSLATE_CHUNK);
  const chunks = chunkText(`${long}\ny`);
  assert.deepEqual(chunks, [long, "y"]);
});
