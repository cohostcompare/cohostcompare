import type { Metadata } from 'next';
import EmailSignIn from '@/components/EmailSignIn';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

type SP = Promise<{ next?: string; error?: string }>;

export default async function SignIn({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/account';
  return (
    <main style={{ maxWidth: 480, paddingBlock: '24px 64px', display: 'grid', gap: 16 }}>
      <h1 style={{ fontSize: 34, margin: 0 }}>Sign in</h1>
      {sp.error === 'link' && <p role="alert" style={{ color: 'var(--signal)', margin: 0 }}>That sign-in link has expired or was already used. Request a new one below.</p>}
      <EmailSignIn next={next} />
    </main>
  );
}
