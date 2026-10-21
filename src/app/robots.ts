import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "@/lib/seo/site";
import { isLive } from "@/lib/site-mode";

const PRIVATE = ["/admin", "/account", "/sitter/", "/messages", "/book", "/api", "/auth", "/favourites", "/set-password", "/suspended"];

export default function robots(): MetadataRoute.Robots {
  // pre-launch: keep every crawler out (SITE_MODE=live opens the site)
  if (!isLive()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...PRIVATE, "/sitter$"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl(),
  };
}
