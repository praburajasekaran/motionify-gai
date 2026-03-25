import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode, lazy, Suspense } from 'react';
import { ApiError } from '../utils/api.client';
import { authKeys } from '../hooks/useAuth';
import { clearAuthSession } from '@/lib/auth';

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then(m => ({
        default: m.ReactQueryDevtools,
      }))
    )
  : () => null;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error) => {
        // Never retry on 401 — session is invalid
        if (error instanceof ApiError && error.status === 401) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      throwOnError: true,
    },
    mutations: {
      retry: 1,
      throwOnError: true,
    },
  },
});

// Global handler for 401 errors — redirect to login on session expiry
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'updated' && event.action.type === 'error') {
    const error = event.action.error;
    if (error instanceof ApiError && error.status === 401) {
      // Clear auth cache and session
      queryClient.setQueryData(authKeys.session(), null);
      clearAuthSession();
      // Redirect to login (only if not already there)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/portal/login?session=expired';
      }
    }
  }
});

export { queryClient };

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Suspense fallback={null}>
        <ReactQueryDevtools initialIsOpen={false} />
      </Suspense>
    </QueryClientProvider>
  );
}
