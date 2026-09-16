/**
 * 홈페이지(https://homepage-dwkim.vercel.app) 하위 경로 /tetris 로 서빙합니다.
 *
 * ⚠️ basePath 와 서빙 폴더명(`tetris/`)은 반드시 일치해야 합니다.
 *    Next.js 는 자산을 `/tetris/_next/...` 로 참조하므로, 폴더명이 다르면 전부 404 가 됩니다.
 *    그래서 소스는 `tetris-src/`, 산출물은 `tetris/` 로 분리했습니다 (앨범의 moment/ → album/ 과 동일한 이유).
 */
const nextConfig = {
  output: 'export',
  basePath: '/tetris',
  // 라우트를 `/tetris/index.html` 로 출력 → 정적 호스트에서 디렉터리 인덱스로 자연 해석됨
  trailingSlash: true,
  // 정적 export 에서는 기본 이미지 최적화 로더를 쓸 수 없습니다 (현재 이미지 없음, 향후 대비)
  images: { unoptimized: true },
  // new Audio(`${process.env.NEXT_PUBLIC_BASE_PATH}/audio/x.mp3`) 용.
  // ⚠️ basePath 는 문자열 URL 에 자동 적용되지 않습니다.
  env: { NEXT_PUBLIC_BASE_PATH: '/tetris' },
  // 상위 저장소에도 package-lock.json 이 있어 Next.js 가 워크스페이스 루트를 잘못 추론합니다.
  // 이 프로젝트 디렉터리로 고정합니다.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
