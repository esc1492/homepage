// 스모크 테스트 전용 — 이 저장소의 정적 배포에서 api/ 함수가 실제로 빌드되는지 확인한다.
// 확인이 끝나면 삭제합니다. (계획 §2)
export default {
  async fetch() {
    return Response.json({ ok: true, from: "vercel-function" });
  },
};
