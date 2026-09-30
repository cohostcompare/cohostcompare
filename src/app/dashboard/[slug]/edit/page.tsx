import type { Metadata } from 'next';
import Link from 'next/link';
import { PLATFORMS, SERVICES, requireManager } from '@/lib/managers';
import { removeMedia } from './actions';
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
        <Link className="btn secondary" href={`/managers/${m.slug}`}>View public profile</Link>
      </div>

      <section id="media" className="panel" style={{ display: 'grid', gap: 14 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Logo and photos</h2>
        {(m.logo_url || m.photos.length > 0) && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {m.logo_url && (
              <form action={removeMedia} style={{ display: 'grid', gap: 4, justifyItems: 'center' }}>
                <img src={m.logo_url} alt="Your logo" width={88} height={88} style={{ width: 88, height: 88, objectFit: 'contain', borderRadius: 10, border: '1px solid var(--line)', background: '#fff' }} />
                <input type="hidden" name="slug" value={m.slug} /><input type="hidden" name="kind" value="logo" /><input type="hidden" name="url" value={m.logo_url} />
                <button className="hint" type="submit" style={{ background: 'none', border: 0, cursor: 'pointer', textDecoration: 'underline' }}>Remove logo</button>
              </form>
            )}
            {m.photos.map((p) => (
              <form key={p} action={removeMedia} style={{ display: 'grid', gap: 4, justifyItems: 'center' }}>
                <img src={p} alt="" width={132} height={88} style={{ width: 132, height: 88, objectFit: 'cover', borderRadius: 10 }} />
                <input type="hidden" name="slug" value={m.slug} /><input type="hidden" name="kind" value="photo" /><input type="hidden" name="url" value={p} />
                <button className="hint" type="submit" style={{ background: 'none', border: 0, cursor: 'pointer', textDecoration: 'underline' }}>Remove</button>
              </form>
            ))}
          </div>
        )}
        <MediaUploader slug={m.slug} />
      </section>

      <ProfileForm slug={m.slug} name={m.name} values={m} services={SERVICES} platforms={PLATFORMS} />
      <AbnForm slug={m.slug} abn={(abn as { abn?: string } | null)?.abn ?? null} verified={Boolean((abn as { abn_verified_at?: string } | null)?.abn_verified_at)} />
    </main>
  );
}
