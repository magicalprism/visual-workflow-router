import type { Metadata } from 'next';
import './globals.css';
import SoftGate from '../components/SoftGate';

export const metadata: Metadata = {
  title: 'Visual Workflow Router',
  description: 'Create and manage visual workflow routers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Body is still a server component; SoftGate is client-only */}
      <body>
        <SoftGate>{children}</SoftGate>
      </body>
    </html>
  );
}
