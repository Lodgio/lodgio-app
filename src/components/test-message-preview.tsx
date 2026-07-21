"use client";

import { useState, useTransition } from "react";
import { TestMessageModal } from "@/components/test-message-modal";
import type { BookingMessagePreview } from "@/services/messaging/message-preview";

export function TestMessagePreview({
  initialMessages,
  loadMessages,
  autoOpen = false,
  buttonLabel = "Show test messages",
}: {
  initialMessages?: BookingMessagePreview[];
  loadMessages?: () => Promise<BookingMessagePreview[]>;
  autoOpen?: boolean;
  buttonLabel?: string;
}) {
  const [messages, setMessages] = useState(initialMessages ?? []);
  const [open, setOpen] = useState(autoOpen && Boolean(initialMessages?.length));
  const [isPending, startTransition] = useTransition();

  function showMessages() {
    if (messages.length) {
      setOpen(true);
      return;
    }
    if (!loadMessages) return;
    startTransition(async () => {
      const loaded = await loadMessages();
      setMessages(loaded);
      setOpen(true);
    });
  }

  return (
    <>
      <button type="button" className="btn-secondary" onClick={showMessages} disabled={isPending}>
        {isPending ? "Loading…" : buttonLabel}
      </button>
      <TestMessageModal messages={messages} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
