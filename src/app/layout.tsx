import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Canvas School Portal',
  description:
    'A focused space for teaching, learning, and school administration.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
