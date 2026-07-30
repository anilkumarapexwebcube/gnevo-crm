import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@gnevo/types'],
  // Workspace packages use NodeNext `.js` import specifiers that point at `.ts`
  // sources. Teach webpack to resolve `.js` → `.ts`/`.tsx` so those packages
  // bundle correctly.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
  async rewrites() {
    // Proxy API calls to the NestJS backend during dev (BFF pattern).
    const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
    return [{ source: '/api/v1/:path*', destination: `${apiUrl}/v1/:path*` }];
  },
};

export default nextConfig;
