import './globals.css';

export const metadata = {
  title: '테트리스',
  description: 'Canvas로 만든 테트리스',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // 핀치 확대는 막지 않고 최대 배율만 제한합니다 (접근성)
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
