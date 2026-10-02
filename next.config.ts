import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  experimental: {
    // pet / sitter photo uploads go through server actions (5 MB limit enforced in src/lib/uploads.ts)
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.basemaps.cartocdn.com" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
