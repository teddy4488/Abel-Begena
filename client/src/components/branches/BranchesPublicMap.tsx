"use client";

import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from "react-leaflet";
import L, { type LatLngExpression, type LatLngBoundsExpression } from "leaflet";
import { useEffect, useMemo } from "react";
import type { Branch } from "@/store/api/branchApi";
import "leaflet/dist/leaflet.css";

const branchIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#eab308;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

type Props = {
  branches: Branch[];
};

/** Auto-fits the map to all branch positions so every marker is on-screen,
 *  no matter how far apart they are. Single branch falls back to centered zoom 14. */
function FitToBranches({ branches }: { branches: Branch[] }) {
  const map = useMap();
  useEffect(() => {
    if (!branches.length) return;
    if (branches.length === 1) {
      const [lng, lat] = branches[0].location.coordinates;
      map.setView([lat, lng], 14);
      return;
    }
    const bounds: LatLngBoundsExpression = branches.map((b) => {
      const [lng, lat] = b.location.coordinates;
      return [lat, lng] as [number, number];
    });
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [branches, map]);
  return null;
}

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
      <FitToBranches branches={branches} />
      {branches.map((branch) => {
        const [lng, lat] = branch.location.coordinates;
        const pos: LatLngExpression = [lat, lng];
        return (
          <Circle
            key={branch._id}
            center={pos}
            radius={branch.radiusMeters}
            pathOptions={{
              color: "#eab308",
              fillColor: "#facc15",
              fillOpacity: 0.18,
            }}
          >
            <Marker position={pos} icon={branchIcon}>
              <Popup>
                <strong>{branch.name}</strong>
                {branch.address && (
                  <>
                    <br />
                    <span style={{ color: "#555" }}>{branch.address}</span>
                  </>
                )}
              </Popup>
            </Marker>
          </Circle>
        );
      })}
    </MapContainer>
  );
}


