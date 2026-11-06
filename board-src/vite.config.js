import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 홈페이지(https://homepage-dwkim.vercel.app) 하위 경로 /board 로 서빙
export default defineConfig({
  plugins: [react()],
  base: "/board/",
  build: {
    // repo 루트의 board/ 으로 직접 출력 (Vercel은 빌드하지 않고 이 파일을 그대로 서빙)
    outDir: "../board",
    emptyOutDir: true,
  },
});
