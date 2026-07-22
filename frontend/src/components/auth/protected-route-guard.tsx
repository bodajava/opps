'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { canAccessAdmin } from '@/lib/auth-guards';
import type { ReactNode } from 'react';

interface ProtectedRouteGuardProps {
  children: ReactNode;
  requiredAdmin?: boolean;
  fallback?: ReactNode;
}

export function ProtectedRouteGuard({ children, requiredAdmin, fallback }: ProtectedRouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const authStatus = useAuthStore((s) => s.authStatus);
  const user = useAuthStore((s) => s.user);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (redirectedRef.current) return;

    if (authStatus === 'unauthenticated') {
      redirectedRef.current = true;
      const target = `/login?returnTo=${encodeURIComponent(pathname)}`;
      router.replace(target);
      return;
    }

    if (authStatus === 'authenticated' && user) {
      if (requiredAdmin && !canAccessAdmin(user)) {
        redirectedRef.current = true;
        router.replace('/account');
        return;
      }
    }
  }, [authStatus, user, router, requiredAdmin, pathname]);

  if (authStatus === 'hydrating' || authStatus === 'checking') {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return null;
  }

  if (authStatus === 'authenticated' && user) {
    if (requiredAdmin && !canAccessAdmin(user)) {
      return null;
    }
    return <>{children}</>;
  }

  return null;
}
