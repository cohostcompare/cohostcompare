import { NextResponse, type NextRequest } from 'next/server';
import { isAdminEmail } from '@/lib/admin';
import { newBusinesses, runSweep, seedManagers } from '@/lib/jobs/data';
import { adminClient, currentUser } from '@/lib/supabase/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Admin data jobs. Allowed for a signed-in admin, or with ?pass=ADMIN_TOKEN (for scripted runs).
async function allowed(req: NextRequest) {
  const expected = (process.env.ADMIN_TOKEN || '').replace(/[`'"\s]/g, '');
  const given = (req.nextUrl.searchParams.get('pass') || '').trim();
  if (expected && given === expected) return true;
  const user = await currentUser().catch(() => null);
  return isAdminEmail(user?.email);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ job: string }> }) {
  if (!(await allowed(req))) return new NextResponse('Not found', { status: 404 });
  const { job } = await params;
  const p = req.nextUrl.searchParams;
  try {
    switch (job) {
      case 'health':
        return NextResponse.json({ ok: true, airroi: Boolean(process.env.AIRROI_API_KEY), resend: Boolean(process.env.RESEND_API_KEY), supabase: Boolean(process.env.SUPABASE_SECRET_KEY), anthropic: Boolean(process.env.ANTHROPIC_API_KEY), cron: Boolean(process.env.CRON_SECRET), commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) });
      case 'sweep':
        return NextResponse.json(await runSweep(p.get('cell') || undefined, Number(p.get('calls') || 20)));
      case 'new-businesses':
        return NextResponse.json(await newBusinesses(Number(p.get('min') || 6)));
      case 'seed-managers':
        return NextResponse.json(await seedManagers());
      case 'recent': {
        const db = adminClient();
        const [claims, quotes] = await Promise.all([
          db.from('manager_claims').select('id,status,method,email,created_at,managers(name)').order('created_at', { ascending: false }).limit(10),
          db.from('quote_requests').select('id,created_at,suburb,postcode').order('created_at', { ascending: false }).limit(5),
        ]);
        return NextResponse.json({ claims: claims.data, quotes: quotes.data });
      }
      default:
        return new NextResponse('Not found', { status: 404 });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message || e) });
  }
}
