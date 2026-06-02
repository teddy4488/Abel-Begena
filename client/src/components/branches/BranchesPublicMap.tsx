"use client";

import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import L, { type LatLngExpression } from "leaflet";
import { useMemo } from "react";
import type { Branch } from "@/store/api/branchApi";
import "leaflet/dist/leaflet.css";

const branchIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

type Props = {
  branches: Branch[];
};

export default function BranchesPublicMap({ branches }: Props) {
  const center: LatLngExpression = useMemo(() => {
    if (!branches.length) {
      return [9.01, 38.79]; // Addis Ababa approx
    }
    const [lng, lat] = branches[0].location.coordinates;
    return [lat, lng];
  }, [branches]);

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {branches.map((branch) => {
        const [lng, lat] = branch.location.coordinates;
        const pos: LatLngExpression = [lat, lng];
        return (
          <Circle
            key={branch._id}
            center={pos}
            radius={branch.radiusMeters}
            pathOptions={{
              color: "#22c55e",
              fillColor: "#4ade80",
              fillOpacity: 0.18,
            }}
          >
            <Marker position={pos} icon={branchIcon} />
          </Circle>
        );
      })}
    </MapContainer>
  );
}


