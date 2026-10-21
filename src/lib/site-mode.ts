// Pre-launch switches, read from env on the server (proxy, robots, metadata).
//   SITE_MODE=live            → public site, indexable
//   anything else / unset     → noindex everywhere
//   PREVIEW_ACCESS_CODE=…     → while not live, visitors see /coming-soon unless they opened /preview?code=…
// Local dev (`next dev`) is never gated.

export const PREVIEW_COOKIE = "ws_preview";

export function isLive() {
  return process.env.SITE_MODE === "live";
}

function previewCode() {
  return process.env.PREVIEW_ACCESS_CODE?.trim() || null;
}

export function previewGateEnabled() {
  return !isLive() && !!previewCode() && process.env.NODE_ENV === "production";
}

/** Cookie value that proves the visitor used the access link (a hash, so the code itself never sits in a cookie). */
export async function previewToken() {
  const code = previewCode();
  if (!code) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`wagstays-preview:${code}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time check of a submitted access code. */
export async function isValidPreviewCode(input: string | null) {
  const code = previewCode();
  if (!code || !input) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(input.trim())),
    crypto.subtle.digest("SHA-256", enc.encode(code)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
