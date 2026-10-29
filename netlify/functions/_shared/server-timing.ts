import type { Middleware, NetlifyEvent } from './middleware';

const timings = new WeakMap<NetlifyEvent, Array<{ name: string; duration: number }>>();

export async function measureStage<T>(event: NetlifyEvent, name: string, work: () => Promise<T>): Promise<T> {
  const stages = timings.get(event);
  if (!stages) return work();
  const start = performance.now();
  try {
    return await work();
  } finally {
    stages.push({ name, duration: performance.now() - start });
  }
}

export function withServerTiming(): Middleware {
  return handler => async event => {
    if (event.httpMethod !== 'GET') return handler(event);
    const stages: Array<{ name: string; duration: number }> = [];
    timings.set(event, stages);
    try {
      const response = await measureStage(event, 'total', () => handler(event));
      return {
        ...response,
        headers: {
          ...response.headers,
          'Server-Timing': stages.map(stage => `${stage.name};dur=${stage.duration.toFixed(1)}`).join(', '),
        },
      };
    } finally {
      timings.delete(event);
    }
  };
}
