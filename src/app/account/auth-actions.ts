'use server';

import { redirect } from 'next/navigation';
import { userClient } from '@/lib/supabase/server';

export async function signOut() {
  const s = await userClient();
  await s.auth.signOut();
  redirect('/');
}
