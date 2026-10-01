import Script from 'next/script';
import { GADS_ID } from '@/lib/ads';

/** Google Ads tag, production only. Loads after the page is interactive so it never slows the first paint. */
export default function GoogleTag() {
  if (process.env.VERCEL_ENV !== 'production') return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GADS_ID}`} strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GADS_ID}');`}</Script>
    </>
  );
}
