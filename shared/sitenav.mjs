/**
 * 서브 페이지 공통 내비게이션(SiteNav).
 *
 * 홈(index.html)의 `.nav` 는 드롭다운 메뉴·포커스 모드·로그인 모달을 가진 별도 변형이라
 * 이 module 의 범위가 아닙니다. GLOSSARY.md 참조.
 *
 * - 정적 페이지: `[data-site-nav]` 가 mount 지점입니다. 이 파일이 `window.siteNav` 를 노출합니다.
 * - Next.js: `components/SiteNav.jsx` 가 renderNav / bindNav 를 직접 import 합니다.
 *
 * window·document 접근은 모두 guard 안에 있습니다 — Next.js 프리렌더에서 import 되어도 안전합니다.
 */

const MOUNT_SELECTOR = '[data-site-nav]';

/** 로그인 상태 → 표시 값. 순수 함수라 이 module 의 테스트 표면입니다. */
export function navViewModel({ loggedIn = false } = {}) {
  return {
    iconClass: loggedIn ? 'sitenav-icon logged-in' : 'sitenav-icon',
    iconTitle: loggedIn ? '로그인됨' : '로그인 상태',
    iconAria: loggedIn ? '로그인됨' : '로그인하지 않음',
  };
}

/**
 * 햄버거가 여는 바로가기 메뉴. 홈 index.html 의 드롭다운과 같은 항목입니다.
 * 인증이 필요한 앱도 여기서 막지 않습니다 — 대상 페이지(chat·ocr·voca)가 각자 게이트를 그립니다.
 */
export const SITE_MENU = [
  {
    title: '바로가기',
    items: [
      { icon: '🏠', title: '홈', desc: '시작 페이지', href: '/' },
      { icon: '🌤', title: '날씨', desc: '서울 날씨 · 미세먼지 · 주간 예보', href: '/#weather-card' },
      { icon: '✅', title: '할 일', desc: '나의 할 일 · 가족 할 일', href: '/#todo-card' },
      { icon: '🐭', title: '챗봇', desc: '미키', href: '/chat' },
      { icon: '📚', title: '학습', desc: '영단어', href: '/voca' },
      { icon: '🔍', title: 'OCR', desc: '이미지 텍스트 추출', href: '/ocr' },
      { icon: '📷', title: '앨범', desc: '사진 게시판', href: '/album' },
      { icon: '📝', title: '게시판', desc: '나의 관심사 글쓰기', href: '/board' },
    ],
  },
  {
    title: '게임',
    items: [
      { icon: '🎮', title: 'TETRIS', desc: '', href: '/tetris' },
      { icon: '🧱', title: 'ARKANOID', desc: '', href: '/arkanoid' },
      { icon: '💣', title: 'MINESWEEPER', desc: '', href: '/minesweeper' },
      { icon: '🔢', title: 'SUDOKU', desc: '', href: '/sudoku' },
    ],
  },
];

function renderMenu() {
  const sections = SITE_MENU.map((section) => `
    <div class="sitenav-menu-section">
      <h3>${section.title}</h3>
      <div class="sitenav-menu-items">
        ${section.items.map((item) => `<a class="sitenav-menu-item" href="${item.href}"><span class="icon">${item.icon}</span><span class="info"><span class="title">${item.title}</span>${item.desc ? `<span class="desc">${item.desc}</span>` : ''}</span></a>`).join('\n        ')}
      </div>
    </div>`).join('');
  return `<div class="sitenav-menu"><div class="sitenav-menu-inner">${sections}</div></div>`;
}

