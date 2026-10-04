'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { checkPrompt, promptAction } from '@/app/feedback/actions';

// Never interrupt someone mid-task.
const QUIET = /^\/(feedback|quote|signin|join|claim|admin|ops|partners|search|areas\/|compare|account\/messages)|\/edit$|\/review\//;

export default function FeedbackPrompt() {
  const path = usePathname() || '/';
  const [ask, setAsk] = useState<{ role: 'owner' | 'manager'; reward: string | null } | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (QUIET.test(path)) return;
    let seen = false;
    try { seen = sessionStorage.getItem('cc_fbp') === '1'; } catch { /* fine */ }
    if (seen) return;
    let live = true;
    const t = setTimeout(async () => {
      try { sessionStorage.setItem('cc_fbp', '1'); } catch { /* fine */ }
      const a = await checkPrompt().catch(() => null);
      if (!a || !live) return;
      setAsk(a); setOpen(true);
      promptAction('shown').catch(() => {});
    }, 12000);
    return () => { live = false; clearTimeout(t); };
  }, [path]);
  if (!open || !ask) return null;
  const { role, reward } = ask;
  const close = (kind: 'later' | 'never') => { setOpen(false); promptAction(kind).catch(() => {}); };
  return (
    <aside className="fb-pop" role="dialog" aria-labelledby="fb-title">
      <button className="x" type="button" aria-label="Close" onClick={() => close('later')}>×</button>
      <h2 id="fb-title">Got two minutes to help us improve?</h2>
      <p>CoHostCompare is new, and we&apos;re building it for {role === 'manager' ? 'managers' : 'owners'} like you. You&apos;ve used it enough to know what works and what doesn&apos;t, so we&apos;d really value your honest feedback.</p>
      {reward && <div className="gift">🎁 As a thank you: <b>{reward}</b>{role === 'manager' ? ', added to your account straight away.' : '.'}</div>}
      <div className="row">
        <Link className="btn primary small" href={`/feedback?from=${encodeURIComponent(path)}`} onClick={() => setOpen(false)}>Give feedback</Link>
        <button className="linkish" type="button" onClick={() => close('later')}>Maybe later</button>
        <button className="linkish" type="button" onClick={() => close('never')} style={{ marginLeft: 'auto' }}>No thanks</button>
      </div>
    </aside>
  );
}
