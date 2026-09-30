'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/supabase/config';
import { attachMedia, prepareUploads } from './actions';

export default function MediaUploader({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const logo = f.get('logo') as File | null;
    const photos = (f.getAll('photos') as File[]).filter((x) => x.size > 0);
    const files = [...(logo && logo.size ? [{ file: logo, kind: 'logo' as const }] : []), ...photos.map((file) => ({ file, kind: 'photo' as const }))];
    setBusy(true); setMsg({});
    try {
      const prep = await prepareUploads(slug, files.map((x) => ({ kind: x.kind, type: x.file.type, size: x.file.size })), Boolean(f.get('rights')));
      if ('error' in prep) { setMsg({ error: prep.error }); return; }
      const sb = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
      const done: { kind: 'logo' | 'photo'; path: string }[] = [];
      for (let i = 0; i < prep.slots!.length; i++) {
        const s = prep.slots![i];
        const { error } = await sb.storage.from('manager-media').uploadToSignedUrl(s.path, s.token, files[i].file, { contentType: files[i].file.type });
        if (error) { setMsg({ error: `Upload failed for ${files[i].file.name}: ${error.message}` }); return; }
        done.push({ kind: s.kind, path: s.path });
      }
      const res = await attachMedia(slug, done);
      if ('error' in res && res.error) { setMsg({ error: res.error }); return; }
      setMsg({ ok: `Uploaded ${done.length} image${done.length === 1 ? '' : 's'}.` });
      e.currentTarget?.reset?.();
      router.refresh();
    } catch {
      setMsg({ error: 'Upload failed. Check your connection and try again.' });
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 }}>Logo (square works best)
          <input className="field" type="file" name="logo" accept="image/jpeg,image/png,image/webp" />
        </label>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 }}>Photos of homes you manage (up to 12, or 24 with Pro)
          <input className="field" type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple />
        </label>
      </div>
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <input type="checkbox" name="rights" style={{ width: 18, height: 18, marginTop: 3, accentColor: 'var(--brand)' }} />
        <span>I own these images or have permission to use them, including from the property owners shown.</span>
      </label>
      <button className="btn secondary" type="submit" disabled={busy} style={{ justifySelf: 'start' }}>{busy ? 'Uploading…' : 'Upload'}</button>
      {msg.error && <p role="alert" style={{ margin: 0, color: 'var(--signal)' }}>{msg.error}</p>}
      {msg.ok && <p role="status" style={{ margin: 0, color: 'var(--brand)' }}>{msg.ok}</p>}
      <p className="hint" style={{ margin: 0 }}>JPG, PNG or WebP, up to 5 MB each.</p>
    </form>
  );
}
