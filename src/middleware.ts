import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/supabase/config';

// Keeps the sign-in session fresh on every page load, and sends the production *.vercel.app address to www.
export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  if (process.env.VERCEL_ENV === 'production' && host.endsWith('.vercel.app')) {
    const url = request.nextUrl.clone(); url.host = 'www.cohostcompare.com'; url.port = ''; url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.svg|email/|api/|robots.txt|sitemap.xml|llms.txt).*)'],
};
