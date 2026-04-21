import { supabaseForUser } from "@/lib/supabase-server";
import type { NotificationEvent, TrackedFlight } from "@/lib/types";

export async function getTrackedFlightForUser() {
  const supabase = await supabaseForUser();
  const { data, error } = await supabase
    .from("tracked_flights")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TrackedFlight | null) ?? null;
}

export async function getRecentNotificationEvents() {
  const supabase = await supabaseForUser();
  const { data, error } = await supabase
    .from("notification_events")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(6);
  if (error) throw new Error(error.message);
  return (data ?? []) as NotificationEvent[];
}
