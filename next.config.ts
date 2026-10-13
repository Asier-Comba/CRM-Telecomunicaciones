import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig = (phase: string): NextConfig => ({
  devIndicators: false,
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [{source: '/:path*', headers: [
      {key: 'X-Content-Type-Options', value: 'nosniff'},
      {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
      {key: 'X-Frame-Options', value: 'DENY'},
      {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()'},
      {key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'"},
    ]}]
  },
  // A production build regenerates its own complete route validators. Dev
  // validators belong to the development server and remain checked there.
  ...(phase === PHASE_PRODUCTION_BUILD
    ? { typescript: { tsconfigPath: "tsconfig.build.json" } }
    : {}),
});

export default nextConfig;
