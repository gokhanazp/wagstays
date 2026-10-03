import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "@/lib/seo/site";

const PRIVATE = ["/admin", "/account", "/sitter/", "/messages", "/book", "/api", "/auth", "/favourites", "/set-password", "/suspended"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...PRIVATE, "/sitter$"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl(),
  };
}
