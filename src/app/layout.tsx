import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Visual Workflow Router',
  description: 'Create and manage visual workflow routers',
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
