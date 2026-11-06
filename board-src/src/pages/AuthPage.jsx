import { useState } from "react";
import { supabase } from "../lib/supabase";

function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" 또는 "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
  }

  return (
    <div className="auth">
      <h2>{mode === "login" ? "로그인" : "회원가입"}</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        {mode === "signup" && (
          <input
            placeholder="이름"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        )}
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">{mode === "login" ? "로그인" : "가입하기"}</button>
      </form>

      {error && <p className="auth-error">{error}</p>}

      <button
        className="auth-switch"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login" ? "계정이 없나요? 회원가입" : "이미 계정이 있나요? 로그인"}
      </button>
    </div>
  );
}

export default AuthPage;
