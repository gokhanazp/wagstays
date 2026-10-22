"use client";

import { useEffect } from "react";
import { clearAllDrafts } from "./draft";

/** Rendered on /become-a-sitter/submitted: the application went through, so the saved form draft is no longer needed. */
export function ClearApplicationDraft() {
  useEffect(() => clearAllDrafts(), []);
  return null;
}
