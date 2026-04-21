"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

const planeIcon = (heading: number | null) =>
  L.divIcon({
    className: "",
    html: `<div style="transform: rotate(${heading ?? 0}deg); font-size: 22px; line-height: 22px; color: #f97316; text-shadow: -1px -1px 0 #020617, 1px -1px 0 #020617, -1px 1px 0 #020617, 1px 1px 0 #020617;" aria-hidden="true">✈</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

export function TrackedFlightMap({
  lat,
  lng,
  heading,
  label,
}: {
  lat: number | null;
  lng: number | null;
  heading: number | null;
  label: string;
}) {
  if (lat == null || lng == null) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-400">Live coordinates are not available yet.</div>;
  }

  return (
    <MapContainer center={[lat, lng]} zoom={5} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={planeIcon(heading)}>
        <Popup>{label}</Popup>
      </Marker>
    </MapContainer>
  );
}
