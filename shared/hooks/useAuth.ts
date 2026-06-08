import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '@/lib/api-config';
import { clearAuthSession, getStoredUser } from '@/lib/auth';
import { setUserTimezone } from '@/utils/dateFormatting';
import type { User } from '@/types';

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
};

interface AuthMeResponse {
  success: boolean;
  user?: User;
}

async function fetchAuthSession(): Promise<User | null> {
  const response = await fetch(`${API_BASE}/auth-me`, {
    method: 'GET',
    credentials: 'include',
  });

  if (response.ok) {
    const data: AuthMeResponse = await response.json();
    if (data.success && data.user) {
      setUserTimezone(data.user.timezone || null);
      return data.user;
    }
  }

  clearAuthSession();
  setUserTimezone(null);
  return null;
}

export function useAuth() {
  return useQuery({
    queryKey: authKeys.session(),
    queryFn: fetchAuthSession,
    initialData: () => getStoredUser(),
    // Stored user data is only a paint optimization. Always validate the
    // httpOnly cookie in the background instead of trusting localStorage.
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes — match existing refresh interval
    gcTime: 10 * 60 * 1000,
    retry: false, // Auth failures shouldn't retry
    refetchOnWindowFocus: true, // Re-check auth when tab becomes visible
    refetchInterval: 5 * 60 * 1000, // Periodic session check every 5 min
    refetchIntervalInBackground: false,
    throwOnError: false,
  });
}

/**
 * Invalidate auth session — triggers a re-fetch of /auth-me.
 * Returns a function so callers can call it like `invalidateAuth()`.
 */
export function useInvalidateAuth() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: authKeys.session() });
}
