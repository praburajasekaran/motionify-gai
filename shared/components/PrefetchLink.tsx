import React, { useCallback, useRef } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { prefetchForRoute } from '@/shared/utils/prefetch';

const DEBOUNCE_MS = 100;

/**
 * PrefetchLink
 *
 * Drop-in replacement for React Router's <Link> that prefetches
 * data on hover. Uses a 100ms debounce to avoid wasted requests
 * from accidental hovers.
 */
export function PrefetchLink({ to, children, ...props }: LinkProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(() => {
      const path = typeof to === 'string' ? to : to.pathname ?? '';
      prefetchForRoute(queryClient, path, user?.id);
    }, DEBOUNCE_MS);
  }, [queryClient, to, user?.id]);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return (
    <Link
      to={to}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </Link>
  );
}
