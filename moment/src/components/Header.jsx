import { supabase } from "../lib/supabase";
import { displayName } from "../lib/displayName";

function Header({ user }) {
  const username = displayName(user);

  return (
    <header className="header">
      <div>
        <h1>모먼트</h1>
        <p>오늘의 한 장면을 남겨보세요.</p>
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
