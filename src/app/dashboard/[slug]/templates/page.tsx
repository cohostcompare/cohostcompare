import type { Metadata } from 'next';
import Link from 'next/link';
import { requireManager } from '@/lib/managers';
import { isPro, plansFor, PRO_PRICE } from '@/lib/pro';
import { adminClient } from '@/lib/supabase/server';
import { deleteTemplate } from './actions';
import RenameForm from './RenameForm';
import { gstModeOf, gstSuffix } from '@/lib/gst';

export const metadata: Metadata = { title: 'Quote templates', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Tpl = { name: string; q: Record<string, unknown> };

export default async function Templates({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { manager: m } = await requireManager(slug, `/dashboard/${slug}/templates`);
  const pro = isPro((await plansFor([m.id])).get(m.id));
  const { data } = await adminClient().from('managers').select('quote_templates').eq('id', m.id).maybeSingle(); // needs 015
  const list = ((data?.quote_templates as Tpl[] | null) || []);

  return (
    <main style={{ maxWidth: 720, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/dashboard" className="hint">← Dashboard</Link>
      <h1 style={{ fontSize: 'clamp(28px,4.4vw,36px)', margin: 0 }}>Quote templates for {m.name}</h1>
      <p style={{ margin: 0 }}>
        A template saves your standard fees, terms and inclusions, so you can fill in a quote in one click and only change what&apos;s specific to the property.
        {pro ? ' Save one from any quote request: fill in the quote, give it a name and click “Save as template”.' : <> Quote templates are part of <Link href="/managers#pricing">Pro</Link> ({PRO_PRICE}).</>}
      </p>
      {!pro ? (
        <div className="locked">
          <b>🔒 Templates are a Pro tool</b>
          <ul>
            <li>Save up to 10 templates, for example “Standard 2-bed” or “Full management, 12-month minimum”</li>
            <li>Pick one at the top of any quote request to fill in the form</li>
            <li>Rename or delete them here</li>
          </ul>
          <span className="hint">Pro never changes where you appear in results or how owners compare quotes.</span>
        </div>
      ) : !list.length ? (
        <div className="panel" style={{ display: 'grid', gap: 8 }}>
          <b>No templates yet</b>
          <span>Open a quote request, fill in your usual fee, setup fee, minimum term, notice period and what&apos;s included, then type a name next to <b>Save as template</b> at the bottom of the quote form. Estimates for a specific property aren&apos;t saved, so a template works for any home.</span>
          <Link href="/dashboard/requests">Open your quote requests →</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {list.map((t) => {
            const q = t.q || {};
            const inc = Array.isArray(q.included) ? (q.included as string[]) : [];
            return (
              <section key={t.name} className="panel" style={{ display: 'grid', gap: 10 }}>
                <h2 style={{ fontSize: 20, margin: 0 }}>{t.name}</h2>
                <p style={{ margin: 0, color: 'var(--muted)' }}>
                  {q.feePct != null ? `${q.feePct}%${gstSuffix(gstModeOf(q as { gst?: boolean; gstMode?: string }))} management fee` : 'No fee set'} · {q.setupFee ? `A$${q.setupFee} setup` : 'no setup fee'} · {q.minTermMonths ? `${q.minTermMonths}-month minimum term` : 'no lock-in'}{q.noticeDays != null ? ` · ${q.noticeDays} days’ notice` : ''}
                  {inc.length ? <><br />Includes: {inc.join(', ')}</> : null}
                </p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  <RenameForm slug={m.slug} name={t.name} />
                  <form action={deleteTemplate}><input type="hidden" name="slug" value={m.slug} /><input type="hidden" name="name" value={t.name} /><button className="linkish" style={{ color: 'var(--signal)' }}>Delete</button></form>
                </div>
              </section>
            );
          })}
          <p className="hint" style={{ margin: 0 }}>Up to 10 templates. Saving a template with an existing name replaces it.</p>
        </div>
      )}
    </main>
  );
}
