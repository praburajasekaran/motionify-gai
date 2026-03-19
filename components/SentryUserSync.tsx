import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { useAuthContext } from '../contexts/AuthContext';

export function SentryUserSync() {
  const { user } = useAuthContext();

  useEffect(() => {
    if (user) {
      Sentry.setUser({ id: String(user.id), role: user.role });
    } else {
      Sentry.setUser(null);
    }
  }, [user]);

  return null;
}
