// VOCA(영단어 학습) API — 기존 Streamlit 앱(voca/app.py)을 Vercel 함수로 옮긴 것입니다.
//
// 이전 대비 달라진 점은 네 가지입니다.
//   1. Supabase 로그인 토큰을 검증하고 **이메일 허용목록**까지 확인합니다. 서비스 계정이 시트
//      쓰기 권한을 가지므로, 토큰만 확인하면 앨범 회원가입으로 만들어진 다른 계정도 동완님의
//      학습 데이터를 읽고 고칠 수 있습니다. 허용목록이 비어 있으면 **전부 거부**합니다.
//   2. 스프레드시트 ID 허용목록(VOCA_SHEET_IDS)을 둡니다. 없으면 이 함수가 "서비스 계정이
//      닿을 수 있는 아무 시트나 조작하는 프록시"가 됩니다.
//   3. 쓰기를 묶어 보냅니다. 기존 판은 변경 셀마다 update_cell 을 호출해 30셀을 고치면 30회
//      요청이었습니다(Sheets 한도는 분당 쓰기 60회). 지금은 values.batchUpdate ·
//      batchUpdate(DeleteDimension) · 다중 행 append 로 각각 1회입니다.
//   4. gspread/google-auth 대신 node:crypto 로 JWT 를 직접 서명합니다 — 새 의존성 0.
//      scope 도 spreadsheets 만 요청합니다. 기존 SCOPES 의 drive.readonly 는 실제로 쓰이지
//      않았습니다 (open_by_key·worksheets() 는 Sheets API v4 입니다. 2026-09-23 확인).
//
// 값 입력 방식은 gspread 판과 같게 맞췄습니다 — 셀 수정·헤더 쓰기는 gspread update(raw=True)
// 이므로 RAW, 행 추가는 sheets.py 가 USER_ENTERED 를 명시하므로 USER_ENTERED 입니다.
// RAW 는 "3/4" 를 문자열로, USER_ENTERED 는 날짜로 해석합니다. 원본 동작을 유지합니다.

import { createSign } from "node:crypto";

const SUPABASE_URL = "https://oggzgullnohqehthewuw.supabase.co";
const SUPABASE_KEY = "sb_publishable_XVSK5Evl0W64_7h-XLZ1cQ_rnzo3qMC";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

const RAW = "RAW";
const USER_ENTERED = "USER_ENTERED";

// 원본 create_worksheet 의 기본값입니다.
const NEW_SHEET_ROWS = 100;
const NEW_SHEET_COLS = 26;

// 실수로 큰 쓰기가 실제 시트에 들어가는 것을 막는 상한입니다.
const MAX_ROWS_PER_OP = 1000;

// app.py 의 시스템 프롬프트를 그대로 옮겼습니다.
const EXTRACT_SYSTEM = [
  "You are an English vocabulary extractor. Given OCR text, extract English words and phrases that are worth studying for Korean learners.",
  "",
  "Rules:",
  "1. Extract individual words, idioms, and phrasal verbs that have educational value.",
  "2. Filter out basic stop words (the, a, an, is, are, was, were, be, been, have, has, had, do, does, did, will, would, can, could, may, might, shall, should, it, they, we, you, he, she, I, me, him, her, us, them, my, your, his, our, their, this, that, these, those, in, on, at, to, for, of, from, by, with, about, as, into, through, during, before, after, above, below, between, under, again, then, than, so, if, but, or, and, not, no, nor, yet, both, either, neither, each, every, all, any, few, more, most, other, some, such, only, own, same, very, just, because, as, until, while).",
  "3. For idioms and phrasal verbs, include the full phrase (e.g., 'look up to', 'break down').",
  "4. Provide accurate, natural Korean translations.",
  "5. If a word appears in multiple forms (run, ran, running), use the base form.",
  "6. Output ONLY a valid JSON array of objects. No markdown, no code fences, no explanation.",
  "",
  "Output format:",
  '[{"english": "word or phrase", "korean": "한국어 번역"}, ...]',
].join("\n");

