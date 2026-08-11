"use client";

import { useEffect } from "react";
import type { BookingMessagePreview } from "@/services/messaging/message-preview";

export function TestMessageModal({
  messages,
  open,
  onClose,
}: {
  messages: BookingMessagePreview[];
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Test WhatsApp messages"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
          <p className="text-xs font-bold uppercase tracking-wide">Test mode</p>
          <p className="mt-1 text-sm">This will be sent on WhatsApp in the future.</p>
        </div>

        <div className="mt-5 space-y-5">
          {messages.map((message) => (
            <section key={message.kind}>
              <div className="mb-2">
                <h2 className="font-semibold text-zinc-900">{message.title}</h2>
                <p className="text-xs text-zinc-500">To: {message.recipient}</p>
              </div>
              <pre className="whitespace-pre-wrap rounded-lg bg-zinc-100 p-4 font-sans text-sm leading-relaxed text-zinc-800">
                {message.body}
              </pre>
            </section>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
