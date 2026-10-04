import { NextResponse, type NextRequest } from 'next/server';
import { userClient } from '@/lib/supabase/server';

// The sign-in email link lands here, swaps the one-time code for a session, then returns the visitor.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/account';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/account';
  const supabase = await userClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  // Links opened on a different device from the one that asked for them can't use the code above.
  // The email template can include a token hash instead ({{ .TokenHash }}), which works anywhere.
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (tokenHash && (type === 'magiclink' || type === 'email' || type === 'signup' || type === 'recovery')) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type === 'signup' ? 'signup' : type === 'recovery' ? 'recovery' : 'email' });
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(new URL(`/signin?error=link&next=${encodeURIComponent(safeNext)}`, url.origin));
}
