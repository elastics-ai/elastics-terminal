import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Output configuration for production builds
  output: 'standalone',
  // Disable image optimization for simpler deployment
  images: {
    unoptimized: true,
  },
  // Ensure proper asset prefix
  assetPrefix: undefined,
  // Enable production source maps for debugging
  productionBrowserSourceMaps: false,
  // Skip static optimization during build
  trailingSlash: false,
  experimental: {
    esmExternals: false,
  },
};

export default nextConfig;
