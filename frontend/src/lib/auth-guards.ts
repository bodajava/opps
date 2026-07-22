import type { User } from '@/lib/types';

const ADMIN_ROLES = new Set(['super_admin', 'admin']);

export function getRoleName(user: User | null): string {
  if (!user) return '';
  const role = user.role;
  return typeof role === 'string' ? role : (role?.name ?? '');
}

export function canAccessAdmin(user: User | null): boolean {
  return ADMIN_ROLES.has(getRoleName(user));
}

export function isAdminRole(roleName: string): boolean {
  return ADMIN_ROLES.has(roleName);
}

const ADMIN_RETURN_PREFIXES = ['/admin'];

const CUSTOMER_SAFE_PATHS = new Set([
  '/account',
  '/account/orders',
  '/account/addresses',
  '/cart',
  '/checkout',
  '/',
  '/products',
]);

export function getSafeReturnPath(
  returnTo: string | null,
  roleName: string,
): string {
  if (!returnTo) {
    return isAdminRole(roleName) ? '/admin' : '/account';
  }

  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return isAdminRole(roleName) ? '/admin' : '/account';
  }

  try {
    const url = new URL(returnTo, 'http://localhost');
    if (url.hostname !== 'localhost') {
      return isAdminRole(roleName) ? '/admin' : '/account';
    }
  } catch {
    return isAdminRole(roleName) ? '/admin' : '/account';
  }

  if (returnTo.includes('://') || returnTo.includes('..')) {
    return isAdminRole(roleName) ? '/admin' : '/account';
  }

  if (isAdminRole(roleName)) {
    const isAdminPath = ADMIN_RETURN_PREFIXES.some((p) => returnTo === p || returnTo.startsWith(p + '/'));
    if (!isAdminPath) {
      return '/admin';
    }
    return returnTo;
  }

  if (CUSTOMER_SAFE_PATHS.has(returnTo)) {
    return returnTo;
  }

  if (returnTo.startsWith('/products') || returnTo.startsWith('/categories')) {
    return returnTo;
  }

  return '/account';
}

export function getDefaultAuthenticatedRoute(roleName: string): string {
  return isAdminRole(roleName) ? '/admin' : '/account';
}

export function getGuestOnlyRoutes(): string[] {
  return ['/login', '/register', '/forgot-password', '/reset-password'];
}

export function isGuestOnlyRoute(pathname: string): boolean {
  return getGuestOnlyRoutes().includes(pathname);
}
