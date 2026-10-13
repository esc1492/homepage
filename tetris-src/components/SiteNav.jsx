'use client';

function SiteNav() {
  // 문 아이콘: history.back() 후 실패 시 / 로 이동
  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  // 햄버거: 홈페이지로 직접 이동
  const goHome = () => {
    window.location.href = "/";
  };

  return (
    <nav className="sitenav" aria-label="사이트 내비게이션">
      <span
        className="sitenav-brand"
        onClick={goHome}
        title="홈페이지로 이동"
        aria-label="홈페이지로 이동"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") goHome();
        }}
      >
        <span className="triple-line">
          <span className="line"></span>
          <span className="line"></span>
          <span className="line"></span>
        </span>
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
            strokeWidth="1.75"
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
        <span className="sitenav-icon" title="로그인 상태" aria-label="로그인 상태">
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
  );
}

export default SiteNav;
