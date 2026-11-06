// 화면에 보여줄 이름: 가입 시 입력한 이름 → 이메일 앞부분 → "익명"
export function displayName(user) {
  return user?.user_metadata?.username || user?.email?.split("@")[0] || "익명";
}
