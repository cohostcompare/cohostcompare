import type { Instrumentation } from 'next';

export function register() {}

// Error alerts: a server error on the live site emails hello@, at most once every 6 hours per kind of error.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.VERCEL_ENV !== 'production') return;
    try {
      const { alertError } = await import('./lib/alerts');
      await alertError(err, { path: request.path, method: request.method, route: context.routePath, kind: context.routeType });
    } catch (e) {
      console.error('error alert failed', e);
    }
  }
};
