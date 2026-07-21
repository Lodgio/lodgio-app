"use client";

import { useState } from "react";

export function CopyButton({ value, className = "" }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — user can copy manually.
    }
  }

  return (
    <button type="button" onClick={copy} className={className || "btn-secondary"}>
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
