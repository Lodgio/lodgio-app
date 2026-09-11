"use client";

import { useState, type ReactNode } from "react";

const steps = [
  {
    title: "Open Messages, then settings",
    detail: "In Airbnb, go to Messages and click the gear next to search.",
    src: "/welcome/airbnb/01-messages.png",
    alt: "Airbnb Messages with the settings gear highlighted",
  },
  {
    title: "Open Manage quick replies",
    detail: "That’s where Airbnb keeps automatic guest templates.",
    src: "/welcome/airbnb/02-manage-quick-replies.png",
    alt: "Airbnb Messaging settings with Manage quick replies highlighted",
  },
  {
    title: "Open Booking confirmation",
    detail: "Use this template, or create one if you don’t have it yet.",
    src: "/welcome/airbnb/03-booking-confirmation.png",
    alt: "Airbnb quick replies list with Booking confirmation highlighted",
  },
  {
    title: "Paste your Lodgio check-in link",
    detail: "Put the link from above in the message. Keep the Guest first name shortcode.",
    src: "/welcome/airbnb/04-paste-link.png",
    alt: "Airbnb template editor with the Lodgio check-in link highlighted",
  },
  {
    title: "Schedule 5 minutes after a guest books",
    detail: "Edit Scheduled for, choose that option, then Apply and Save. Don’t leave it unscheduled.",
    src: "/welcome/airbnb/05-schedule.png",
    alt: "Airbnb schedule dialog with 5 minutes after a guest books selected",
  },
] as const;

export function AirbnbPasteGuide({ children }: { children?: ReactNode }) {
  const [active, setActive] = useState(0);
  const current = steps[active];

  return (
    <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
      <ol className="order-1 space-y-2">
        {steps.map((step, index) => {
          const selected = index === active;
          return (
            <li key={step.src}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => setActive(index)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                  selected
                    ? "border-[var(--lodgio-gold)] bg-[var(--lodgio-cream)]"
                    : "border-transparent hover:border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <span className="flex gap-3">
                  <span
                    className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      selected
                        ? "bg-[var(--lodgio-ink)] text-white"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-[var(--lodgio-olive)]">
                      {step.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                      {step.detail}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <figure className="order-2 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 lg:sticky lg:top-6 lg:row-span-2 lg:min-h-[20rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.src}
          alt={current.alt}
          className="mx-auto max-h-[28rem] w-full object-contain object-top p-3"
        />
        <figcaption className="border-t border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500">
          Step {active + 1}: {current.title}
        </figcaption>
      </figure>

      {children ? <div className="order-3">{children}</div> : null}
    </div>
  );
}
