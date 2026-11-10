import { Link } from "react-router";
import { supabase } from "../lib/supabase";
import { displayName } from "../lib/displayName";

function Header({ user }) {
  const username = displayName(user);

  return (
    <header className="header">
      <div>
        {/* 앱 아이콘과 제목 어디를 눌러도 처음 화면(모든 글)으로 갑니다. */}
        <Link to="/" className="header-brand">
          <span className="header-logo" aria-hidden="true">📝</span>
          <h1>게시판</h1>
        </Link>
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
