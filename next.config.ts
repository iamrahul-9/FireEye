import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default {
  ...nextConfig,
  eslint: {
    ignoreDuringBuilds: true,
  },
} as NextConfig;
