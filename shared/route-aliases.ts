export interface RouteAliasResult {
  canonicalPath: string;
  replace: boolean;
}

export function resolveRouteAlias(pathname: string, search = ''): RouteAliasResult | null {
  if (pathname === '/inquiry/verify' || pathname === '/auth/verify') {
    return {
      canonicalPath: `/verify-inquiry${search}`,
      replace: true,
    };
  }

  if (pathname === '/login') {
    return {
      canonicalPath: `/portal/login${search}`,
      replace: true,
    };
  }

  if (pathname === '/project-access') {
    return {
      canonicalPath: `/portal/project-access${search}`,
      replace: true,
    };
  }

  return null;
}
