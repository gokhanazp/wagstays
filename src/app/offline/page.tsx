import type { Metadata } from "next";

// Static fallback served by public/sw.js when a page can't be loaded offline. It must stay static and public
// (no session, no data) because the service worker caches it. Styles are inlined and the icon is an inline SVG,
// so it looks right even when the app's CSS, fonts and JS chunks aren't in the browser cache. Links are plain
// anchors / a GET form so they work without JS.

export const dynamic = "force-static";
export const metadata: Metadata = { title: "You're offline", robots: { index: false } };

const CSS = `
.ofl{min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:#fff8f4;
  font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#221a12;box-sizing:border-box}
.ofl *{box-sizing:border-box}
.ofl-card{width:100%;max-width:440px;background:#fff;border:1px solid #EFE7DE;border-radius:24px;padding:40px 28px;text-align:center;
  box-shadow:0 4px 16px -2px rgba(83,72,62,.05);display:flex;flex-direction:column;align-items:center;gap:16px}
.ofl-logo{display:flex;align-items:center;font-weight:800;font-size:20px;color:#226150;letter-spacing:-.01em}
.ofl-logo b{color:#a23e24;font-weight:800}
.ofl-icon{width:64px;height:64px;border-radius:16px;background:#ffdbd2;color:#a23e24;display:flex;align-items:center;justify-content:center;margin-top:8px}
.ofl h1{margin:0;font-size:28px;line-height:1.2;font-weight:700}
.ofl p{margin:0;font-size:16px;line-height:1.55;color:#53483e}
.ofl-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:8px;width:100%}
.ofl-btn{display:inline-flex;align-items:center;justify-content:center;height:44px;padding:0 24px;border-radius:999px;font:inherit;
  font-weight:600;font-size:15px;text-decoration:none;cursor:pointer;border:0}
.ofl-primary{background:#a23e24;color:#fff}
.ofl-secondary{background:#EBF3EF;color:#3d7a68;border:1px solid #C8DDD4}
@media (max-width:420px){.ofl-actions{flex-direction:column}.ofl-btn{width:100%}}
`;

export default function OfflinePage() {
  return (
    <main className="ofl">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ofl-card">
        <div className="ofl-logo" aria-label="WagStays">
          Wag<b>Stays</b>
        </div>
        <span className="ofl-icon">
          <svg aria-hidden="true" fill="none" height="34" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="34">
            <path d="M2 2l20 20" />
            <path d="M8.5 16.5a5 5 0 0 1 7 0" />
            <path d="M5 12.86a10 10 0 0 1 5.17-2.7" />
            <path d="M19 12.86a10 10 0 0 0-2.29-1.62" />
            <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
            <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
            <path d="M12 20h.01" />
          </svg>
        </span>
        <h1>You&apos;re offline</h1>
        <p>WagStays needs a connection to load this page. Check your Wi-Fi or mobile data — your bookings and messages will be right here when you&apos;re back.</p>
        <form className="ofl-actions" method="get">
          <button className="ofl-btn ofl-primary" type="submit">
            Try again
          </button>
          {/* Full page load on purpose: works without JS chunks and goes through the SW network-first path. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="ofl-btn ofl-secondary" href="/">
            Go to home
          </a>
        </form>
      </div>
    </main>
  );
}
