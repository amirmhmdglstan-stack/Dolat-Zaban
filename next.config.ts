import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.STATIC_EXPORT === "1" ? "export" : "standalone",
  env: {
    NEXT_PUBLIC_STATIC: process.env.STATIC_EXPORT === "1" ? "1" : "0",
  },
  images: { unoptimized: true },
  reactStrictMode: false,
};

export default nextConfig;
