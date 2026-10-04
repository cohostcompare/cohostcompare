'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMe } from '@/lib/client/me';
import { PROPERTY_KEY, type PropertyDetails } from '@/lib/requirements';

/*
 The owner's property details, shared by search results, profiles and the quote form.
 Owners: kept in localStorage, so a return visit remembers them.
 Admins ("fresh"): kept in sessionStorage only, so every new tab starts with the first-time experience,
 but the details still carry between results and profiles within that tab.
*/
const EVT = 'cc-property-change';
const store = (fresh?: boolean) => { try { return fresh ? sessionStorage : localStorage; } catch { return null; } };

export function loadProperty(fresh?: boolean): PropertyDetails {
  try { return JSON.parse(store(fresh)?.getItem(PROPERTY_KEY) || '{}') || {}; } catch { return {}; }
}
export function saveProperty(fresh: boolean | undefined, p: PropertyDetails) {
  try { store(fresh)?.setItem(PROPERTY_KEY, JSON.stringify(p)); } catch { /* fine */ }
  window.dispatchEvent(new Event(EVT));
}
export const isComplete = (p: PropertyDetails) => Boolean(p.type && p.beds != null && (p.beds as unknown) !== '' && p.availability && p.services?.length);

export function useProperty(freshProp?: boolean) {
  // Admins get a fresh form in every tab (sessionStorage). Known from the server when passed, otherwise from /api/me.
  const me = useMe();
  const fresh = freshProp ?? Boolean(me?.isAdmin);
  const [prop, setProp] = useState<PropertyDetails>({});
  useEffect(() => {
    const sync = () => setProp(loadProperty(fresh));
    sync();
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, [fresh]);
  const update = useCallback((k: keyof PropertyDetails, v: unknown) => {
    const next = { ...loadProperty(fresh), [k]: v === '' ? null : v } as PropertyDetails;
    setProp(next);
    saveProperty(fresh, next);
  }, [fresh]);
  return { prop, update, complete: isComplete(prop) };
}
