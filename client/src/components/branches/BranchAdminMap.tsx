"use client";

import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Branch } from "@/store/api/branchApi";

type Props = {
  branches: Branch[];
  selectedBranchId: string | null;
  radiusMeters: number;
  onPositionChange: (lat: number, lng: number) => void;
};

export default function BranchAdminMap({
  branches,
  selectedBranchId,
  radiusMeters,
  onPositionChange,
}: Props) {
  const [center, setCenter] = useState<LatLngExpression>([9.01, 38.79]); // Addis Ababa approx
  const [zoom, setZoom] = useState(12);

  useEffect(() => {
    const active =
      branches.find((b) => b._id === selectedBranchId) ?? branches[0];
    if (active) {
      const [lng, lat] = active.location.coordinates;
      setCenter([lat, lng]);
      setZoom(13);
    }
  }, [branches, selectedBranchId]);

  const handleClick = (event: { latlng: { lat: number; lng: number } }) => {
    const { lat, lng } = event.latlng;
    setCenter([lat, lng]);
    onPositionChange(lat, lng);
  };

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
      doubleClickZoom={false}
      whenCreated={(map) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (map as any).on("click", handleClick);
      }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {branches.map((branch) => {
        const [lng, lat] = branch.location.coordinates;
        const pos: LatLngExpression = [lat, lng];
        const isSelected = branch._id === selectedBranchId;
        const circleRadius = isSelected ? radiusMeters : branch.radiusMeters;
        return (
          <Circle
            key={branch._id}
            center={pos}
            radius={circleRadius}
            pathOptions={{
              color: isSelected ? "#f59e0b" : "#22c55e",
              fillColor: isSelected ? "#fbbf24" : "#4ade80",
              fillOpacity: 0.2,
            }}
          >
            <Marker position={pos} />
          </Circle>
        );
      })}
    </MapContainer>
  );
}


