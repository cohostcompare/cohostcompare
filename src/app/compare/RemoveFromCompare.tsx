'use client';
import { useRouter } from 'next/navigation';
import { removePick } from '@/lib/client/picks';

/** Takes a manager off the shortlist (and the saved quote list), then reloads the comparison without them. */
export default function RemoveFromCompare({ slug, name, href }: { slug: string; name: string; href: string }) {
  const router = useRouter();
  return <button type="button" className="cmp-x" aria-label={`Remove ${name}`} title={`Remove ${name}`} onClick={() => { removePick(slug); router.push(href); }}>×</button>;
}
