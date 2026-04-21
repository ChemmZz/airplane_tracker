import Link from "next/link";

export function LivePauseWarning({
  showResumeHint = true,
}: {
  showResumeHint?: boolean;
}) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
      <p className="font-medium text-amber-200">Live updates are paused.</p>
      <p className="mt-1">
        Lookup still works, but the freshest live tracking comes back after you resume updates for your live region.
        {showResumeHint ? " Resume them from your dashboard before doing a lookup if you want the newest flow of positions." : ""}
      </p>
      <Link href="/dashboard" className="mt-3 inline-block text-sm font-medium text-amber-200 underline decoration-amber-400/60 underline-offset-4 hover:text-white">
        Open dashboard to resume live updates
      </Link>
    </div>
  );
}
