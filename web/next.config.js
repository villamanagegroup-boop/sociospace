/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'bjfvmclkpmqarvnrlttk.supabase.co' }
    ]
  },
  // The marketing static site lives at web/public/. Rewrite / so the brand
  // homepage (public/index.html) is served at the root URL without losing
  // the / address.
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/index.html' }
      ]
    };
  }
};

module.exports = nextConfig;
