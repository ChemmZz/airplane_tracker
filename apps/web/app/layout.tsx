import type { Metadata } from "next";
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Airplane Tracker",
  description: "Live aircraft positions from the OpenSky Network",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                ✈ Airplane Tracker
              </Link>
              <nav className="flex items-center gap-4 text-sm">
                <SignedIn>
                  <Link href="/dashboard" className="hover:text-sky-300">Dashboard</Link>
                  <Link href="/regions" className="hover:text-sky-300">Regions</Link>
                  <Link href="/flight" className="hover:text-sky-300">Lookup</Link>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="rounded-md bg-sky-500 px-3 py-1.5 font-medium text-white hover:bg-sky-400">
                      Sign in
                    </button>
                  </SignInButton>
                </SignedOut>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
