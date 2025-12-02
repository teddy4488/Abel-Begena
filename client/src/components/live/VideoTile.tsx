"use client";

type VideoTileProps = {
  stream: MediaStream | null;
  isLocal?: boolean;
  displayName?: string;
};

export function VideoTile({ stream, isLocal, displayName }: VideoTileProps) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black/80">
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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-xs text-white">
        <span className="truncate font-medium">
          {displayName ?? (isLocal ? "You" : "Participant")}
        </span>
        {isLocal && (
          <span className="rounded-full bg-emerald-500/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            Host
          </span>
        )}
      </div>
    </div>
  );
}


