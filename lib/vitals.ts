import type { Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric): void {
  if (import.meta.env.DEV) {
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

  // Production: report to Sentry
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.captureMessage(`Web Vital: ${metric.name}`, {
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
      // Sentry not available, try sendBeacon as fallback
      try {
        const body = JSON.stringify({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id,
          navigationType: metric.navigationType,
        });
        navigator.sendBeacon('/api/analytics/vitals', body);
      } catch {
        // Silently ignore - analytics is non-critical
      }
    });
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
