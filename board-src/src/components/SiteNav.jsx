import { useEffect, useRef, useState } from "react";

// 햄버거가 여는 바로가기 메뉴. shared/sitenav.mjs 의 SITE_MENU 와 같은 목록입니다.
// 게시판·앨범은 공유 module 범위 밖(docs/adr/0001)이라 복사본을 씁니다 — 한쪽을 고치면 다른 쪽도 보십시오.
const MENU = [
  {
    title: "바로가기",
    items: [
      { icon: "🏠", title: "홈", desc: "시작 페이지", href: "/" },
      { icon: "🌤", title: "날씨", desc: "서울 날씨 · 미세먼지 · 주간 예보", href: "/#weather-card" },
      { icon: "✅", title: "할 일", desc: "나의 할 일 · 가족 할 일", href: "/#todo-card" },
      { icon: "🐭", title: "챗봇", desc: "미키", href: "/chat" },
      { icon: "📚", title: "학습", desc: "영단어", href: "/voca" },
      { icon: "🔍", title: "OCR", desc: "이미지 텍스트 추출", href: "/ocr" },
      { icon: "📷", title: "앨범", desc: "사진 게시판", href: "/album" },
      { icon: "📝", title: "게시판", desc: "나의 관심사 글쓰기", href: "/board" },
    ],
  },
  {
    title: "게임",
    items: [
      { icon: "🎮", title: "TETRIS", desc: "", href: "/tetris" },
      { icon: "🧱", title: "ARKANOID", desc: "", href: "/arkanoid" },
      { icon: "💣", title: "MINESWEEPER", desc: "", href: "/minesweeper" },
      { icon: "🔢", title: "SUDOKU", desc: "", href: "/sudoku" },
      { icon: "🏃", title: "LODE RUNNER", desc: "", href: "/lode-runner" },
    ],
  },
];

function SiteNav({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef(null);

  // 문 아이콘: 앱을 닫습니다.
  // SPA 는 화면 이동마다 히스토리가 쌓여서 history.back() 은 앱 안을 되짚어 갈 뿐 닫지 못합니다.
  // 홈페이지에서 새 탭으로 열었으면 실제로 닫히고, 직접 연 탭처럼 닫을 수 없으면 홈으로 이동합니다.
  const goBack = () => {
    window.close();
    window.location.href = "/";
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div ref={rootRef}>
      <nav className="sitenav" aria-label="사이트 내비게이션">
        <span
          className={menuOpen ? "sitenav-brand open" : "sitenav-brand"}
          onClick={() => setMenuOpen((v) => !v)}
          title="바로가기 메뉴"
          aria-label="바로가기 메뉴"
          aria-expanded={menuOpen}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMenuOpen((v) => !v);
            }
          }}
        >
          <span className="triple-line">
            <span className="line"></span>
            <span className="line"></span>
            <span className="line"></span>
          </span>
          <svg className="triple-x" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M1.5 2 L16.5 17 M16.5 2 L1.5 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </span>
        <span className="sitenav-right">
          <span
            className="sitenav-door"
            onClick={goBack}
            title="뒤로 가기"
            aria-label="뒤로 가기"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") goBack();
            }}
          >
            <svg
              className="door-open"
              viewBox="0 0 27 36"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="27"
              height="36"
            >
              <rect x="3" y="4.5" width="18" height="27" rx="1.5" />
              <path d="M3 6 L13.5 9 L13.5 27 L3 30" />
              <path d="M11.5 18 H8.5" />
              <circle cx="11.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span
            className={user ? "sitenav-icon logged-in" : "sitenav-icon"}
            data-tip={user ? "로그인됨" : "로그인"}
            title={user ? "로그인됨" : "로그인"}
            aria-label="로그인 상태"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="28"
              height="42"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </span>
        </span>
      </nav>
      {menuOpen && (
        <div className="sitenav-menu open">
          <div className="sitenav-menu-inner">
            {MENU.map((section) => (
              <div className="sitenav-menu-section" key={section.title}>
                <h3>{section.title}</h3>
                <div className="sitenav-menu-items">
                  {section.items.map((item) => (
                    <a
                      className="sitenav-menu-item"
                      href={item.href}
                      key={item.href}
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="icon">{item.icon}</span>
                      <span className="info">
                        <span className="title">{item.title}</span>
                        {item.desc ? <span className="desc">{item.desc}</span> : null}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SiteNav;
