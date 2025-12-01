"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapContainer, TileLayer, Circle, Marker, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Branch } from "@/store/api/branchApi";
import { MapPin, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  branches: Branch[] | undefined;
};

type Center = { lat: number; lng: number };

function MapEffect({ center }: { center: Center | null }) {
  const map = useMap();

  useEffect(() => {
    if (!center || center.lat === undefined || center.lng === undefined) {
      return;
    }
    map.flyTo([center.lat, center.lng], 14, {
      animate: true,
      duration: 5,
    });
  }, [center, map]);

  return null;
}

export function BranchesMapModal({ open, onClose, branches }: Props) {
  const safeBranches = branches ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeBranch = useMemo(
    () =>
      safeBranches.find((b) => b._id === activeId) ??
      (safeBranches.length ? safeBranches[0] : undefined),
    [safeBranches, activeId],
  );

  const mapCenter: Center | null = useMemo(() => {
    if (!activeBranch) return null;
    const [lng, lat] = activeBranch.location.coordinates;
    return { lat, lng };
  }, [activeBranch]);

  useEffect(() => {
    if (!open || !safeBranches.length) {
      return;
    }
    setActiveId((prev) => prev ?? safeBranches[0]._id);
  }, [open, safeBranches]);

  if (!open) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative flex w-full max-w-4xl flex-col gap-4 rounded-3xl border border-border bg-surface p-4 shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                Branches
              </p>
              <h2 className="text-lg font-serif text-primary md:text-xl">
                Abel Begena Locations in Addis Ababa
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground/80 hover:border-secondary hover:text-secondary"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto rounded-2xl border border-border bg-background/80 px-3 py-2 text-xs">
            {safeBranches.map((branch) => (
              <button
                key={branch._id}
                type="button"
                onClick={() => setActiveId(branch._id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 transition ${
                  branch._id === activeBranch?._id
                    ? "bg-secondary text-primary-foreground shadow-[0_0_16px_var(--color-secondary-glow)]"
                    : "bg-background text-foreground/80 hover:bg-(--color-secondary-soft)"
                }`}
              >
                <MapPin className="h-3 w-3" />
                <span className="font-semibold">{branch.name}</span>
              </button>
            ))}
            {!safeBranches.length && (
              <span className="text-foreground/60">
                No branches configured yet.
              </span>
            )}
          </div>

          <div className="relative h-[320px] overflow-hidden rounded-2xl border border-border bg-background/80">
            {safeBranches.length === 0 || !mapCenter ? (
              <div className="flex h-full items-center justify-center text-sm text-foreground/60">
                Branches will appear here once locations are configured.
              </div>
            ) : (
              <MapContainer
                center={[mapCenter.lat, mapCenter.lng] as LatLngExpression}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {safeBranches.map((branch) => {
                  const [lng, lat] = branch.location.coordinates;
                  const pos: LatLngExpression = [lat, lng];
                  const isActive = branch._id === activeBranch?._id;
                  const radius = branch.radiusMeters ?? 600;
                  return (
                    <Circle
                      key={branch._id}
                      center={pos}
                      radius={radius}
                      pathOptions={{
                        color: isActive ? "#f59e0b" : "#22c55e",
                        fillColor: isActive ? "#fbbf24" : "#4ade80",
                        fillOpacity: isActive ? 0.25 : 0.16,
                      }}
                    >
                      <Marker position={pos} />
                    </Circle>
                  );
                })}
                <MapEffect center={mapCenter} />
              </MapContainer>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


