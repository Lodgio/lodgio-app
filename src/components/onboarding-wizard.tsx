"use client";

import { useEffect, useState, type ReactNode } from "react";

export function OnboardingWizard({
  steps,
  initialStep,
  panels,
}: {
  steps: number[];
  initialStep: number;
  panels: Record<number, ReactNode>;
}) {
  const [step, setStep] = useState(initialStep);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  function select(next: number) {
    setStep(next);
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(next));
    url.searchParams.delete("saved");
    url.searchParams.delete("error");
    url.searchParams.delete("gmail");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        {steps.map((n) => {
          const selected = n === step;
          return (
            <button
              key={n}
              type="button"
              onClick={() => select(n)}
              className={`rounded-full px-3 py-1 ${
                selected
                  ? "bg-[var(--lodgio-ink)] text-white"
                  : "border border-zinc-300"
              }`}
            >
              Step {n}
            </button>
          );
        })}
      </div>
      {steps.map((n) => (
        <div key={n} hidden={n !== step}>
          {panels[n]}
        </div>
      ))}
    </div>
  );
}
