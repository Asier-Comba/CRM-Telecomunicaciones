import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig = (phase: string): NextConfig => ({
  devIndicators: false,
  // A production build regenerates its own complete route validators. Dev
  // validators belong to the development server and remain checked there.
  ...(phase === PHASE_PRODUCTION_BUILD
    ? { typescript: { tsconfigPath: "tsconfig.build.json" } }
    : {}),
});

export default nextConfig;
