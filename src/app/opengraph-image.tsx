import { ImageResponse } from 'next/og';

export const alt = 'CoHostCompare: compare every short-term rental manager for your property';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0F5E57', color: '#fff', padding: 72, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 40, fontWeight: 800 }}>
          <svg width="60" height="60" viewBox="0 0 34 34"><path d="M3 16 L12 8 L21 16 V28 H3 Z" fill="#fff" /><path d="M13 16 L22 8 L31 16 V28 H13 Z" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" /></svg>
          CoHostCompare
        </div>
        <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, lineHeight: 1.05, maxWidth: 980 }}>Compare every short-term rental manager for your property.</div>
        <div style={{ display: 'flex', fontSize: 32, opacity: 0.9 }}>Fees, ratings and homes nearby, side by side. Up to 5 quotes, free.</div>
      </div>
    ),
    size,
  );
}
