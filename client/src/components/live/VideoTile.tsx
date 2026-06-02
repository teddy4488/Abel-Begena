"use client";

import { Hand, Wifi, WifiOff, Loader2 } from "lucide-react";

type PeerConnState = "connecting" | "connected" | "reconnecting" | "failed";

type VideoTileProps = {
  stream: MediaStream | null;
  isLocal?: boolean;
  displayName?: string;
  isHost?: boolean;
  isActiveSpeaker?: boolean;
  isHandRaised?: boolean;
  connState?: PeerConnState;
};

export function VideoTile({
  stream,
  isLocal,
  displayName,
  isHost,
  isActiveSpeaker,
  isHandRaised,
  connState,
}: VideoTileProps) {
  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-2xl bg-black/80 transition-shadow ${
        isActiveSpeaker ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-black" : ""
      }`}
    >
      <video
        className="h-full w-full object-cover"
        ref={(node) => {
          if (node && stream) {
            if (node.srcObject !== stream) {
              node.srcObject = stream;
            }
            void node.play().catch(() => undefined);
          }
        }}
        muted={isLocal}
        playsInline
      />

      {/* Connection status (remote peers only) */}
      {!isLocal && connState && connState !== "connected" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white">
          {connState === "failed" ? (
            <span className="flex items-center gap-1.5 text-rose-300">
              <WifiOff className="h-4 w-4" /> Connection lost
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-gray-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              {connState === "reconnecting" ? "Reconnecting…" : "Connecting…"}
            </span>
          )}
        </div>
      )}

      {isHandRaised && (
        <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-black shadow-lg">
          <Hand className="h-4 w-4" />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-xs text-white">
        <span className="flex items-center gap-1.5 truncate font-medium">
          {!isLocal && connState === "connected" && (
            <Wifi className="h-3 w-3 text-emerald-400" />
          )}
          {displayName ?? (isLocal ? "You" : "Participant")}
        </span>
        {isHost && (
          <span className="rounded-full bg-emerald-500/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            Host
          </span>
        )}
      </div>
    </div>
  );
}
