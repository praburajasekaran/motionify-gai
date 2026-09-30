import React, { ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { claimChunkReload } from '../lib/chunk-recovery';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed/i.test(error.message);
}

function ErrorFallback({
  error,
  resetError,
  onReset,
  fallback,
}: {
  error: unknown;
  resetError: () => void;
  onReset?: () => void;
  fallback?: ReactNode;
}) {
  const isRecoverableChunkError = isChunkLoadError(error);
  React.useEffect(() => {
    if (!fallback && isRecoverableChunkError && claimChunkReload()) {
      window.location.reload();
    }
  }, [fallback, isRecoverableChunkError]);

  if (fallback) {
    return <>{fallback}</>;
  }

  const handleReset = () => {
    if (isRecoverableChunkError) {
      claimChunkReload();
      window.location.reload();
      return;
    }

    onReset?.();
    resetError();
  };

  return (
    <main className="portal-shell min-h-dvh flex items-center justify-center bg-background px-4" aria-labelledby="app-error-title">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 sm:p-8">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 id="app-error-title" className="text-2xl font-semibold text-foreground text-center mb-2">
          Something went wrong
        </h1>

        <p className="text-muted-foreground text-center mb-6">
          {isRecoverableChunkError ? 'A newer version of the app may be available. Reload this page to continue.' : 'We could not display this page. Try again or return to your workspace.'}
        </p>

        {import.meta.env.DEV && error && (
          <details className="mb-6 p-4 bg-muted rounded border border-border">
            <summary className="cursor-pointer font-semibold text-sm text-foreground mb-2">
              Error Details (Development Only)
            </summary>
            <div className="text-xs text-muted-foreground font-mono overflow-auto">
              <p className="font-semibold mb-2">{error instanceof Error ? error.message : String(error)}</p>
            </div>
          </details>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 bg-primary hover:bg-[var(--studio-amber-hover)] text-primary-foreground font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {isRecoverableChunkError ? 'Reload page' : 'Try again'}
          </button>
          <button
            onClick={() => window.location.assign(window.location.pathname.startsWith('/portal') ? '/portal' : '/')}
            className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-2 px-4 rounded transition-colors"
          >
            Go home
          </button>
        </div>
      </div>
    </main>
  );
}

export function ErrorBoundary({ children, fallback, onReset }: Props) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback
          error={error}
          resetError={resetError}
          onReset={onReset}
          fallback={fallback}
        />
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
