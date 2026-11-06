import { NextResponse, type NextRequest } from 'next/server';
import { CLIENT_STEPS, logFunnel, type Step } from '@/lib/traffic';

// Quote-flow steps the browser reports (see track() in src/lib/client/track.ts). Same-origin only, once per session per step.
export async function POST(req: NextRequest) {
  const res = new NextResponse(null, { status: 204 });
  try {
    const site = req.headers.get('sec-fetch-site');
    if (site && site !== 'same-origin') return res;
    const b = await req.json().catch(() => ({})) as { kind?: string };
    const kind = b.kind as Step;
    if (!CLIENT_STEPS.includes(kind)) return res;
    await logFunnel(kind as Exclude<Step, 'visit'>, true);
  } catch { /* never break the page */ }
  return res;
}
