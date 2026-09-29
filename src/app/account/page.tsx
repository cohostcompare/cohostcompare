import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUser, userClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'My account', robots: { index: false } };

type SP = Promise<{ sent?: string }>;

const STATUS: Record<string, string> = { sent: 'Waiting for a reply', viewed: 'Viewed by the manager', quoted: 'Quote received', accepted: 'Accepted', declined: 'Declined', withdrawn: 'Withdrawn' };

async function signOut() {
  'use server';
  const s = await userClient();
  await s.auth.signOut();
  redirect('/');
}

export default async function Account({ searchParams }: { searchParams: SP }) {
  const user = await currentUser();
  if (!user) redirect('/signin?next=/account');
  const sp = await searchParams;
  const s = await userClient();
  const { data: requests } = await s
    .from('quote_requests')
    .select('id, created_at, address, postcode, bedrooms, property_type, quote_request_managers(manager_name, manager_slug, status)')
    .order('created_at', { ascending: false });

  return (
    <main style={{ maxWidth: 820, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(28px,4.4vw,40px)', margin: 0 }}>My quote requests</h1>
          <span className="hint">{user.email}</span>
        </div>
        <form action={signOut}><button className="btn secondary" type="submit">Sign out</button></form>
      </div>
      {sp.sent && <div className="panel" style={{ background: 'var(--tint)' }}><b>Request sent to {sp.sent} manager{sp.sent === '1' ? '' : 's'}.</b> We&apos;ve emailed you a copy. Quotes will appear here as managers reply.</div>}
      {!requests?.length ? (
        <div className="panel">No requests yet. <a href="/">Search for managers</a> near your property to get started.</div>
      ) : requests.map((r) => (
        <section key={r.id} className="panel" style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <b>{r.address || `Postcode ${r.postcode}`}</b>
            <span className="hint">{new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} · {r.property_type}, {r.bedrooms} bed</span>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {(r.quote_request_managers || []).map((m) => (
              <div key={m.manager_slug} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
                <a href={`/managers/${m.manager_slug}`}>{m.manager_name}</a>
                <span className="hint">{STATUS[m.status] || m.status}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
