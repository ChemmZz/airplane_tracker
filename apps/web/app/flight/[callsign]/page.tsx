import { redirect } from "next/navigation";

export default async function LegacyFlightPage({
  params,
}: {
  params: Promise<{ callsign: string }>;
}) {
  const { callsign } = await params;
  redirect(`/flight?code=${encodeURIComponent(decodeURIComponent(callsign).toUpperCase())}`);
}
