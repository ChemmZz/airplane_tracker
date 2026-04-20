import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl py-12 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Live aircraft, everywhere.
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        Pick the regions you care about. Watch flights update in real time.
        Powered by the OpenSky Network.
      </p>
      <div className="mt-10 flex items-center justify-center gap-4">
        <SignedIn>
          <Link
            href="/dashboard"
            className="rounded-md bg-sky-500 px-5 py-2.5 font-medium text-white hover:bg-sky-400"
          >
            Go to dashboard
          </Link>
          <Link
            href="/regions"
            className="rounded-md border border-slate-700 px-5 py-2.5 font-medium text-slate-200 hover:bg-slate-800"
          >
            Choose regions
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
        <Feature title="Realtime" body="Supabase Realtime pushes updates straight to your browser." />
        <Feature title="Personal" body="Save your favorite regions. Look up any callsign on demand." />
        <Feature title="Open data" body="OpenSky crowdsources positions from thousands of receivers." />
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
