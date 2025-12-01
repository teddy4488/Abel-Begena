"use client";

import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { useMemo } from "react";
import "leaflet/dist/leaflet.css";
import type { Branch } from "@/store/api/branchApi";
import L from "leaflet";

type Props = {
  branches: Branch[];
  selectedBranchId: string | null;
  radiusMeters: number;
  onPositionChange: (lat: number, lng: number) => void;
};

function MapUpdater({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();

  useMemo(() => {
    if (center && zoom) {
      map.setView(center, zoom, { animate: true, duration: 0.5 });
    }
  }, [center, zoom, map]);

  return null;
}

export default function BranchAdminMap({
  branches,
  selectedBranchId,
  radiusMeters,
  onPositionChange,
}: Props) {
  // Calculate center and zoom based on props directly
  const { center, zoom } = useMemo(() => {
    const active = branches.find((b) => b._id === selectedBranchId) ?? branches[0];
    
    if (active) {
      const [lng, lat] = active.location.coordinates;
      return {
        center: [lat, lng] as LatLngExpression,
        zoom: 13
      };
    }
    
    // Default values
    return {
      center: [9.01, 38.79] as LatLngExpression, // Addis Ababa approx
      zoom: 12
    };
  }, [branches, selectedBranchId]);

  const handleClick = (event: L.LeafletMouseEvent) => {
    const { lat, lng } = event.latlng;
    onPositionChange(lat, lng);
  };

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
      doubleClickZoom={false}
      whenReady={(map) => {
        map.target.on("click", handleClick);
      }}
    >
      <MapUpdater center={center} zoom={zoom} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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