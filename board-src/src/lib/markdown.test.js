import test from "node:test";
import assert from "node:assert/strict";
import { hasImage, firstImageUrl, plainText } from "./markdown.js";

test("plainText: 제목·인용·강조·링크 기호를 걷어낸다", () => {
  const md = "## 제목\n> 인용\n**굵게**와 [링크](https://x.y)와 ~~취소~~";
  assert.equal(plainText(md), "제목\n인용\n굵게와 링크와 취소");
});

test("plainText: 이미지와 코드블록은 발췌에서 뺀다", () => {
  const md = "앞\n![사진](https://x/y.png)\n```js\nconst a = 1;\n```\n뒤";
  assert.equal(plainText(md), "앞\n뒤");
});

test("plainText: 개행은 남기고 빈 줄은 한 줄로 줄인다", () => {
  const md = "첫 줄\n둘째 줄\n\n\n셋째 줄";
  assert.equal(plainText(md), "첫 줄\n둘째 줄\n셋째 줄");
});

test("plainText: 길면 말줄임표를 붙인다", () => {
  const out = plainText("가".repeat(200), 10);
  assert.equal(out, "가".repeat(10) + "…");
});

test("plainText: 평문은 그대로 돌려준다", () => {
  assert.equal(plainText("오늘의 한 장면"), "오늘의 한 장면");
});

test("hasImage / firstImageUrl", () => {
  const md = "텍스트\n![a](https://x/1.png)\n![b](https://x/2.png)";
  assert.equal(hasImage(md), true);
  assert.equal(firstImageUrl(md), "https://x/1.png");
  assert.equal(firstImageUrl("텍스트만"), null);
  assert.equal(hasImage("텍스트만"), false);
});
