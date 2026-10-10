// 아이폰 기본 카메라 포맷(HEIC)은 Chrome·Edge·Firefox 가 그리지 못합니다.
// 그대로 올리면 글에는 사진이 붙지만 화면에는 alt 텍스트("첨부 사진")만 남습니다.
// (2026-10-11 실제 발생 — 안드로이드 Chrome 에서 아이폰 HEIC 를 올린 건)
// 업로드 직전에 heic2any(libheif wasm)로 JPEG 로 바꿉니다.

const HEIC_NAME = /\.(heic|heif)$/i;

function isHeic(file) {
  // 안드로이드 파일 선택기는 MIME 을 비워 보내는 경우가 있어 확장자도 함께 봅니다
  return file.type === "image/heic" || file.type === "image/heif" || HEIC_NAME.test(file.name);
}

// HEIC 면 JPEG File 로 바꿔 돌려주고, 아니면 원본을 그대로 돌려줍니다.
export async function toUploadable(file) {
  if (!isHeic(file)) return file;

  // heic2any 는 1.29MB 라, HEIC 를 실제로 고른 사람만 받도록 동적 import 합니다.
  //
  // ⚠️ package.json 의 main 이 UMD 라 export 형태가 번들 방식에 따라 다릅니다.
  //    dev 는 default 로, 프로덕션 청크는 이름이 압축된 단일 export(`export{O0 as h}`)로
  //    나옵니다 — dev 에서만 검증하면 프로덕션에서 조용히 깨집니다 (2026-10-11 실제 확인).
  //    그래서 함수인 export 를 찾아 씁니다.
  const mod = await import("heic2any");
  const heic2any = [mod.default, ...Object.values(mod)].find((v) => typeof v === "function");

  let converted;
  try {
    converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  } catch (err) {
    // 변환에 실패하면 원본을 올리지 않습니다 — 올려도 화면에 안 보이기 때문입니다
    console.error("HEIC 변환 실패:", err);
    throw new Error("사진을 변환하지 못했습니다. JPEG 로 저장한 뒤 다시 올려주세요.");
  }

  // 한 파일에 여러 장이 든 HEIC(연사)면 첫 장만 씁니다
  const blob = Array.isArray(converted) ? converted[0] : converted;
  const name = file.name.replace(HEIC_NAME, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
