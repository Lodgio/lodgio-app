"use client";

import { useState, type ReactNode } from "react";
import { airbnbGuideSteps } from "@/components/airbnb-paste-guide-data";

export function AirbnbPasteGuide({ children }: { children?: ReactNode }) {
  const [active, setActive] = useState(0);
  const current = airbnbGuideSteps[active];

  return (
    <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
      <ol className="order-1 space-y-2">
        {airbnbGuideSteps.map((step, index) => {
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
        {airbnbGuideSteps.map((step, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={step.src}
            src={step.src}
            alt={index === active ? step.alt : ""}
            className={`mx-auto max-h-[28rem] w-full object-contain object-top p-3 ${
              index === active ? "" : "hidden"
            }`}
          />
        ))}
        <figcaption className="border-t border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500">
          Step {active + 1}: {current.title}
        </figcaption>
      </figure>

      {children ? <div className="order-3">{children}</div> : null}
    </div>
  );
}
