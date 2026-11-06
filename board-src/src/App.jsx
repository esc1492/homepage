import { useState, useEffect } from "react";
import { Routes, Route } from "react-router";
import { supabase } from "./lib/supabase";
import SiteNav from "./components/SiteNav";
import Header from "./components/Header";
import AuthPage from "./pages/AuthPage";
import BoardListPage from "./pages/BoardListPage";
import BoardPostPage from "./pages/BoardPostPage";
import BoardWritePage from "./pages/BoardWritePage";

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;

  return (
    <div className="app">
      <SiteNav user={user} />
      <Header user={user} />
      {!user ? (
        <AuthPage />
      ) : (
        <Routes>
          <Route path="/" element={<BoardListPage user={user} />} />
          <Route path="/write" element={<BoardWritePage user={user} />} />
          <Route path="/:id" element={<BoardPostPage user={user} />} />
          <Route path="/:id/edit" element={<BoardWritePage user={user} />} />
        </Routes>
      )}
    </div>
  );
}

export default App;
