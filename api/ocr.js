// OCR API — 기존 Streamlit 앱(ocr_app.py)을 Vercel 함수로 옮긴 것입니다.
//
// 이전 대비 달라진 점은 세 가지입니다.
//   1. Supabase 로그인 토큰을 검증합니다. CLOVA OCR 은 호출량이 과금되는 API 라
//      Streamlit 판(인증 없음)처럼 열어두면 비용 위험이 그대로 남습니다.
//   2. 브라우저가 원본 바이트를 그대로 보냅니다. CLOVA 는 base64 를 요구하므로
//      인코딩은 여기서 한 번만 합니다 (JSON 으로 받으면 33% 팽창합니다).
//   3. PDF 를 우리가 굽지 않고 CLOVA 에 그대로 넘깁니다. CLOVA General OCR V2 는
//      pdf 입력을 직접 받고 최대 10페이지를 인식합니다. 기존 판은 pymupdf 로
//      1페이지를 PNG 로 구워 미리보기에 쓰고, OCR 에도 그 PNG 를 보냈습니다.
//
// 줄 묶기(ocr_app.py:139-178)와 언어 판정(ocr_app.py:206-208)은 그대로 옮겼습니다.

import { randomUUID } from "node:crypto";

const SUPABASE_URL = "https://oggzgullnohqehthewuw.supabase.co";
const SUPABASE_KEY = "sb_publishable_XVSK5Evl0W64_7h-XLZ1cQ_rnzo3qMC";

// CLOVA 문서상 한도는 이미지 1장 50MB 입니다. 넘으면 CLOVA 에 보내기 전에 거릅니다.
const MAX_BYTES = 50 * 1024 * 1024;

// 브라우저가 보내는 Content-Type → CLOVA 가 요구하는 format 값.
// CLOVA 는 tif·tiff 도 받지만 UI 가 다루지 않으므로 여기서도 받지 않습니다.
const FORMATS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

// deep_translator 가 쓰던 것과 같은 계열의 구글 비공식 번역 엔드포인트입니다.
// 서버에서 호출하므로 CORS 를 우회할 필요가 없습니다.
// 한 번에 보낼 수 있는 길이에 한계가 있어 이 크기로 줄 단위로 나눕니다.
const TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single";
const TRANSLATE_CHUNK = 1200;

export const config = { maxDuration: 60 };

/** Supabase 에 토큰을 물어 사용자인지 확인합니다. 별도 시크릿이 필요 없습니다. */
async function isAuthorized(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return false;

  const token = header.slice(7).trim();
  if (!token) return false;

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  });
  return res.ok;
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

/** 파일명은 헤더로 오므로 비ASCII 가 깨지지 않게 인코딩해 보냅니다. */
function decodeHeader(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** 필드의 boundingPoly 에서 세로 범위를 뽑습니다. 꼭짓점이 없으면 (0, 0). */
function yRange(field) {
  const vertices = field?.boundingPoly?.vertices || [];
  if (!vertices.length) return [0, 0];

  const ys = vertices.map((point) => point?.y || 0);
  return [Math.min(...ys), Math.max(...ys)];
}

/**
 * ocr_app.py:139-178 의 세로 겹침 휴리스틱을 그대로 옮긴 것입니다.
 * 앞 단어와 세로로 25% 넘게 겹치면 같은 줄로 봅니다.
 */
function groupLines(fields) {
  const lines = [];
  let current = [];
  let prevTop = 0;
  let prevBottom = 0;

  for (const field of fields) {
    const text = field?.inferText || "";
    if (!text) continue;

    const [top, bottom] = yRange(field);
    const height = bottom - top;

    if (!current.length) {
      current = [text];
      prevTop = top;
      prevBottom = bottom;
      continue;
    }

    const overlap = Math.max(0, Math.min(prevBottom, bottom) - Math.max(prevTop, top));
    const prevHeight = prevBottom - prevTop;
    const minHeight = prevHeight > 0 && height > 0 ? Math.min(prevHeight, height) : 0;

    if (minHeight > 0 && overlap > minHeight * 0.25) {
      current.push(text);
    } else {
      lines.push(current.join(" "));
      current = [text];
    }

    prevTop = top;
    prevBottom = bottom;
  }

  if (current.length) lines.push(current.join(" "));
  return lines;
}

/** CLOVA 응답에서 페이지별 텍스트를 뽑아 하나로 잇습니다. */
function extractText(payload) {
  const images = payload?.images || [];
  if (!images.length) return { error: "OCR 결과가 비어 있습니다." };

  const pages = [];
  for (const image of images) {
    if (image?.inferResult === "ERROR") {
      return { error: `OCR 인식 실패: ${image.message || "알 수 없는 오류"}` };
    }

    const lines = groupLines(image?.fields || []);
    if (lines.length) pages.push(lines.join("\n"));
  }

  // 페이지 구분자를 따로 넣지 않습니다 — 다운로드 결과가 텍스트 하나여야 하므로
  // 빈 줄 하나로만 나눕니다.
  return { text: pages.join("\n\n") };
}

async function callClova({ bytes, format, name }) {
  const endpoint = process.env.OCR_INVOKE_URL;
  const secret = process.env.OCR_SECRET_KEY;

  if (!endpoint || !secret) {
    return {
      error: "CLOVA OCR 환경변수(OCR_INVOKE_URL · OCR_SECRET_KEY)가 설정되지 않았습니다.",
    };
  }

  const requestBody = {
    version: "V2",
    requestId: randomUUID(),
    timestamp: Date.now(),
    images: [
      {
        format,
        name,
        data: Buffer.from(bytes).toString("base64"),
      },
    ],
  };

  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "X-OCR-SECRET": secret },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    return { error: `네트워크 오류: ${error.message}` };
  }

  if (!res.ok) {
    const detail = await res.text();
    return { error: `OCR API 오류 (HTTP ${res.status}): ${detail.slice(0, 200)}` };
  }

  try {
    return { result: await res.json() };
  } catch {
    return { error: "OCR 응답을 해석하지 못했습니다." };
  }
}

