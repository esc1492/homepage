'use client';

import { useEffect, useRef, useState } from 'react';

import { bindNav, renderNav } from '../shared/sitenav.mjs';

function SiteNav() {
  // 홈페이지와 같은 origin 이라 로그인 세션을 공유합니다.
  // localStorage 를 읽는 일은 이 adapter 가 맡고, 공유 module 은 loggedIn 만 받습니다.
  const [loggedIn, setLoggedIn] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const read = () => {
      try {
        setLoggedIn(window.localStorage.getItem('loggedIn') === '1');
      } catch {
        setLoggedIn(false);
      }
    };
    read();
    window.addEventListener('storage', read);
    window.addEventListener('focus', read);
    return () => {
      window.removeEventListener('storage', read);
      window.removeEventListener('focus', read);
    };
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;
    return bindNav(rootRef.current);
  }, []);

  // 마크업은 shared module 이 소유합니다. 내용은 정적이고 신뢰할 수 있습니다.
  return (
    <div ref={rootRef} dangerouslySetInnerHTML={{ __html: renderNav({ loggedIn }) }} />
  );
}

export default SiteNav;
