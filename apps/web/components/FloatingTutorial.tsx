"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "airplane-tracker:tutorial-dismissed:v1";

export function FloatingTutorial({
  title,
  steps,
}: {
  title: string;
  steps: string[];
}) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  function close() {
    window.localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <aside className="fixed bottom-6 right-6 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-sky-400/30 bg-slate-950/95 p-4 shadow-2xl shadow-slate-950/60 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-300">Quick guide</p>
          <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
        </div>
        <button
          type="button"
          onClick={close}
          className="rounded-md px-2 py-1 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
          aria-label="Dismiss tutorial"
        >
          ×
        </button>
      </div>
      <ol className="mt-3 space-y-2 text-sm text-slate-300">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-semibold text-sky-200">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
