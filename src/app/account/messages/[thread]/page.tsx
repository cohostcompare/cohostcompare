import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { adminClient, currentUser, userClient } from '@/lib/supabase/server';
import Composer from './Composer';

export const metadata: Metadata = { title: 'Conversation', robots: { index: false } };

type P = Promise<{ thread: string }>;

const WHO: Record<string, string> = { owner: 'You', system: 'CoHostCompare' };

export default async function Thread({ params }: { params: P }) {
  const { thread } = await params;
  const user = await currentUser();
  if (!user) redirect(`/signin?next=/account/messages/${thread}`);
  const s = await userClient();
  const { data: t } = await s
    .from('quote_request_managers')
    .select('id, manager_name, manager_slug, status, quote_requests(address, postcode, bedrooms, property_type, created_at)')
    .eq('id', thread)
    .single();
  if (!t) notFound();
  const { data: msgs } = await s.from('messages').select('id, sender, body, created_at').eq('thread_id', thread).order('created_at');
  // Mark manager messages as read by the owner.
  await adminClient().from('messages').update({ read_by_owner: true }).eq('thread_id', thread).eq('read_by_owner', false);

  const req = Array.isArray(t.quote_requests) ? t.quote_requests[0] : t.quote_requests;
  return (
    <main style={{ maxWidth: 760, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/account" className="hint">← All conversations</Link>
      <div>
        <h1 style={{ fontSize: 'clamp(26px,4vw,34px)', margin: 0 }}>{t.manager_name}</h1>
        <p className="hint" style={{ margin: '4px 0 0' }}>
          About {req?.address || `postcode ${req?.postcode}`} · {req?.property_type}, {req?.bedrooms} bed · <Link href={`/managers/${t.manager_slug}`}>View profile</Link>
        </p>
      </div>
      <section className="panel" style={{ display: 'grid', gap: 14 }} aria-label="Messages">
        {(msgs || []).map((m) => (
          <div key={m.id} style={{ justifySelf: m.sender === 'owner' ? 'end' : 'start', maxWidth: '85%', display: 'grid', gap: 4 }}>
            <span className="hint" style={{ textAlign: m.sender === 'owner' ? 'right' : 'left' }}>
              {WHO[m.sender] || t.manager_name} · {new Date(m.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' })}
            </span>
            <div style={{
              padding: '10px 14px', borderRadius: 12, whiteSpace: 'pre-wrap',
              background: m.sender === 'owner' ? 'var(--brand)' : m.sender === 'system' ? 'var(--surface)' : 'var(--tint)',
              color: m.sender === 'owner' ? 'var(--on-brand)' : 'var(--ink)',
              border: m.sender === 'system' ? '1px dashed var(--line-strong)' : '0',
            }}>{m.body}</div>
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <Composer thread={t.id} />
        </div>
      </section>
      <p className="hint" style={{ margin: 0 }}>Keep contact details in the conversation for now. They&apos;re shared automatically when you accept a quote.</p>
    </main>
  );
}
