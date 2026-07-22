'use client';

import { useRef, useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/store/auth-store';

export function AuthProvider({ children }: { children: ReactNode }) {
  const authStatus = useAuthStore((s) => s.authStatus);
  const accessToken = useAuthStore((s) => s.accessToken);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const validated = useRef(false);

  useEffect(() => {
    if (authStatus === 'hydrating') return;

    if (accessToken && !validated.current && authStatus === 'checking') {
      validated.current = true;
      fetchProfile();
    }

    if (!accessToken && authStatus === 'unauthenticated') {
      validated.current = true;
    }
  }, [authStatus, accessToken, fetchProfile]);

  return <>{children}</>;
}
