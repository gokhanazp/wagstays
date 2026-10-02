import type { Config } from "tailwindcss";

// Design tokens ported 1:1 from the Stitch "Warm Paw Companion" design system.
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      "colors": {
        "surface-container-highest": "#f0e0d2",
        "surface": "#fff8f4",
        "secondary-fixed-dim": "#ffb4a2",
        "surface-bright": "#fff8f4",
        "secondary": "#a23e24",
        "on-tertiary": "#ffffff",
        "primary": "#226150",
        "on-background": "#221a12",
        "surface-container": "#fcebdd",
        "on-tertiary-container": "#fff1e3",
        "surface-dim": "#e8d7ca",
        "tertiary-container": "#956600",
        "on-surface": "#221a12",
        "primary-fixed": "#b0f0d9",
        "error-container": "#ffdad6",
        "background": "#fff8f4",
        "surface-tint": "#2b6958",
        "on-error-container": "#93000a",
        "on-primary-fixed-variant": "#0a5040",
        "on-secondary": "#ffffff",
        "surface-container-high": "#f6e5d7",
        "inverse-on-surface": "#ffeee0",
        "on-secondary-container": "#721c05",
        "on-secondary-fixed": "#3c0800",
        "tertiary-fixed-dim": "#fdbb49",
        "surface-container-low": "#fff1e7",
        "primary-fixed-dim": "#95d3be",
        "outline-variant": "#bfc9c3",
        "on-secondary-fixed-variant": "#82270f",
        "on-error": "#ffffff",
        "tertiary-fixed": "#ffddae",
        "inverse-primary": "#95d3be",
        "secondary-container": "#fd8363",
        "on-primary": "#ffffff",
        "on-primary-fixed": "#002018",
        "error": "#ba1a1a",
        "primary-container": "#3d7a68",
        "secondary-fixed": "#ffdbd2",
        "surface-variant": "#f0e0d2",
        "outline": "#707975",
        "on-tertiary-fixed": "#281800",
        "inverse-surface": "#382f26",
        "on-primary-container": "#caffeb",
        "tertiary": "#754f00",
        "on-surface-variant": "#404945",
        "on-tertiary-fixed-variant": "#604100",
        "surface-container-lowest": "#ffffff"
      },
      "borderRadius": {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      "spacing": {
        "space-md": "1rem",
        "gutter": "1.5rem",
        "gutter-mobile": "1rem",
        "margin": "2.5rem",
        "margin-mobile": "1rem",
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-lg": "1.5rem",
        "space-xl": "2.5rem"
      },
      "fontFamily": {
        "display-lg": [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "title-md": [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "body-md": [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "headline-lg": [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "display-lg-mobile": [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "headline-lg-mobile": [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "body-lg": [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "label-md": [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "body-sm": [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "label-sm": [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "headline-sm": [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "headline-md": [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "sans-serif"
        ],
        "label-lg": [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "sans-serif"
        ]
      },
      "fontSize": {
        "display-lg": [
          "48px",
          {
            "lineHeight": "56px",
            "letterSpacing": "-0.02em",
            "fontWeight": "800"
          }
        ],
        "title-md": [
          "17px",
          {
            "lineHeight": "24px",
            "fontWeight": "600"
          }
        ],
        "body-md": [
          "15px",
          {
            "lineHeight": "22px",
            "fontWeight": "400"
          }
        ],
        "headline-lg": [
          "32px",
          {
            "lineHeight": "40px",
            "letterSpacing": "-0.015em",
            "fontWeight": "700"
          }
        ],
        "display-lg-mobile": [
          "34px",
          {
            "lineHeight": "42px",
            "letterSpacing": "-0.02em",
            "fontWeight": "800"
          }
        ],
        "headline-lg-mobile": [
          "26px",
          {
            "lineHeight": "34px",
            "letterSpacing": "-0.01em",
            "fontWeight": "700"
          }
        ],
        "body-lg": [
          "17px",
          {
            "lineHeight": "26px",
            "fontWeight": "400"
          }
        ],
        "label-md": [
          "12px",
          {
            "lineHeight": "16px",
            "letterSpacing": "0.02em",
            "fontWeight": "600"
          }
        ],
        "body-sm": [
          "13px",
          {
            "lineHeight": "18px",
            "fontWeight": "400"
          }
        ],
        "label-sm": [
          "11px",
          {
            "lineHeight": "14px",
            "letterSpacing": "0.03em",
            "fontWeight": "600"
          }
        ],
        "headline-sm": [
          "20px",
          {
            "lineHeight": "28px",
            "fontWeight": "600"
          }
        ],
        "headline-md": [
          "24px",
          {
            "lineHeight": "32px",
            "letterSpacing": "-0.01em",
            "fontWeight": "700"
          }
        ],
        "label-lg": [
          "14px",
          {
            "lineHeight": "20px",
            "letterSpacing": "0.01em",
            "fontWeight": "700"
          }
        ]
      }
    },
  },
  plugins: [],
};

export default config;
