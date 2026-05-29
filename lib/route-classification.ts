export type RouteKind = 'public-site' | 'public-handoff' | 'portal';

const PUBLIC_HANDOFF_PREFIXES = [
  '/proposal/',
  '/payment/',
  '/payments/proforma/',
  '/verify-inquiry',
  '/inquiry/verify',
  '/auth/verify',
  '/inquiry-status/',
];

export function classifyRoute(pathname: string): RouteKind {
  if (pathname === '/portal' || pathname.startsWith('/portal/')) {
    return 'portal';
  }

  if (PUBLIC_HANDOFF_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return 'public-handoff';
  }

  return 'public-site';
}
