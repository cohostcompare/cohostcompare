/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: '/why-cohostcompare', destination: '/why-us', permanent: true }];
  },
  async rewrites() {
    return [{ source: '/email/signature', destination: '/email/signature.html' }];
  },
};
export default nextConfig;
