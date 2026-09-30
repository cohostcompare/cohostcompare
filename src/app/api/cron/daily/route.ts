import { NextResponse, type NextRequest } from 'next/server';
import { runDaily } from '@/lib/reminders';

// Daily at about 8am Sydney (see vercel.json): owner quote nudges, manager nudges, and the hello@ digest
// of claims and unclaimed-manager requests that need a human.
export async function GET(req: NextRequest) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new NextResponse('Not found', { status: 404 });
  return NextResponse.json(await runDaily());
}
