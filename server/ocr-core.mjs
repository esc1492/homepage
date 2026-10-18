/**
 * OCR 의 순수 core — CLOVA 응답 해석과 번역 청크 나누기.
 *
 * "조용히 틀리면 그럴듯한 오답이 나오는" 로직입니다 (CLAUDE.md 의 일회성 하네스 기록).
 * 네트워크·환경변수를 모르므로 그대로 테스트할 수 있습니다.
 */

// 한 번에 보낼 수 있는 길이에 한계가 있어 이 크기로 줄 단위로 나눕니다.
export const TRANSLATE_CHUNK = 1200;

/** 파일명은 헤더로 오므로 비ASCII 가 깨지지 않게 인코딩해 보냅니다. */
export function decodeHeader(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** 필드의 boundingPoly 에서 세로 범위를 뽑습니다. 꼭짓점이 없으면 (0, 0). */
export function yRange(field) {
  const vertices = field?.boundingPoly?.vertices || [];
  if (!vertices.length) return [0, 0];

  const ys = vertices.map((point) => point?.y || 0);
  return [Math.min(...ys), Math.max(...ys)];
}

/**
 * ocr_app.py:139-178 의 세로 겹침 휴리스틱을 그대로 옮긴 것입니다.
 * 앞 단어와 세로로 25% 넘게 겹치면 같은 줄로 봅니다.
 */
export function groupLines(fields) {
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
export function extractText(payload) {
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

/** ocr_app.py:206-208 의 언어 판정 휴리스틱입니다 — 한글이 30%를 넘으면 한국어. */
export function pickLanguages(text) {
  let hangul = 0;
  for (const char of text) {
    if (char >= "가" && char <= "힯") hangul++;
  }
  return hangul > text.length * 0.3 ? ["ko", "en"] : ["en", "ko"];
}

/** 줄 경계를 지키며 번역 요청 크기로 나눕니다. */
export function chunkText(text) {
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
