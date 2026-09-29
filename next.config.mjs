/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [{ source: '/email/signature', destination: '/email/signature.html' }];
  },
};
export default nextConfig;