/** SiteNav 마크업. 마크업을 소유하는 곳은 여기 하나입니다. */
export function renderNav({ loggedIn = false } = {}) {
  const view = navViewModel({ loggedIn });
  return `
<nav class="sitenav" aria-label="사이트 내비게이션">
  <span class="sitenav-brand" data-nav-action="menu" role="button" tabindex="0" title="바로가기 메뉴" aria-label="바로가기 메뉴" aria-expanded="false">
    <span class="triple-line" aria-hidden="true"><span class="line"></span><span class="line"></span><span class="line"></span></span>
    <svg class="triple-x" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M1.5 2 L16.5 17 M16.5 2 L1.5 17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
  </span>
  <span class="sitenav-right">
    <span class="sitenav-door" data-nav-action="back" role="button" tabindex="0" title="뒤로 가기" aria-label="뒤로 가기">
      <svg class="door-open" viewBox="0 0 27 36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="27" height="36" aria-hidden="true">
        <rect x="3" y="4.5" width="18" height="27" rx="1.5"/>
        <path d="M3 6 L13.5 9 L13.5 27 L3 30"/>
        <path d="M11.5 18 H8.5"/>
        <circle cx="11.5" cy="18" r="1.2" fill="currentColor" stroke="none"/>
      </svg>
    </span>
    <span class="${view.iconClass}" title="${view.iconTitle}" aria-label="${view.iconAria}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="42" aria-hidden="true">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    </span>
  </span>
</nav>
${renderMenu()}`.trim();
}

/**
 * 위임 리스너를 root 에 붙입니다. root 의 innerHTML 을 다시 그려도 리스너는 살아 있습니다.
 * @returns {() => void} cleanup
 */
export function bindNav(root) {
  if (!root) return () => {};

  // applyLoggedIn 이 root.innerHTML 을 다시 그리므로 노드를 잡아 두지 않고 매번 조회합니다.
  // (잡아 두면 setLoggedIn 이후의 갱신이 떨어진 노드에 적용돼 메뉴가 죽습니다)
  const brand = () => root.querySelector('.sitenav-brand');
  const panel = () => root.querySelector('.sitenav-menu');

  const closeMenu = () => {
    const p = panel();
    const b = brand();
    if (!p || !b) return;
    p.classList.remove('open');
    b.classList.remove('open');
    b.setAttribute('aria-expanded', 'false');
  };

  const toggleMenu = () => {
    const p = panel();
    const b = brand();
    if (!p || !b) return;
    const open = !p.classList.contains('open');
    p.classList.toggle('open', open);
    b.classList.toggle('open', open);
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  const activate = (el) => {
    const action = el.getAttribute('data-nav-action');
    if (action === 'menu') {
      toggleMenu();
    } else if (action === 'back') {
      if (window.history.length > 1) window.history.back();
      else window.location.href = '/';
    }
  };

  const findAction = (target) => {
    if (!target || typeof target.closest !== 'function') return null;
    const el = target.closest('[data-nav-action]');
    return el && root.contains(el) ? el : null;
  };

  const onClick = (event) => {
    const el = findAction(event.target);
    if (el) {
      activate(el);
      return;
    }
    // 메뉴 항목(<a>)은 브라우저 기본 동작으로 이동합니다. 메뉴만 닫습니다.
    const p = panel();
    if (p && p.contains(event.target)) closeMenu();
  };

  const onKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const el = findAction(event.target);
    if (!el) return;
    event.preventDefault();
    activate(el);
  };

  const onDocumentClick = (event) => {
    const p = panel();
    const b = brand();
    if (!p || !b || !p.classList.contains('open')) return;
    if (p.contains(event.target) || b.contains(event.target)) return;
    closeMenu();
  };

  const onDocumentKeyDown = (event) => {
    if (event.key === 'Escape') closeMenu();
  };

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeyDown);
  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('keydown', onDocumentKeyDown);
  };
}

function applyLoggedIn(root, loggedIn) {
  root.dataset.loggedIn = loggedIn ? '1' : '0';
  root.innerHTML = renderNav({ loggedIn: Boolean(loggedIn) });
}

function mount(root) {
  if (root.dataset.siteNavReady === '1') return;
  const loggedIn = root.dataset.loggedIn === '1' || root.dataset.loggedIn === 'true';
  applyLoggedIn(root, loggedIn);
  bindNav(root);
  root.dataset.siteNavReady = '1';
}

/** 정적 페이지의 인증 코드가 호출하는 유일한 상태 갱신 지점. */
export function setLoggedIn(loggedIn) {
  const root = document.querySelector(MOUNT_SELECTOR);
  if (!root || root.dataset.siteNavReady !== '1') return;
  applyLoggedIn(root, loggedIn);
}

function autoMount() {
  document.querySelectorAll(MOUNT_SELECTOR).forEach(mount);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }
  window.siteNav = { setLoggedIn };
}
