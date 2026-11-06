import { supabase } from "../lib/supabase";
import { displayName } from "../lib/displayName";

function Header({ user }) {
  const username = displayName(user);

  return (
    <header className="header">
      <div>
        <h1>게시판</h1>
        <p>velog 스타일로 기록을 남겨보세요.</p>
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
