import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const prod = process.env.VERCEL_ENV === 'production';
  return prod
    ? { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/dashboard', '/api', '/quote', '/claim', '/signin', '/join', '/search'] }], sitemap: 'https://www.cohostcompare.com/sitemap.xml' }
    : { rules: [{ userAgent: '*', disallow: '/' }] };
}
