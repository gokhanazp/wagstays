"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export function CopyCode({ code }: { code: string }) {
  const t = useTranslations("apply.copyCode");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard can be blocked (insecure context); still show the code is selectable.
    }
    setCopied(true);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={t("title")}
      aria-label={t("aria", { code })}
      className="flex items-center gap-space-xs bg-surface-container-lowest px-space-md py-2 rounded-xl shadow-xs text-left hover:bg-surface-container transition-colors"
    >
      <span className="material-symbols-outlined text-primary text-lg">{copied ? "check_circle" : "receipt_long"}</span>
      <span className="flex flex-col">
        <span className="font-label-sm text-label-sm text-on-surface-variant" aria-live="polite">
          {copied ? t("copied") : t("label")}
        </span>
        <span className="font-label-lg text-label-lg text-on-surface font-bold">#{code}</span>
      </span>
    </button>
  );
}
