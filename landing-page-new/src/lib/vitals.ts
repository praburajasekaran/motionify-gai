import type { Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric): void {
  if (process.env.NODE_ENV === 'development') {
    const ratingColors: Record<string, string> = {
      good: 'color: #0cce6b',
      'needs-improvement': 'color: #ffa400',
      poor: 'color: #ff4e42',
    };
    console.log(
      `%c[Web Vital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`,
      ratingColors[metric.rating] || '',
      { delta: metric.delta, id: metric.id, navigationType: metric.navigationType }
    );
    return;
  }

  // Production: report to Sentry (dynamic import avoids hard dependency)
  // Use variable to prevent TypeScript from resolving the module at compile time
  const sentryModule = '@sentry/react';
  (import(/* webpackIgnore: true */ sentryModule) as Promise<Record<string, unknown>>)
    .then((mod) => {
      const captureMessage = mod.captureMessage as
        | ((message: string, options: Record<string, unknown>) => void)
        | undefined;
      if (typeof captureMessage !== 'function') {
        throw new Error('captureMessage not available');
      }
      captureMessage(`Web Vital: ${metric.name}`, {
        level: metric.rating === 'good' ? 'info' : 'warning',
        tags: {
          metric: metric.name,
          rating: metric.rating,
        },
        contexts: {
          performance: {
            value: metric.value,
            id: metric.id,
            delta: metric.delta,
            navigationType: metric.navigationType,
          },
        },
      });
    })
    .catch(() => {
      // Sentry not available – silently ignore; analytics is non-critical
    });
}

export function reportWebVitals(metric: Metric): void {
  sendToAnalytics(metric);
}

export function initWebVitals(): void {
  import('web-vitals').then(({ onLCP, onINP, onCLS, onFCP, onTTFB }) => {
    onLCP(sendToAnalytics);
    onINP(sendToAnalytics);
    onCLS(sendToAnalytics);
    onFCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  });
}
