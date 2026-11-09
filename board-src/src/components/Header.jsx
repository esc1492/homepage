import { supabase } from "../lib/supabase";
import { displayName } from "../lib/displayName";

function Header({ user }) {
  const username = displayName(user);

  return (
    <header className="header">
      <div>
        <h1>게시판</h1>
        <p>나의 관심사를 기록해 보세요.</p>
      </div>
      {user && (
        <div className="header-user">
          <span>{username}님</span>
          <button onClick={() => supabase.auth.signOut()}>로그아웃</button>
        </div>
      )}
    </header>
  );
}

export default Header;
