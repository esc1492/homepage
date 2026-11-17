import test from 'node:test';
import assert from 'node:assert/strict';

import { SITE_MENU, navSoundView, navPaletteView, navViewModel, renderNav } from './sitenav.mjs';

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
    '/lode-runner',
  ]);
  hrefs.forEach((href) => assert.ok(html.includes(`href="${href}"`), href));
});

test('renderNav 는 로그아웃 상태에서 logged-in class 를 넣지 않는다', () => {
  const html = renderNav({ loggedIn: false });
  assert.doesNotMatch(html, /logged-in/);
  assert.match(html, /title="로그인 상태"/);
});

test('사운드 아이콘은 opt-in 한 페이지에만, 문 아이콘 왼쪽에 그려진다', () => {
  assert.doesNotMatch(renderNav({ loggedIn: false }), /data-nav-action="sound"/);
  const html = renderNav({ loggedIn: false, sound: true });
  assert.match(html, /data-nav-action="sound"/);
  assert.ok(
    html.indexOf('data-nav-action="sound"') < html.indexOf('data-nav-action="back"'),
    '사운드 아이콘이 문 아이콘보다 뒤에 있습니다',
  );
});

test('팔레트 아이콘은 opt-in 한 페이지에만, 사운드 아이콘 왼쪽에 그려진다', () => {
  assert.doesNotMatch(renderNav({ loggedIn: false }), /sitenav-palette/);
  assert.doesNotMatch(renderNav({ loggedIn: false, sound: true }), /sitenav-palette/);
  const html = renderNav({ loggedIn: false, sound: true, palette: false });
  assert.match(html, /data-nav-action="palette"/);
  assert.match(html, /class="sitenav-palette"/);
  assert.ok(
    html.indexOf('sitenav-palette') < html.indexOf('data-nav-action="sound"'),
    '팔레트 아이콘이 사운드 아이콘보다 뒤에 있습니다',
  );
});

test('팔레트 상태에 따라 class·title·aria-pressed 가 바뀐다', () => {
  assert.deepEqual(navPaletteView({ mono: false }), {
    iconClass: 'sitenav-palette',
    iconTitle: '모노크롬으로 보기',
    iconAria: '모노크롬 꺼짐',
    pressed: 'false',
  });
  assert.deepEqual(navPaletteView({ mono: true }), {
    iconClass: 'sitenav-palette mono',
    iconTitle: '컬러로 보기',
    iconAria: '모노크롬 켜짐',
    pressed: 'true',
  });

  const html = renderNav({ loggedIn: false, palette: true });
  assert.match(html, /class="sitenav-palette mono"/);
  assert.match(html, /aria-pressed="true"/);
});

test('사운드 상태에 따라 class·title·aria-pressed 가 바뀐다', () => {
  assert.deepEqual(navSoundView({ on: true }), {
    iconClass: 'sitenav-sound',
    iconTitle: '소리 끄기',
    iconAria: '소리 켜짐',
    pressed: 'true',
  });
  assert.deepEqual(navSoundView({ on: false }), {
    iconClass: 'sitenav-sound muted',
    iconTitle: '소리 켜기',
    iconAria: '소리 꺼짐',
    pressed: 'false',
  });

  const html = renderNav({ loggedIn: false, sound: false });
  assert.match(html, /class="sitenav-sound muted"/);
  assert.match(html, /aria-pressed="false"/);
});
