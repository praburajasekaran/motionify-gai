import React, { useCallback, useEffect, useRef } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { prefetchForRoute } from '@/shared/utils/prefetch';
import { projectListUserId } from '@/lib/permissions';

const DEBOUNCE_MS = 100;

/**
 * PrefetchLink
 *
 * Drop-in replacement for React Router's <Link> that prefetches
 * data on hover. Uses a 100ms debounce to avoid wasted requests
 * from accidental hovers.
 */
export function PrefetchLink({ to, children, onMouseEnter, onMouseLeave, onFocus, onTouchStart, ...props }: LinkProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefetch = useCallback(() => {
    if (!user) return;
    const path = typeof to === 'string' ? to : to.pathname ?? '';
    prefetchForRoute(queryClient, path, projectListUserId(user));
  }, [queryClient, to, user]);

  const handleMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(() => {
      prefetch();
    }, DEBOUNCE_MS);
  }, [prefetch]);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => handleMouseLeave, [handleMouseLeave, user?.id, user?.role]);

  return (
    <Link
      to={to}
      {...props}
      onMouseEnter={event => { handleMouseEnter(); onMouseEnter?.(event); }}
      onMouseLeave={event => { handleMouseLeave(); onMouseLeave?.(event); }}
      onFocus={event => { prefetch(); onFocus?.(event); }}
      onTouchStart={event => { prefetch(); onTouchStart?.(event); }}
    >
      {children}
    </Link>
  );
}
