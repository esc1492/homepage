import './globals.css';

export const metadata = {
  title: 'Minesweeper',
  description: '윈도우 클래식 지뢰찾기 — 초급·중급·고급, 깃발·코드·타이머 지원',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
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