export const config = { maxDuration: 60 };

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// ── 인증 ─────────────────────────────────────────────────────────
// Supabase 에 토큰을 물어 사용자인지 확인한 뒤, 허용된 이메일인지까지 봅니다.
async function requireOwner(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) throw new HttpError(401, "Unauthorized");

  const token = header.slice(7).trim();
  if (!token) throw new HttpError(401, "Unauthorized");

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new HttpError(401, "Unauthorized");

  let user;
  try {
    user = await res.json();
  } catch {
    throw new HttpError(401, "Unauthorized");
  }

  const allowed = (process.env.VOCA_ALLOWED_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  // 허용목록이 비어 있으면 전부 거부합니다 — 환경변수 누락이 "전부 허용"이 되면 안 됩니다.
  if (!allowed.length) {
    throw new HttpError(403, "VOCA_ALLOWED_EMAILS 가 설정되지 않아 요청을 거부했습니다.");
  }
  if (!allowed.includes(String(user?.email || "").toLowerCase())) {
    throw new HttpError(403, "허용되지 않은 계정입니다.");
  }
}

// ── Google 서비스 계정 ────────────────────────────────────────────
// 웜 인스턴스가 재사용되므로(Fluid Compute) 토큰을 모듈 수준에 캐시합니다.
let tokenCache = { value: null, expiresAt: 0 };

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.value && tokenCache.expiresAt > now + 60_000) return tokenCache.value;

  const encoded = process.env.VOCA_SA_B64;
  if (!encoded) throw new HttpError(500, "VOCA_SA_B64 환경변수가 설정되지 않았습니다.");

  let account;
  try {
    account = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  } catch {
    throw new HttpError(500, "VOCA_SA_B64 를 해석하지 못했습니다. base64 한 줄인지 확인해 주십시오.");
  }
  if (!account.client_email || !account.private_key) {
    throw new HttpError(500, "서비스 계정 JSON 에 client_email 또는 private_key 가 없습니다.");
  }

  const b64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const issuedAt = Math.floor(now / 1000);
  const unsigned = `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url({
    iss: account.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + 3600,
  })}`;

  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString("base64url")}`;

  let res;
  try {
    res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
  } catch (error) {
    throw new HttpError(502, `Google 토큰 요청 실패: ${error.message}`);
  }
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    throw new HttpError(502, `Google 토큰 발급 실패 (HTTP ${res.status}): ${detail}`);
  }

  const data = await res.json();
  tokenCache = {
    value: data.access_token,
    expiresAt: now + (Number(data.expires_in) || 3600) * 1000,
  };
  return tokenCache.value;
}

async function sheetsApi(path, init = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${SHEETS_API}/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text();
    let message = detail.slice(0, 300);
    try {
      message = JSON.parse(detail)?.error?.message || message;
    } catch {
      // 구글은 항상 JSON 을 주지만, 아니면 본문 앞부분을 그대로 씁니다.
    }
    // 원본은 WorksheetNotFound 를 따로 잡아 안내했습니다.
    if (/unable to parse range/i.test(message)) {
      throw new HttpError(404, "워크시트를 찾을 수 없습니다.");
    }
    throw new HttpError(502, `Google Sheets 오류 (HTTP ${res.status}): ${message}`);
  }
  return res.status === 204 ? null : res.json();
}

// ── 시트 지정 ─────────────────────────────────────────────────────
function sheetIdFromUrl(url) {
  const match = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(String(url || ""));
  if (!match) throw new HttpError(400, `유효하지 않은 Google Sheets URL 입니다: ${url}`);
  return match[1];
}

function assertSheetAllowed(id) {
  const allowed = (process.env.VOCA_SHEET_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!allowed.length) throw new HttpError(403, "VOCA_SHEET_IDS 가 설정되지 않아 요청을 거부했습니다.");
  if (!allowed.includes(id)) throw new HttpError(403, "허용되지 않은 스프레드시트입니다.");
}

/** A1 표기에서 시트 이름은 홑따옴표로 감싸고, 안의 홑따옴표는 두 번 씁니다. */
function quoteTitle(title) {
  return `'${String(title).replace(/'/g, "''")}'`;
}

