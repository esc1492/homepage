/**
 * 홈페이지(https://homepage-dwkim.vercel.app) 하위 경로 /minesweeper 로 서빙합니다.
 *
 * ⚠️ basePath 와 서빙 폴더명(`minesweeper/`)은 반드시 일치해야 합니다.
 *    Next.js 는 자산을 `/minesweeper/_next/...` 로 참조하므로, 폴더명이 다르면 전부 404 가 됩니다.
 *    그래서 소스는 `minesweeper-src/`, 산출물은 `minesweeper/` 로 분리했습니다
 *    (tetris-src/ → tetris/ 와 같은 이유).
 */
const nextConfig = {
  output: 'export',
  basePath: '/minesweeper',
  // 라우트를 `/minesweeper/index.html` 로 출력 → 정적 호스트에서 디렉터리 인덱스로 자연 해석됨
  trailingSlash: true,
  // 정적 export 에서는 기본 이미지 최적화 로더를 쓸 수 없습니다
  images: { unoptimized: true },
  // 상위 저장소에도 package.json 이 있어 Next.js 가 워크스페이스 루트를 잘못 추론합니다.
  // 이 프로젝트 디렉터리로 고정합니다.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
