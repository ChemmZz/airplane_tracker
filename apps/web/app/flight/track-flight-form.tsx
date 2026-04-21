"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";

export function TrackFlightForm({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const { user } = useUser();
  const [value, setValue] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const flightCode = value.trim().toUpperCase();
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!flightCode || !email) return;

    setLoading(true);
    setError(null);
    const res = await fetch("/api/tracked-flight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flightCode, notificationEmail: email }),
    });

    if (!res.ok) {
      setLoading(false);
      setError(await res.text());
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. AM684 or AAL6"
          className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono uppercase tracking-wider outline-none focus:border-sky-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-sky-500 px-4 py-2 font-medium text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Saving…" : "Track"}
        </button>
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </form>
  );
}