/** 1-based 열 번호 → A1 열 문자. */
function colLetter(index) {
  let remaining = Number(index);
  let out = "";
  while (remaining > 0) {
    const rest = (remaining - 1) % 26;
    out = String.fromCharCode(65 + rest) + out;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return out;
}

// ── 읽기 ─────────────────────────────────────────────────────────
/** [{ sheetId, title }] — 삭제는 제목이 아니라 sheetId 를 요구합니다. */
async function getSheetMeta(id) {
  const data = await sheetsApi(`${id}?fields=sheets.properties(sheetId,title)`);
  return (data?.sheets || []).map((sheet) => ({
    sheetId: sheet?.properties?.sheetId,
    title: sheet?.properties?.title,
  }));
}

async function readValues(id, worksheet) {
  const range = encodeURIComponent(quoteTitle(worksheet));
  const data = await sheetsApi(`${id}/values/${range}?majorDimension=ROWS`);
  return data?.values || [];
}

// ── 쓰기 ─────────────────────────────────────────────────────────
async function createSheet(id, title, headers) {
  const width = Array.isArray(headers) ? headers.length : 0;
  await sheetsApi(`${id}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title,
              gridProperties: {
                rowCount: NEW_SHEET_ROWS,
                // 헤더가 기본 열 수보다 넓으면 시트도 그만큼 넓혀야 기록됩니다.
                columnCount: Math.max(NEW_SHEET_COLS, width),
              },
            },
          },
        },
      ],
    }),
  });

  if (width) {
    // 범위를 주지 않으면 A1 부터 헤더 개수만큼 기록됩니다 (원본 create_worksheet 와 같습니다).
    const range = encodeURIComponent(`${quoteTitle(title)}!A1:${colLetter(width)}1`);
    await sheetsApi(`${id}/values/${range}?valueInputOption=${RAW}`, {
      method: "PUT",
      body: JSON.stringify({ values: [headers] }),
    });
  }
}

async function updateCells(id, worksheet, cells) {
  const data = cells.map(({ row, col, value }) => ({
    range: `${quoteTitle(worksheet)}!${colLetter(col)}${row}`,
    values: [[value]],
  }));
  await sheetsApi(`${id}/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ valueInputOption: RAW, data }),
  });
}

