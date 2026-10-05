import type { Metadata } from 'next';
import Link from 'next/link';
import { PLATFORMS, SERVICES, requireManager } from '@/lib/managers';
import { removeMedia, saveCaptions } from './actions';
import AbnForm from './AbnForm';
import MediaUploader from './MediaUploader';
import { adminClient } from '@/lib/supabase/server';
import ProfileForm from './ProfileForm';

export const metadata: Metadata = { title: 'Edit profile', robots: { index: false } };
export const dynamic = 'force-dynamic';

type P = Promise<{ slug: string }>;

export default async function EditProfile({ params }: { params: P }) {
  const { slug } = await params;
  const { manager: m } = await requireManager(slug, `/dashboard/${slug}/edit`);
  const { data: abn } = await adminClient().from('managers').select('abn, abn_verified_at').eq('id', m.id).maybeSingle(); // needs 009
  return (
    <main style={{ maxWidth: 860, paddingBlock: '16px 64px', display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Link href="/dashboard" className="hint">← Dashboard</Link>
          <h1 style={{ fontSize: 'clamp(28px,4.4vw,38px)', margin: '4px 0 0' }}>Edit {m.name}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn secondary" href={`/dashboard/${m.slug}/requirements`}>Properties you take on</Link>
          <Link className="btn secondary" href={`/managers/${m.slug}`}>View public profile</Link>
        </div>
      </div>

      <section id="media" className="panel" style={{ display: 'grid', gap: 14 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Logo and photos</h2>
        {(m.logo_url || m.photos.length > 0) && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {m.logo_url && (
              <form action={removeMedia} style={{ display: 'grid', gap: 4, justifyItems: 'center' }}>
                <img src={m.logo_url} alt="Your logo" width={88} height={88} style={{ width: 88, height: 88, objectFit: 'contain', borderRadius: 10, border: '1px solid var(--line)', background: '#fff' }} />
                <input type="hidden" name="slug" value={m.slug} /><input type="hidden" name="kind" value="logo" /><input type="hidden" name="url" value={m.logo_url} />
                <button className="hint" type="submit" style={{ background: 'none', border: 0, cursor: 'pointer', textDecoration: 'underline', padding: '6px 8px', minHeight: 32 }}>Remove logo</button>
              </form>
            )}
          </div>
        )}
        {m.photos.length > 0 && (
          <form action={saveCaptions} style={{ display: 'grid', gap: 10 }}>
            <input type="hidden" name="slug" value={m.slug} />
            <p style={{ margin: 0 }}><b>Photos.</b> Add a short caption to each, like “3-bedroom house, Byron Bay”, so owners know what they&apos;re looking at. Captions show under the photos on your profile.</p>
            <div className="caption-grid">
              {m.photos.map((p, i) => (
                <div key={p} style={{ display: 'grid', gap: 6 }}>
                  <img src={p} alt="" width={200} height={133} style={{ width: '100%', aspectRatio: '3 / 2', height: 'auto', objectFit: 'cover', borderRadius: 10 }} />
                  <label className="sr-only" htmlFor={`cap-${i}`}>Caption for photo {i + 1}</label>
                  <input id={`cap-${i}`} className="field" name={`caption:${p}`} defaultValue={m.photo_captions?.[p] || ''} placeholder="e.g. 2-bedroom apartment, Manly" maxLength={60} />
                  <button className="hint" type="submit" formAction={removeMedia} name="url" value={p} aria-label={`Remove photo ${i + 1}`} style={{ background: 'none', border: 0, cursor: 'pointer', textDecoration: 'underline', padding: '4px 0', minHeight: 28, justifySelf: 'start' }}>Remove photo</button>
                </div>
              ))}
            </div>
            <input type="hidden" name="kind" value="photo" />
            <div><button className="btn primary" type="submit">Save captions</button></div>
          </form>
        )}
        <MediaUploader slug={m.slug} />
      </section>

      <ProfileForm slug={m.slug} name={m.name} values={m} services={SERVICES} platforms={PLATFORMS} />
      <AbnForm slug={m.slug} abn={(abn as { abn?: string } | null)?.abn ?? null} verified={Boolean((abn as { abn_verified_at?: string } | null)?.abn_verified_at)} />
    </main>
  );
}
