/**
 * shared/ 의 SiteNav module 을 Next.js 프로젝트로 복사합니다.
 *
 * Next 세 프로젝트는 `turbopack.root` 를 각자 디렉터리로 고정해 두었습니다
 * (상위 저장소의 package-lock.json 때문에 워크스페이스 루트를 잘못 추론하는 문제).
 * 그래서 공유 파일을 상대 경로로 import 하지 않고 빌드 직전에 복사합니다.
 *
 * 복사본은 gitignore 대상입니다 — 원본은 항상 shared/ 입니다.
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const projects = ['tetris-src', 'arkanoid-src', 'minesweeper-src'];
const files = ['sitenav.mjs', 'sitenav.css'];

for (const project of projects) {
  const target = join(root, project, 'shared');
  await mkdir(target, { recursive: true });
  for (const file of files) {
    await copyFile(join(root, 'shared', file), join(target, file));
  }
}

console.log(`sitenav synced → ${projects.join(', ')}`);
