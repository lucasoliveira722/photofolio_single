const ADMIN_PATH = /^\/admin(?:[/?#]|$)/;

// The login link for a signed-out admin page, returning there after signing in.
export function loginHref(currentPath: string): string {
  if (currentPath === '/admin' || !ADMIN_PATH.test(currentPath)) return '/login';
  return `/login?next=${encodeURIComponent(currentPath)}`;
}

// Only admin paths are followed after signing in, so the link can't send anyone to another site.
export function safeNextPath(next: string | null | undefined): string {
  return next && ADMIN_PATH.test(next) ? next : '/admin';
}
