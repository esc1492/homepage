import { useState, useEffect } from "react";
import { Routes, Route } from "react-router";
import { supabase } from "./lib/supabase";
import Header from "./components/Header";
import FeedPage from "./pages/FeedPage";
import PostDetailPage from "./pages/PostDetailPage";
import AuthPage from "./pages/AuthPage";

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // 1) 처음에 현재 세션을 한 번 가져옴
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // 2) 로그인/로그아웃이 일어날 때마다 세션을 갱신
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 3) 정리: 더 이상 감지하지 않도록 구독 해제
    return () => data.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;

  return (
    <div className="app">
      <Header user={user} />
      {!user ? (
        <AuthPage />
      ) : (
        <Routes>
          <Route path="/" element={<FeedPage user={user} />} />
          <Route path="/posts/:id" element={<PostDetailPage user={user} />} />
        </Routes>
      )}
    </div>
  );
}

export default App;
