import test from 'node:test';
import assert from 'node:assert/strict';

import { SITE_MENU, navViewModel, renderNav } from './sitenav.mjs';

test('로그아웃 상태: muted 아이콘과 상태 title', () => {
  const view = navViewModel({ loggedIn: false });
  assert.equal(view.iconClass, 'sitenav-icon');
  assert.equal(view.iconTitle, '로그인 상태');
  assert.equal(view.iconAria, '로그인하지 않음');
});

test('로그인 상태: logged-in class 와 title', () => {
  const view = navViewModel({ loggedIn: true });
  assert.equal(view.iconClass, 'sitenav-icon logged-in');
  assert.equal(view.iconTitle, '로그인됨');
  assert.equal(view.iconAria, '로그인됨');
});

test('renderNav 는 메뉴·뒤로가기 동작과 상태 class 를 포함한다', () => {
  const html = renderNav({ loggedIn: true });
  assert.match(html, /aria-label="사이트 내비게이션"/);
  assert.match(html, /data-nav-action="menu"/);
  assert.match(html, /data-nav-action="back"/);
  assert.match(html, /class="sitenav-icon logged-in"/);
});

test('renderNav 의 바로가기 메뉴는 앱 목록 전체를 담는다', () => {
  const html = renderNav({ loggedIn: false });
  assert.match(html, /class="sitenav-menu"/);
  const hrefs = SITE_MENU.flatMap((section) => section.items.map((item) => item.href));
  assert.deepEqual(hrefs, [
    '/',
    '/#weather-card',
    '/#todo-card',
    '/chat',
    '/voca',
    '/ocr',
    '/album',
    '/board',
    '/tetris',
    '/arkanoid',
    '/minesweeper',
    '/sudoku',
  ]);
  hrefs.forEach((href) => assert.ok(html.includes(`href="${href}"`), href));
});

test('renderNav 는 로그아웃 상태에서 logged-in class 를 넣지 않는다', () => {
  const html = renderNav({ loggedIn: false });
  assert.doesNotMatch(html, /logged-in/);
  assert.match(html, /title="로그인 상태"/);
});
