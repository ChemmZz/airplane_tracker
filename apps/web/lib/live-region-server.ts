import { supabaseForUser } from "@/lib/supabase-server";
import type { Region } from "@/lib/types";

export type UserLiveRegionStatus = {
  region_id: string;
  is_paused: boolean;
  regions: Pick<Region, "id" | "name" | "slug">;
};

export async function getUserLiveRegionStatus() {
  const supabase = await supabaseForUser();
  const { data, error } = await supabase
    .from("user_live_regions")
    .select("region_id, is_paused, regions(id, name, slug)")
    .returns<UserLiveRegionStatus>()
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as UserLiveRegionStatus | null) ?? null;
}
