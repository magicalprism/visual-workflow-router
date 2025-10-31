// src/components/SoftGate.tsx
'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const COOKIE_NAME = 'vwf_access';
const PUBLIC = new Set<string>(['/pass', '/', '/favicon.ico']);

function hasAccess() {
  const cookieOK = document.cookie.split(';').some(p => p.trim().startsWith(`${COOKIE_NAME}=authenticated`));
  const lsOK = typeof window !== 'undefined' && localStorage.getItem(COOKIE_NAME) === 'authenticated';
  return cookieOK || lsOK;
}

export default function SoftGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (PUBLIC.has(pathname)) { setReady(true); return; }
    if (!hasAccess()) { router.replace(`/pass?next=${encodeURIComponent(pathname || '/workflows')}`); return; }
    setReady(true);
  }, [pathname, router]);

  if (!ready) return null;
  return <>{children}</>;
}
