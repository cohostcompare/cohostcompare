'use client';

export default function PrintButton() {
  return <button type="button" className="btn secondary small" onClick={() => window.print()}>Print or save as PDF</button>;
}
