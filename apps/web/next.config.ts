import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@gnevo/types'],
  // Turbopack (used by `next dev --turbopack`) — dramatically faster dev
  // compilation than webpack. Mirror the `.js` → `.ts` resolution below so
  // workspace packages with NodeNext `.js` import specifiers still resolve.
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },
  // Workspace packages use NodeNext `.js` import specifiers that point at `.ts`
  // sources. Teach webpack (used by `next build`) to resolve `.js` → `.ts`/`.tsx`
  // so those packages bundle correctly.
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
