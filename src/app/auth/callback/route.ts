import { NextResponse, type NextRequest } from 'next/server';
import { userClient } from '@/lib/supabase/server';

// The sign-in email link lands here, swaps the one-time code for a session, then returns the visitor.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/account';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/account';
  if (code) {
    const supabase = await userClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(new URL('/signin?error=link', url.origin));
}
