// 마크다운 문자열을 다루는 작은 도우미들 (DOM 없음 → node --test 로 검증)

const IMAGE = /!\[[^\]]*\]\(([^)\s]+)\)/;

export function hasImage(markdown) {
  return IMAGE.test(String(markdown || ""));
}

export function firstImageUrl(markdown) {
  const match = String(markdown || "").match(IMAGE);
  return match ? match[1] : null;
}

// 카드에 보여줄 짧은 평문 발췌. 마크다운 기호와 이미지는 걷어냅니다.
export function plainText(markdown, limit = 120) {
  let text = String(markdown || "");
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^\s*>\s?/gm, "");
  text = text.replace(/^\s*([-*+]|\d+\.)\s+/gm, "");
  text = text.replace(/[*_~`]/g, "");
  text = text.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, " ").trim();
  return text.length > limit ? text.slice(0, limit).trimEnd() + "…" : text;
}
