import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl py-14 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Know exactly when to leave for the airport.
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
        Track one flight, get live status and position updates, calculate the drive to the arrival airport, and receive email reminders when plans change.
      </p>
      <div className="mt-10 flex items-center justify-center gap-4">
        <SignedIn>
          <Link
            href="/flight"
            className="rounded-md bg-sky-500 px-5 py-2.5 font-medium text-white hover:bg-sky-400"
          >
            Track a flight
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-700 px-5 py-2.5 font-medium text-slate-200 hover:bg-slate-800"
          >
            Open dashboard
          </Link>
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <button className="rounded-md bg-sky-500 px-5 py-2.5 font-medium text-white hover:bg-sky-400">
              Get started
            </button>
          </SignInButton>
        </SignedOut>
      </div>
      <div className="mt-16 grid gap-4 text-left sm:grid-cols-3">
        <Feature title="Flight-aware" body="AirLabs updates the tracked flight’s delay, departure, arrival, and live position." />
        <Feature title="Pickup timing" body="Use your browser location to estimate the drive to the arrival airport and know when to leave." />
        <Feature title="In-app alerts" body="Major flight changes and leave-time reminders appear in the dashboard notification feed." />
      </div>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <h3 className="font-semibold text-sky-300">{title}</h3>
      <p className="mt-1 text-sm text-slate-300">{body}</p>
    </div>
  );
}
