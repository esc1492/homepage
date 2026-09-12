import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 홈페이지(https://homepage-dwkim.vercel.app) 하위 경로 /album 으로 서빙
  base: "/album/",
  build: {
    // repo 루트의 album/ 으로 직접 출력 (Vercel은 빌드하지 않고 이 파일을 그대로 서빙)
    outDir: "../album",
    emptyOutDir: true,
  },
});
