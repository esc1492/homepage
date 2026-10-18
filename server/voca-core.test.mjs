import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_ROWS_PER_OP,
  cleanRows,
  colLetter,
  descendingRows,
  normalizeCells,
  normalizeRows,
  orderOps,
  quoteTitle,
  sheetIdFromUrl,
} from "./voca-core.mjs";

const status = (code) => (error) => error.status === code;

test("sheetIdFromUrl: URL 에서 ID 를 뽑고, 아니면 400", () => {
  assert.equal(
    sheetIdFromUrl("https://docs.google.com/spreadsheets/d/1AbC-d_ef/edit#gid=0"),
    "1AbC-d_ef",
  );
  assert.throws(() => sheetIdFromUrl("https://example.com"), status(400));
});

test("quoteTitle: 홑따옴표를 두 번 써서 감싼다", () => {
  assert.equal(quoteTitle("시트"), "'시트'");
  assert.equal(quoteTitle("a'b"), "'a''b'");
});

test("colLetter: 1-based 열 번호 → A1 열 문자", () => {
  assert.equal(colLetter(1), "A");
  assert.equal(colLetter(26), "Z");
  assert.equal(colLetter(27), "AA");
  assert.equal(colLetter(52), "AZ");
  assert.equal(colLetter(53), "BA");
  assert.equal(colLetter(702), "ZZ");
  assert.equal(colLetter(703), "AAA");
});

test("cleanRows: 빈 입력·상한 초과는 400, 값은 문자열로 정규화", () => {
  assert.throws(() => cleanRows([]), status(400));
  assert.throws(
    () => cleanRows(Array.from({ length: MAX_ROWS_PER_OP + 1 }, () => [])),
    status(400),
  );
  assert.deepEqual(cleanRows([[1, null], ["x"], "bad"]), [["1", ""], ["x"], []]);
});

test("orderOps: createSheet → delete → update → append, 모르는 op 는 마지막", () => {
  const ordered = orderOps([
    { op: "append" },
    { op: "update" },
    { op: "unknown" },
    { op: "delete" },
    { op: "createSheet" },
  ]);
  assert.deepEqual(
    ordered.map((op) => op.op),
    ["createSheet", "delete", "update", "append", "unknown"],
  );
});

test("normalizeCells: 좌표를 검증하고 값을 문자열로 만든다", () => {
  assert.deepEqual(normalizeCells([{ row: "2", col: 3, value: null }]), [
    { row: 2, col: 3, value: "" },
  ]);
  assert.throws(() => normalizeCells([{ row: 0, col: 1 }]), status(400));
  assert.throws(() => normalizeCells([{ row: 1, col: 1.5 }]), status(400));
});

test("normalizeRows: 1 이상의 정수만 허용", () => {
  assert.deepEqual(normalizeRows(["3", 1]), [3, 1]);
  assert.throws(() => normalizeRows([0]), status(400));
  assert.throws(() => normalizeRows([1.5]), status(400));
});

test("descendingRows: 중복을 제거하고 큰 행부터 정렬한다", () => {
  assert.deepEqual(descendingRows([3, 1, 3, 2]), [3, 2, 1]);
});