/** ocr_app.py:206-208 의 언어 판정 휴리스틱입니다 — 한글이 30%를 넘으면 한국어. */
function pickLanguages(text) {
  let hangul = 0;
  for (const char of text) {
    if (char >= "가" && char <= "힯") hangul++;
  }
  return hangul > text.length * 0.3 ? ["ko", "en"] : ["en", "ko"];
}

/** 줄 경계를 지키며 번역 요청 크기로 나눕니다. */
function chunkText(text) {
  const chunks = [];
  let current = "";

  for (const line of text.split("\n")) {
    if (current && current.length + line.length + 1 > TRANSLATE_CHUNK) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current}\n${line}` : line;
  }

  if (current) chunks.push(current);
  return chunks;
}

async function translate(text) {
  const [source, target] = pickLanguages(text);
  const parts = [];

  for (const chunk of chunkText(text)) {
    const url =
      `${TRANSLATE_URL}?client=gtx&dt=t&sl=${source}&tl=${target}` +
      `&q=${encodeURIComponent(chunk)}`;

    let res;
    try {
      res = await fetch(url);
    } catch (error) {
      return { error: `네트워크 오류: ${error.message}` };
    }

    if (!res.ok) return { error: `번역 오류 (HTTP ${res.status})` };

    let data;
    try {
      data = await res.json();
    } catch {
      return { error: "번역 응답을 해석하지 못했습니다." };
    }

    // 응답은 [[["번역문","원문",…], …], …] 형태입니다.
    parts.push((data?.[0] || []).map((segment) => segment?.[0] || "").join(""));
  }

  return { text: parts.join("\n") };
}

/** 브라우저가 보낸 원본 바이트를 CLOVA 에 넘기고 텍스트로 정리해 돌려줍니다. */
async function handleOcr(request) {
  const contentType = (request.headers.get("content-type") || "").split(";")[0].trim();
  const format = FORMATS[contentType];
  if (!format) {
    return { error: "지원하지 않는 형식입니다. (jpg · png · pdf)", status: 415 };
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) return { error: "빈 파일입니다.", status: 400 };
  if (bytes.length > MAX_BYTES) {
    return { error: "파일이 너무 큽니다. 50MB 이하만 처리할 수 있습니다.", status: 413 };
  }

  const name = decodeHeader(request.headers.get("x-file-name") || "") || `upload.${format}`;

  const upstream = await callClova({ bytes, format, name });
  if (upstream.error) return upstream;

  return extractText(upstream.result);
}

async function handleTranslate(request) {
  const text = (await request.text()).trim();
  if (!text) return { error: "번역할 텍스트가 없습니다.", status: 400 };

  return translate(text);
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (!(await isAuthorized(request))) {
      return new Response("Unauthorized", { status: 401 });
    }

    const isTranslate = new URL(request.url).searchParams.has("translate");
    const payload = isTranslate ? await handleTranslate(request) : await handleOcr(request);

    if (payload.error) return json({ error: payload.error }, payload.status || 502);
    return json({ text: payload.text });
  },
};
