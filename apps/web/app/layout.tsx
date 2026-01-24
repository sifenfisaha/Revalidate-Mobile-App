import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Revalidation Tracker - Web',
  description: 'Professional compliance tracking for UK healthcare practitioners',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
