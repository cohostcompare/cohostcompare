import { NextResponse, type NextRequest } from 'next/server';
import { verify } from '@/lib/claims';
import { unsubscribe } from '@/lib/outreach';

// One-click unsubscribe (RFC 8058) from email clients. The List-Unsubscribe URL points at /unsubscribe; mail apps POST to it.
export async function POST(req: NextRequest) {
  const e = req.nextUrl.searchParams.get('e') || '', s = req.nextUrl.searchParams.get('s') || '';
  if (e && verify(`unsub:${e.toLowerCase()}`, s)) await unsubscribe(e);
  return new NextResponse('Unsubscribed', { status: 200 });
}