async function deleteRows(id, worksheet, rows, meta) {
  const sheet = meta.find((entry) => entry.title === worksheet);
  if (!sheet) throw new HttpError(404, `워크시트 '${worksheet}' 를 찾을 수 없습니다.`);

  // 여러 행을 지울 때는 **큰 행부터** 지워야 합니다. 작은 행을 먼저 지우면 뒤 인덱스가 밀려
  // 엉뚱한 행이 지워집니다 (원본도 내림차순으로 정렬해 처리했습니다).
  const sorted = [...new Set(rows)].sort((a, b) => b - a);
  await sheetsApi(`${id}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: sorted.map((row) => ({
        deleteDimension: {
          range: { sheetId: sheet.sheetId, dimension: "ROWS", startIndex: row - 1, endIndex: row },
        },
      })),
    }),
  });
}

async function appendRows(id, worksheet, rows) {
  // insertDataOption 을 보내지 않습니다 — 원본(gspread append_row)도 보내지 않아 API 기본값
  // OVERWRITE 로 동작했습니다. 동작을 그대로 유지합니다.
  const range = encodeURIComponent(quoteTitle(worksheet));
  await sheetsApi(`${id}/values/${range}:append?valueInputOption=${USER_ENTERED}`, {
    method: "POST",
    body: JSON.stringify({ values: rows }),
  });
}

// ── 작업 적용 ─────────────────────────────────────────────────────
// 순서를 고정합니다 — 원본의 탭별 처리 순서와 같게 맞춥니다.
//   새 시트 생성 → 삭제(내림차순) → 셀 수정 → 행 추가
//   (원본 탭 2 는 삭제를 먼저, 추가를 나중에 했습니다.)
const OP_ORDER = { createSheet: 0, delete: 1, update: 2, append: 3 };

function cleanRows(raw) {
  if (!Array.isArray(raw) || !raw.length) throw new HttpError(400, "추가할 행이 없습니다.");
  if (raw.length > MAX_ROWS_PER_OP) {
    throw new HttpError(400, `한 번에 ${MAX_ROWS_PER_OP}행까지만 저장할 수 있습니다.`);
  }
  return raw.map((row) => (Array.isArray(row) ? row.map((cell) => (cell == null ? "" : String(cell))) : []));
}

async function applyOps(id, defaultWorksheet, ops) {
  if (!Array.isArray(ops) || !ops.length) throw new HttpError(400, "적용할 작업이 없습니다.");

  const ordered = [...ops].sort(
    (a, b) => (OP_ORDER[a?.op] ?? 9) - (OP_ORDER[b?.op] ?? 9),
  );

  const applied = { created: 0, updated: 0, deleted: 0, appended: 0 };
  let meta = null;
  const needMeta = async () => (meta ??= await getSheetMeta(id));

  for (const op of ordered) {
    const worksheet = String(op?.ws || defaultWorksheet || "");

    switch (op?.op) {
      case "createSheet": {
        const title = String(op.title || "").trim();
        if (!title) throw new HttpError(400, "새 워크시트 이름이 필요합니다.");

        const existing = (await needMeta()).map((entry) => entry.title);
        if (existing.includes(title)) {
          throw new HttpError(409, `'${title}' 시트가 이미 존재합니다.`);
        }

        const headers = Array.isArray(op.headers) ? op.headers.map((value) => String(value)) : null;
        await createSheet(id, title, headers);
        meta = null; // 시트 목록이 바뀌었습니다
        applied.created += 1;
        break;
      }

      case "update": {
        if (!worksheet) throw new HttpError(400, "워크시트 이름이 필요합니다.");
        const cells = (Array.isArray(op.cells) ? op.cells : []).map((cell) => {
          const row = Number(cell?.row);
          const col = Number(cell?.col);
          if (!Number.isInteger(row) || row < 1 || !Number.isInteger(col) || col < 1) {
            throw new HttpError(400, "셀 좌표는 1 이상의 정수여야 합니다.");
          }
          return { row, col, value: cell?.value == null ? "" : String(cell.value) };
        });
        if (!cells.length) break;

        await updateCells(id, worksheet, cells);
        applied.updated += cells.length;
        break;
      }

      case "delete": {
        if (!worksheet) throw new HttpError(400, "워크시트 이름이 필요합니다.");
        const rows = (Array.isArray(op.rows) ? op.rows : []).map(Number);
        if (!rows.length) break;
        if (rows.some((row) => !Number.isInteger(row) || row < 1)) {
          throw new HttpError(400, "행 번호는 1 이상의 정수여야 합니다.");
        }

        await deleteRows(id, worksheet, rows, await needMeta());
        applied.deleted += rows.length;
        break;
      }

      case "append": {
        if (!worksheet) throw new HttpError(400, "워크시트 이름이 필요합니다.");
        const rows = cleanRows(op.rows);
        await appendRows(id, worksheet, rows);
        applied.appended += rows.length;
        break;
      }

      default:
        throw new HttpError(400, `알 수 없는 작업입니다: ${op?.op}`);
    }
  }

  return applied;
}

// ── 단어 추출 ─────────────────────────────────────────────────────
async function extractWords(text) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new HttpError(500, "ANTHROPIC_API_KEY 가 설정되지 않았습니다.");

  // 실제 제공자는 DeepSeek 이고 Anthropic 호환 엔드포인트를 씁니다 (api/chat.js 와 같습니다).
  const base = (process.env.ANTHROPIC_BASE_URL || "https://api.deepseek.com/anthropic").replace(/\/+$/, "");
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

  let res;
  try {
    res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: EXTRACT_SYSTEM,
        messages: [
          {
            role: "user",
            content: `Extract English vocabulary from this text and provide Korean translations:\n\n${text}`,
          },
        ],
      }),
    });
  } catch (error) {
    throw new HttpError(502, `네트워크 오류: ${error.message}`);
  }

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    throw new HttpError(502, `단어 추출 API 오류 (HTTP ${res.status}): ${detail}`);
  }

  const data = await res.json();
  // 응답에는 thinking 블록이 먼저 오고 text 블록이 뒤따릅니다 — text 만 뽑습니다 (실측 확인).
  const raw = (data?.content || [])
    .filter((block) => block?.type === "text")
    .map((block) => block.text || "")
    .join("")
    .trim();

  let cleaned = raw;
  if (cleaned.includes("```json")) {
    cleaned = cleaned.split("```json")[1].split("```")[0].trim();
  } else if (cleaned.includes("```")) {
    cleaned = cleaned.split("```")[1].split("```")[0].trim();
  }

  let list;
  try {
    list = JSON.parse(cleaned);
  } catch {
    throw new HttpError(502, "모델 응답을 JSON 으로 해석하지 못했습니다. 다시 시도해 주십시오.");
  }
  if (!Array.isArray(list)) throw new HttpError(502, "모델이 배열이 아닌 값을 돌려주었습니다.");

  // 추출된 단어가 없으면 빈 배열입니다 — 안내는 화면에서 합니다.
  return list.map((item) => ({
    english: item?.english == null ? "" : String(item.english),
    korean: item?.korean == null ? "" : String(item.korean),
  }));
}

