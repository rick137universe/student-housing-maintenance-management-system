import type { NextConfig } from "next";
import {legacyWorkspaceRedirects} from './src/data/workspace-paths';

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  devIndicators: false,
  redirects: async () => legacyWorkspaceRedirects,
};

export default nextConfig;
