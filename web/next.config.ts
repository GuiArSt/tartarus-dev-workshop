import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable server-side features
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Output standalone for Docker deployment
  output: "standalone",
};

export default nextConfig;
