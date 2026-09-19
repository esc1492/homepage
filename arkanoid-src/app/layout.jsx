import './globals.css';

export const metadata = {
  title: '알카노이드',
  description: 'Canvas로 만든 알카노이드 — 터치와 키보드로 즐기는 벽돌깨기',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // 핀치 확대는 막지 않고 최대 배율만 제한합니다 (접근성).
  // 캔버스 위 제스처는 CSS 의 touch-action: none 이 막으므로 확대를 뺏을 이유가 없습니다.
  maximumScale: 5,
  themeColor: '#111111',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
