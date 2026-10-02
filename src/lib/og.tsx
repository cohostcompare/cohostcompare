import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

/** Branded share image: a label, a headline and a line of detail. */
export function ogCard(label: string, title: string, sub: string) {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0F5E57', color: '#fff', padding: 72, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 34, fontWeight: 800 }}>
          <svg width="52" height="52" viewBox="0 0 34 34"><path d="M3 16 L12 8 L21 16 V28 H3 Z" fill="#fff" /><path d="M13 16 L22 8 L31 16 V28 H13 Z" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" /></svg>
          CoHostCompare
          <span style={{ marginLeft: 'auto', fontSize: 26, fontWeight: 600, opacity: 0.85 }}>{label}</span>
        </div>
        <div style={{ display: 'flex', fontSize: title.length > 60 ? 58 : 68, fontWeight: 800, lineHeight: 1.08, maxWidth: 1040 }}>{title}</div>
        <div style={{ display: 'flex', fontSize: 30, opacity: 0.9 }}>{sub}</div>
      </div>
    ),
    OG_SIZE,
  );
}
