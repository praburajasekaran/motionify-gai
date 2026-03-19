import React, { ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
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
  if (fallback) {
    return <>{fallback}</>;
  }

  const handleReset = () => {
    onReset?.();
    resetError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-8">
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

        <h1 className="text-2xl font-bold text-foreground text-center mb-2">
          Something went wrong
        </h1>

        <p className="text-muted-foreground text-center mb-6">
          We're sorry for the inconvenience. An unexpected error occurred.
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
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-2 px-4 rounded transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
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
