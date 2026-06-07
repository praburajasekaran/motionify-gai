export const CANONICAL_PRODUCTION_ORIGIN = 'https://motionify.studio';
export const LOCAL_VITE_ORIGIN = 'http://localhost:5173';

type EnvLike = Record<string, string | undefined>;

function cleanPath(path: string): string {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function withQuery(path: string, params?: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `${cleanPath(path)}?${query}` : cleanPath(path);
}

export function normalizeAppOrigin(origin?: string | null): string {
  if (!origin) return CANONICAL_PRODUCTION_ORIGIN;

  try {
    const url = new URL(origin);
    const isLegacyLocalFrontend = url.hostname === 'localhost' && url.port === '5174';
    if (isLegacyLocalFrontend) {
      return LOCAL_VITE_ORIGIN;
    }

    if (url.hostname === 'portal.motionify.studio') {
      return CANONICAL_PRODUCTION_ORIGIN;
    }

    url.pathname = url.pathname.replace(/\/(api|portal)\/?$/, '').replace(/\/+$/, '');
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/+$/, '');
  } catch {
    return origin.replace(/\/(api|portal)\/?$/, '').replace(/\/+$/, '');
  }
}

export function appOriginFromEnv(env: EnvLike = {}): string {
  return normalizeAppOrigin(
    env.APP_URL ||
      env.NEXT_PUBLIC_APP_URL ||
      env.NEXT_PUBLIC_PORTAL_URL ||
      env.PORTAL_URL ||
      env.URL ||
      CANONICAL_PRODUCTION_ORIGIN,
  );
}

export function absoluteUrl(path: string, origin = CANONICAL_PRODUCTION_ORIGIN): string {
  return `${normalizeAppOrigin(origin)}${cleanPath(path)}`;
}

export function portalPath(path = '/'): string {
  const suffix = cleanPath(path);
  return suffix === '/' ? '/portal' : `/portal${suffix}`;
}

export function portalLoginPath(params?: { token?: string; next?: string; email?: string }): string {
  return withQuery(portalPath('/login'), params);
}

export function projectAccessPath(params: { projectId?: string | null; email?: string | null }): string {
  return withQuery(portalPath('/project-access'), params);
}

export function portalProjectPath(projectId: string, params?: { tab?: string; task?: string }): string {
  return withQuery(portalPath(`/projects/${projectId}`), params);
}

export function portalProposalPath(proposalId: string): string {
  return portalPath(`/proposals/${proposalId}`);
}

export function portalAdminProposalPath(proposalId: string): string {
  return portalPath(`/admin/proposals/${proposalId}`);
}

export function proposalReviewPath(proposalId: string, params?: { token?: string; data?: string }): string {
  return withQuery(`/proposal/${proposalId}`, params);
}

export function advancePaymentPath(proposalId: string, params?: { token?: string }): string {
  return withQuery(`/payment/${proposalId}`, params);
}

export function inquiryVerificationPath(params: { token: string; email?: string | null }): string {
  return withQuery('/verify-inquiry', params);
}

export function inquiryStatusPath(inquiryNumber: string): string {
  return `/inquiry-status/${encodeURIComponent(inquiryNumber)}`;
}

export function absolutePortalLoginUrl(params?: { token?: string; next?: string; email?: string }, origin?: string): string {
  return absoluteUrl(portalLoginPath(params), origin);
}

export function absoluteProjectAccessUrl(
  params: { projectId?: string | null; email?: string | null },
  origin?: string,
): string {
  return absoluteUrl(projectAccessPath(params), origin);
}

export function absolutePortalProjectUrl(
  projectId: string,
  params?: { tab?: string; task?: string },
  origin?: string,
): string {
  return absoluteUrl(portalProjectPath(projectId, params), origin);
}

export function absolutePortalProposalUrl(proposalId: string, origin?: string): string {
  return absoluteUrl(portalProposalPath(proposalId), origin);
}

export function absolutePortalAdminProposalUrl(proposalId: string, origin?: string): string {
  return absoluteUrl(portalAdminProposalPath(proposalId), origin);
}

export function absoluteProposalReviewUrl(
  proposalId: string,
  params?: { token?: string; data?: string },
  origin?: string,
): string {
  return absoluteUrl(proposalReviewPath(proposalId, params), origin);
}

export function absoluteAdvancePaymentUrl(proposalId: string, params?: { token?: string }, origin?: string): string {
  return absoluteUrl(advancePaymentPath(proposalId, params), origin);
}

export function absoluteInquiryVerificationUrl(
  params: { token: string; email?: string | null },
  origin?: string,
): string {
  return absoluteUrl(inquiryVerificationPath(params), origin);
}
