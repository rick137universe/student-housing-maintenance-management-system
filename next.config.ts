import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  devIndicators: false,
};

export default nextConfig;
