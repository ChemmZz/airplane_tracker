import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { supabaseForUser } from "@/lib/supabase-server";
import { RegionCard } from "@/components/RegionCard";
import type { Region } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = await supabaseForUser();
  const { data: favorites } = await supabase
    .from("user_favorites")
    .select("region_id, regions(*)")
    .returns<Array<{ region_id: string; regions: Region }>>();

  const regions = (favorites ?? []).map((f) => f.regions).filter(Boolean) as Region[];

  if (regions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 p-10 text-center">
        <h2 className="text-xl font-semibold">No favorites yet</h2>
        <p className="mt-2 text-slate-400">Pick a few regions to start watching.</p>
        <Link
          href="/regions"
          className="mt-6 inline-block rounded-md bg-sky-500 px-4 py-2 font-medium text-white hover:bg-sky-400"
        >
          Choose regions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your regions</h1>
        <Link href="/regions" className="text-sm text-sky-300 hover:underline">
          Edit favorites
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {regions.map((r) => (
          <RegionCard key={r.id} region={r} />
        ))}
      </div>
    </div>
  );
}
