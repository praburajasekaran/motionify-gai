/**
 * useAuth Hook
 *
 * Convenience hook that re-exports the authentication context.
 * Provides access to current user and authentication methods.
 */

import { useAuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  return useAuthContext();
}
