/**
 * VOCA 의 순수 core — 시트 좌표·제목·입력 정규화와 작업 순서.
 *
 * "조용히 틀리면 그럴듯한 오답이 나오는" 로직입니다 (CLAUDE.md 의 일회성 하네스 기록).
 * 네트워크·환경변수를 모르므로 그대로 테스트할 수 있습니다.
 *
 * ⚠️ 오류는 handler 와 같은 계약을 유지하려고 HttpError 를 그대로 던집니다.
 *    HttpError 는 상태·메시지만 가진 Error 이고 I/O 가 없습니다.
 */

import { HttpError } from "./http.mjs";

// 실수로 큰 쓰기가 실제 시트에 들어가는 것을 막는 상한입니다.
export const MAX_ROWS_PER_OP = 1000;

export function sheetIdFromUrl(url) {
  const match = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(String(url || ""));
  if (!match) throw new HttpError(400, `유효하지 않은 Google Sheets URL 입니다: ${url}`);
  return match[1];
}

/** A1 표기에서 시트 이름은 홑따옴표로 감싸고, 안의 홑따옴표는 두 번 씁니다. */
export function quoteTitle(title) {
  return `'${String(title).replace(/'/g, "''")}'`;
}

/** 1-based 열 번호 → A1 열 문자. */
export function colLetter(index) {
  let remaining = Number(index);
  let out = "";
  while (remaining > 0) {
    const rest = (remaining - 1) % 26;
    out = String.fromCharCode(65 + rest) + out;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return out;
}

export function cleanRows(raw) {
  if (!Array.isArray(raw) || !raw.length) throw new HttpError(400, "추가할 행이 없습니다.");
  if (raw.length > MAX_ROWS_PER_OP) {
    throw new HttpError(400, `한 번에 ${MAX_ROWS_PER_OP}행까지만 저장할 수 있습니다.`);
  }
  return raw.map((row) => (Array.isArray(row) ? row.map((cell) => (cell == null ? "" : String(cell))) : []));
}

// 순서를 고정합니다 — 원본의 탭별 처리 순서와 같게 맞춥니다.
//   새 시트 생성 → 삭제(내림차순) → 셀 수정 → 행 추가
//   (원본 탭 2 는 삭제를 먼저, 추가를 나중에 했습니다.)
const OP_ORDER = { createSheet: 0, delete: 1, update: 2, append: 3 };

/** 알려진 op 를 고정 순서로, 모르는 op 는 맨 뒤로 보냅니다 (handler 가 400 을 던집니다). */
export function orderOps(ops) {
  return [...ops].sort((a, b) => (OP_ORDER[a?.op] ?? 9) - (OP_ORDER[b?.op] ?? 9));
}

/** 셀 좌표를 1 이상의 정수로 검증하고 값을 문자열로 정규화합니다. */
export function normalizeCells(cells) {
  return (Array.isArray(cells) ? cells : []).map((cell) => {
    const row = Number(cell?.row);
    const col = Number(cell?.col);
    if (!Number.isInteger(row) || row < 1 || !Number.isInteger(col) || col < 1) {
      throw new HttpError(400, "셀 좌표는 1 이상의 정수여야 합니다.");
    }
    return { row, col, value: cell?.value == null ? "" : String(cell.value) };
  });
}

/** 행 번호를 1 이상의 정수로 검증합니다. */
export function normalizeRows(rows) {
  const parsed = (Array.isArray(rows) ? rows : []).map(Number);
  if (parsed.some((row) => !Number.isInteger(row) || row < 1)) {
    throw new HttpError(400, "행 번호는 1 이상의 정수여야 합니다.");
  }
  return parsed;
}

/** 삭제는 **큰 행부터** 해야 합니다. 작은 행을 먼저 지우면 뒤 인덱스가 밀립니다. */
export function descendingRows(rows) {
  return [...new Set(rows)].sort((a, b) => b - a);
}
