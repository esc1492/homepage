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

import { requireUser } from "../server/auth.mjs";
import { errorJson, json, methodNotAllowed } from "../server/http.mjs";
import { chunkText, decodeHeader, extractText, pickLanguages } from "../server/ocr-core.mjs";

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

export const config = { maxDuration: 60 };


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
      return methodNotAllowed();
    }

    try {
      await requireUser(request);
    } catch (error) {
      return errorJson(error);
    }

    try {
      const isTranslate = new URL(request.url).searchParams.has("translate");
      const payload = isTranslate ? await handleTranslate(request) : await handleOcr(request);

      if (payload.error) return json({ error: payload.error }, payload.status || 502);
      return json({ text: payload.text });
    } catch (error) {
      return errorJson(error);
    }
  },
};
