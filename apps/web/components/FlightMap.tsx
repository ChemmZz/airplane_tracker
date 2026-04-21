"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useMemo } from "react";
import type { Flight, Region } from "@/lib/types";

const planeIcon = (heading: number) =>
  L.divIcon({
    className: "",
    html: `<div style="transform: rotate(${heading}deg); font-size: 22px; line-height: 22px; color: #f97316; text-shadow: -1px -1px 0 #020617, 1px -1px 0 #020617, -1px 1px 0 #020617, 1px 1px 0 #020617;" aria-hidden="true">✈</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

export default function FlightMap({
  region,
  flights,
  singleIcao,
}: {
  region?: Region;
  flights: Flight[];
  singleIcao?: string;
}) {
  const center = useMemo<[number, number]>(() => {
    if (region) {
      return [(region.lamin + region.lamax) / 2, (region.lomin + region.lomax) / 2];
    }
    const first = flights[0];
    if (first && first.latitude != null && first.longitude != null) {
      return [first.latitude, first.longitude];
    }
    return [30, 0];
  }, [region, flights]);

  const zoom = region ? 4 : 5;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {flights
        .filter((f) => f.latitude != null && f.longitude != null)
        .filter((f) => !singleIcao || f.icao24 === singleIcao)
        .map((f) => (
          <Marker
            key={f.icao24}
            position={[f.latitude!, f.longitude!]}
            icon={planeIcon(f.true_track ?? 0)}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-mono font-semibold">{f.callsign ?? f.icao24}</div>
                <div>{f.origin_country}</div>
                <div>
                  {f.baro_altitude != null ? `${Math.round(f.baro_altitude)} m` : "?"} ·{" "}
                  {f.velocity != null ? `${Math.round(f.velocity * 1.944)} kt` : "?"}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
