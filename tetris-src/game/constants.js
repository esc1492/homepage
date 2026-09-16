// 원본 tetris_streamlit.py 의 GAME_HTML_TEMPLATE 에서 그대로 이관한 값들입니다.
// 수치를 바꾸면 게임 난이도/모양이 바뀌므로 원본과의 일치를 유지하십시오.

export const COLS = 10;
export const ROWS = 20;
export const CELL = 20; // 논리 셀 크기(px)

export const BOARD_W = COLS * CELL; // 200
export const BOARD_H = ROWS * CELL; // 400
export const NEXT_SIZE = 80;

// index 0 은 빈 칸(사용하지 않음)
export const COLORS = [
  '',
  '#FF4C4C',
  '#FF9900',
  '#FFD700',
  '#4CAF50',
  '#29B6F6',
  '#7E57C2',
  '#EC407A',
];

// index 0 은 placeholder — 실제 테트로미노는 1..7
export const SHAPES = [
  [],
  [[1, 1, 1, 1]], // I
  [[2, 2], [2, 2]], // O
  [[0, 3, 0], [3, 3, 3]], // T
  [[4, 0], [4, 0], [4, 4]], // J
  [[0, 5], [0, 5], [5, 5]], // L
  [[6, 0], [6, 6], [0, 6]], // S
  [[0, 7], [7, 7], [7, 0]], // Z
];

export const PIECE_KINDS = 7;

// 1줄/2줄/3줄/4줄 삭제 기본 점수 (레벨이 곱해짐)
export const LINE_SCORES = [0, 100, 300, 500, 800];
export const LINES_PER_LEVEL = 10;

// 하강 간격: max(80, 800 - (level-1)*70) ms
export const MIN_DROP_MS = 80;
export const BASE_DROP_MS = 800;
export const DROP_STEP_MS = 70;

// 백그라운드 탭 복귀 시 한 프레임에 수십 번 하강하는 폭주를 막는 상한
export const MAX_FRAME_DELTA_MS = 200;

export function speedForLevel(level) {
  return Math.max(MIN_DROP_MS, BASE_DROP_MS - (level - 1) * DROP_STEP_MS);
}
