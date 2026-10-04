/** @type {import('next').NextConfig} */
const nextConfig = {
  // AI crawlers don't run JavaScript, so give them the full HTML with <title> and canonical in <head>.
  htmlLimitedBots: /GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|anthropic-ai|PerplexityBot|Perplexity-User|CCBot|Amazonbot|Bytespider|Applebot|DuckDuckBot|Bingbot|YandexBot|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|WhatsApp|TelegramBot/i,
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      ],
    }];
  },
  async redirects() {
    return [{ source: '/why-cohostcompare', destination: '/why-us', permanent: true }];
  },
  async rewrites() {
    return [{ source: '/email/signature', destination: '/email/signature.html' }];
  },
};
export default nextConfig;
