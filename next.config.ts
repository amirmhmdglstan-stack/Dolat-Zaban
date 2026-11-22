import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.STATIC_EXPORT === "1" ? "export" : "standalone",
  images: { unoptimized: true },
  reactStrictMode: false,
};

export default nextConfig;
