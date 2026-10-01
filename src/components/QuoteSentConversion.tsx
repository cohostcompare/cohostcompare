'use client';
import { useEffect } from 'react';
import { GADS_ID, QUOTE_SENT_LABEL } from '@/lib/ads';

/** Reports one "Quote request sent" conversion to Google Ads. The request id is the transaction id, so a refresh never counts twice. */
export default function QuoteSentConversion({ requestId }: { requestId: string }) {
  useEffect(() => {
    if (!QUOTE_SENT_LABEL || !requestId) return;
    const key = `conv:${requestId}`;
    try { if (sessionStorage.getItem(key)) return; } catch { /* storage blocked: Google still dedupes on transaction_id */ }
    let tries = 0;
    const fire = () => {
      const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
      if (!g) { if (++tries < 20) setTimeout(fire, 250); return; }
      g('event', 'conversion', { send_to: `${GADS_ID}/${QUOTE_SENT_LABEL}`, transaction_id: requestId });
      try { sessionStorage.setItem(key, '1'); } catch { /* fine */ }
    };
    fire();
  }, [requestId]);
  return null;
}
