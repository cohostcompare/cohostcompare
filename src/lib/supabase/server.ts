import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config';

/** Acts as the signed-in visitor (their session cookie). */
export async function userClient() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* called from a server component */ }
      },
    },
  });
}

/** Full access. Server only; never send its results to the browser unfiltered. */
export function adminClient() {
  const key = (process.env.SUPABASE_SECRET_KEY || '').trim();
  if (!key) throw new Error('SUPABASE_SECRET_KEY is not set');
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function currentUser() {
  const supabase = await userClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
