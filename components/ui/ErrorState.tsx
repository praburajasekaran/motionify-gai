import React from 'react';
import {
  AlertCircle,
  RefreshCcw,
  WifiOff,
  ShieldOff,
  Lock,
  ServerCrash,
  LucideIcon,
} from 'lucide-react';

export interface ErrorStateProps {
  error: Error | string;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

interface ErrorContext {
  icon: LucideIcon;
  iconColor: string;
  message: string;
}

function sanitizeMessage(message: string): string {
  return message
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]')
    .replace(/[A-Za-z0-9]{32,}/g, '[REDACTED]')
    .replace(/api[_-]?key[=:]\s*\S+/gi, 'api_key=[REDACTED]');
}

function getErrorContext(error: Error | string): ErrorContext {
  const message =
    typeof error === 'string' ? error : error.message || String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes('fetch') ||
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror')
  ) {
    return {
      icon: WifiOff,
      iconColor: 'text-amber-500',
      message:
        'Unable to connect to the server. Please check your internet connection.',
    };
  }

  if (lower.includes('401') || lower.includes('unauthorized')) {
    return {
      icon: Lock,
      iconColor: 'text-yellow-600',
      message: 'Your session has expired. Please log in again.',
    };
  }

  if (lower.includes('403') || lower.includes('forbidden')) {
    return {
      icon: ShieldOff,
      iconColor: 'text-orange-500',
      message: "You don't have permission to access this resource.",
    };
  }

  if (lower.includes('500') || lower.includes('internal server error')) {
    return {
      icon: ServerCrash,
      iconColor: 'text-red-500',
      message:
        'The server encountered an error. Our team has been notified.',
    };
  }

  return {
    icon: AlertCircle,
    iconColor: 'text-red-500',
    message: sanitizeMessage(message),
  };
}

export function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
  className = '',
}: ErrorStateProps) {
  const ctx = getErrorContext(error);
  const Icon = ctx.icon;
  const rawError = typeof error === 'string' ? error : error;

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
    >
      <Icon className={`w-12 h-12 ${ctx.iconColor}`} />
      <h3 className="text-lg font-semibold text-zinc-900 mt-4">{title}</h3>
      <p className="text-sm text-zinc-500 mt-1 max-w-md">{ctx.message}</p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 mt-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <RefreshCcw className="w-4 h-4" />
          Try again
        </button>
      )}

      {import.meta.env.DEV && typeof rawError !== 'string' && rawError?.stack && (
        <details className="mt-6 w-full max-w-md text-left">
          <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600">
            Technical details
          </summary>
          <pre className="mt-2 p-3 bg-zinc-100 rounded-lg text-xs text-zinc-600 overflow-auto max-h-48 whitespace-pre-wrap">
            {rawError.stack}
          </pre>
        </details>
      )}
    </div>
  );
}
