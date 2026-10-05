import type { NextConfig } from "next";

// Baseline hardening for every response (HSTS is added by Vercel). No CSP yet: map tiles, Supabase and Google Fonts
// would need a nonce-based policy — tracked for after launch.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // geolocation stays on for the sitter's live walk tracking; nothing uses the camera/mic APIs directly
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
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
