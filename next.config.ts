import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.basemaps.cartocdn.com" }],
  },
};

export default nextConfig;
