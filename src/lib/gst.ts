/*
 GST on a manager's quoted fee. Shared by the quote form (client), the comparison table and the server.
 - plus:     the fee is quoted before GST, so owners pay 10% more (the only case that changes the comparison maths)
 - includes: the fee already includes GST
 - none:     the manager isn't registered for GST, so none applies
 Quotes saved before this had only `gst: boolean` (true = plus GST, false = "included / not charged"), mapped by gstModeOf.
*/
export type GstMode = 'plus' | 'includes' | 'none';

export const GST_OPTIONS: { value: GstMode; label: string }[] = [
  { value: 'plus', label: 'Plus GST' },
  { value: 'includes', label: 'Includes GST' },
  { value: 'none', label: 'Not registered for GST' },
];

export function gstModeOf(q: { gst?: boolean | null; gstMode?: string | null } | null | undefined): GstMode {
  if (q?.gstMode === 'plus' || q?.gstMode === 'includes' || q?.gstMode === 'none') return q.gstMode;
  return q?.gst ? 'plus' : 'includes';
}

/** Short suffix after a fee percentage, e.g. "18% + GST", "18% incl. GST", "18% (no GST)". */
export const gstSuffix = (mode: GstMode) => (mode === 'plus' ? ' + GST' : mode === 'includes' ? ' incl. GST' : ' (no GST)');
