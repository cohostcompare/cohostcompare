import type { Metadata } from 'next';
import EmailSignIn from '@/components/EmailSignIn';


export const metadata: Metadata = { title: 'Sign in or join free', robots: { index: false } };

type SP = Promise<{ next?: string; error?: string; mode?: string }>;

export default async function SignIn({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/account';
  return (
    <main style={{ maxWidth: 480, paddingBlock: '24px 64px', display: 'grid', gap: 16 }}>
      <h1 style={{ fontSize: 34, margin: 0 }}>Sign in or join free</h1>
      <p style={{ margin: 0, color: 'var(--muted)' }}>One step for both: new here, and we&apos;ll create your free account. Request quotes, compare them and message managers in one inbox.</p>
      {sp.error === 'link' && <p role="alert" style={{ color: 'var(--signal)', margin: 0 }}>That sign-in link didn&apos;t work. It may have expired or been used already. Request a new one below.</p>}
      <EmailSignIn next={next} />
    </main>
  );
}
