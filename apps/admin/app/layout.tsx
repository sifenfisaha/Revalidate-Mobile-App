import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Revalidation Tracker - Admin',
  description: 'Admin dashboard for Revalidation Tracker',
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
