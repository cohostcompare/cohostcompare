import type { Metadata } from 'next';
import Link from 'next/link';
import { requireManager } from '@/lib/managers';
import { planName, planOf, plansFor, SEATS } from '@/lib/pro';
import { adminClient } from '@/lib/supabase/server';
import { removeMember, seatsUsed } from './actions';
import InviteForm from './InviteForm';

export const metadata: Metadata = { title: 'Team', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Team({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, manager: m } = await requireManager(slug, `/dashboard/${slug}/team`);
  const db = adminClient();
  const plan = planOf((await plansFor([m.id])).get(m.id));
  const { data: mem } = await db.from('manager_members').select('user_id').eq('manager_id', m.id);
  const people = await Promise.all((mem || []).map(async (x) => ({ id: x.user_id, email: (await db.auth.admin.getUserById(x.user_id)).data.user?.email || 'unknown' })));
  const { data: invites } = await db.from('manager_invites').select('id, email, created_at').eq('manager_id', m.id).is('accepted_at', null); // needs 015
  const used = await seatsUsed(m.id);
  const seats = SEATS[plan];
  return (
    <main style={{ maxWidth: 720, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/dashboard" className="hint">← Dashboard</Link>
      <h1 style={{ fontSize: 'clamp(28px,4.4vw,36px)', margin: 0 }}>Team for {m.name}</h1>
      <p style={{ margin: 0 }}>Everyone who works on quote requests should have their own login. {planName(plan)} includes {plan === 'enterprise' ? 'unlimited logins' : `${seats} login${seats === 1 ? '' : 's'}`}{plan === 'free' ? <>. <Link href="/managers#pricing">Pro</Link> includes up to 5.</> : '.'}</p>
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {people.map((p) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 18px', borderTop: '1px solid var(--line)' }}>
            <span>{p.email}{p.id === user.id ? <span className="hint"> (you)</span> : null}</span>
            {p.id !== user.id && <form action={removeMember}><input type="hidden" name="slug" value={m.slug} /><input type="hidden" name="user" value={p.id} /><button className="linkish">Remove</button></form>}
          </div>
        ))}
        {(invites || []).map((i) => (
          <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 18px', borderTop: '1px solid var(--line)' }}>
            <span>{i.email} <span className="hint">invited</span></span>
            <form action={removeMember}><input type="hidden" name="slug" value={m.slug} /><input type="hidden" name="invite" value={i.id} /><button className="linkish">Cancel</button></form>
          </div>
        ))}
      </div>
      <InviteForm slug={m.slug} disabled={used >= seats} />
      <p className="hint" style={{ margin: 0 }}>Please don&apos;t share a login between people. Each login is for one person, and we check for shared logins to keep accounts secure.</p>
    </main>
  );
}