// ── 진입점 ────────────────────────────────────────────────────────
//   GET  /api/voca?sheet=<url>            → { sheets: [...] }
//   GET  /api/voca?sheet=<url>&ws=<name>  → { values: [[...]] }   (0행 = 헤더)
//   POST /api/voca?sheet=<url>&ws=<name>  → { applied: {...} }    (본문 = { ops: [...] })
//   POST /api/voca?extract=1              → { words: [...] }      (본문 = 텍스트)
export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);

      if (request.method !== "GET" && request.method !== "POST") {
        return json({ error: "Method Not Allowed" }, 405);
      }

      await requireOwner(request);

      if (request.method === "GET") {
        const id = sheetIdFromUrl(url.searchParams.get("sheet"));
        assertSheetAllowed(id);

        const worksheet = url.searchParams.get("ws");
        if (!worksheet) return json({ sheets: (await getSheetMeta(id)).map((entry) => entry.title) });

        return json({ values: await readValues(id, worksheet) });
      }

      if (url.searchParams.has("extract")) {
        const text = (await request.text()).trim();
        if (!text) return json({ error: "추출할 텍스트가 없습니다." }, 400);
        return json({ words: await extractWords(text) });
      }

      const id = sheetIdFromUrl(url.searchParams.get("sheet"));
      assertSheetAllowed(id);

      let payload;
      try {
        payload = JSON.parse(await request.text());
      } catch {
        return json({ error: "요청 본문을 해석하지 못했습니다." }, 400);
      }

      const applied = await applyOps(id, url.searchParams.get("ws") || "", payload?.ops);
      return json({ applied });
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      return json({ error: `${error?.name || "Error"}: ${error?.message || error}` }, 500);
    }
  },
};
