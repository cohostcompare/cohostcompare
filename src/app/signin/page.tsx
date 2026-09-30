import type { Metadata } from 'next';
import EmailSignIn from '@/components/EmailSignIn';

import Link from 'next/link';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

type SP = Promise<{ next?: string; error?: string; mode?: string }>;

export default async function SignIn({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/account';
  return (
    <main style={{ maxWidth: 480, paddingBlock: '24px 64px', display: 'grid', gap: 16 }}>
      <h1 style={{ fontSize: 34, margin: 0 }}>{sp.mode === 'signup' ? 'Create your free account' : 'Sign in'}</h1>
      <p style={{ margin: 0, color: 'var(--muted)' }}>
        {sp.mode === 'signup'
          ? <>Save your searches, request quotes and compare them in one inbox. Already have an account? <Link href={`/signin?next=${encodeURIComponent(next)}`}>Sign in</Link></>
          : <>New here? <Link href={`/signin?mode=signup&next=${encodeURIComponent(next)}`}>Create a free account</Link>. It works the same way.</>}
      </p>
      {sp.error === 'link' && <p role="alert" style={{ color: 'var(--signal)', margin: 0 }}>That sign-in link has expired or was already used. Request a new one below.</p>}
      <EmailSignIn next={next} mode={sp.mode === 'signup' ? 'signup' : 'signin'} />
    </main>
  );
}
