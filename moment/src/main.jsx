import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* 홈페이지 하위 경로 /album 으로 서빙되므로 basename 필수.
        슬래시 없이 "/album" — "/album/" 로 쓰면 경로 제거에 실패해 라우트가 매칭되지 않습니다. */}
    <BrowserRouter basename="/album">
      <App />
    </BrowserRouter>
  </StrictMode>
);
