export async function getDrivingRoute(params: {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
}) {
  const key = process.env.OPENROUTESERVICE_API_KEY;
  if (!key) throw new Error("Missing OPENROUTESERVICE_API_KEY");

  const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
    method: "POST",
    headers: {
      Authorization: key,
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
    },
    body: JSON.stringify({
      coordinates: [
        [params.originLng, params.originLat],
        [params.destinationLng, params.destinationLat],
      ],
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`OpenRouteService failed: ${res.status}`);
  const json = (await res.json()) as {
    features?: Array<{
      properties?: {
        summary?: {
          distance?: number;
          duration?: number;
        };
      };
    }>;
  };
  const feature = json.features?.[0];
  const summary = feature?.properties?.summary;
  if (!summary?.duration || !summary.distance) {
    throw new Error("OpenRouteService returned no route summary");
  }

  return {
    distanceMeters: Math.round(summary.distance),
    durationMinutes: Math.ceil(summary.duration / 60),
  };
}
