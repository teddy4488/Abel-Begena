"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useGetActiveAdQuery } from "@/store/api/advertisementApi";

const ALLOWED_PATHS = ["/", "/student"];
const IMAGE_DURATION_MS = 8000;

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AdPlayer() {
  const pathname = usePathname();
  const allowed = ALLOWED_PATHS.includes(pathname ?? "");

  const { data: ads = [] } = useGetActiveAdQuery(undefined, { skip: !allowed });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const total = ads.length;
  const currentAd = ads[currentIndex];

  useEffect(() => {
    if (total > 0 && currentIndex >= total) setCurrentIndex(0);
  }, [total, currentIndex]);

  // Reset video UI state on each carousel advance
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (currentAd?.mediaType === "video") setIsVideoLoading(true);
  }, [currentIndex, currentAd?.mediaType]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % total);
  }, [total]);

  const goPrev = () => setCurrentIndex((i) => (i - 1 + total) % total);

  useEffect(() => {
    if (!currentAd || currentAd.mediaType !== "image" || total <= 1) return;
    const timer = setTimeout(goNext, IMAGE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [currentIndex, currentAd, goNext, total]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) void videoRef.current.play();
    else videoRef.current.pause();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    videoRef.current.muted = next;
    setIsMuted(next);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const res = await fetch(currentAd.mediaUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = currentAd.mediaUrl.split("/").pop() ?? "advertisement.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(currentAd.mediaUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const t = Number(e.target.value);
    videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

  if (!currentAd || dismissed || !allowed) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      className="fixed bottom-6 right-6 z-9999 w-72 select-none overflow-hidden bg-black shadow-2xl ring-1 ring-white/10"
      style={{ touchAction: "none" }}
    >
      {/* Header — drag handle + title + counter + close */}
      <div className="flex cursor-grab items-center justify-between bg-black/80 px-3 py-2 active:cursor-grabbing">
        <p className="truncate text-xs font-medium text-white/80">
          {currentAd.title ?? "Advertisement"}
        </p>
        <div className="ml-2 flex shrink-0 items-center gap-2">
          {total > 1 && (
            <span className="text-[10px] text-white/40">
              {currentIndex + 1}/{total}
            </span>
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="flex h-6 w-6 items-center justify-center rounded-full text-white/60 hover:bg-white/20 hover:text-white"
            aria-label="Close advertisement"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Media */}
      {currentAd.mediaType === "video" ? (
        <div className="group relative">
          {/* Video clipped to max height — controls live outside this div */}
          <div className="relative max-h-[65vh] overflow-hidden">
            <video
              ref={videoRef}
              key={currentIndex}
              src={currentAd.mediaUrl}
              autoPlay
              muted={isMuted}
              playsInline
              loop={total === 1}
              onLoadStart={() => setIsVideoLoading(true)}
              onCanPlay={() => setIsVideoLoading(false)}
              onWaiting={() => setIsVideoLoading(true)}
              onPlaying={() => { setIsVideoLoading(false); setIsPlaying(true); }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
              onEnded={total > 1 ? goNext : undefined}
              className="w-full"
              onPointerDown={(e) => e.stopPropagation()}
            />
            {isVideoLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-8 w-8 animate-spin text-white/80" />
              </div>
            )}
          </div>

          {/* Custom control bar — hidden until hover, outside the clip */}
          <div
            className="space-y-1 bg-black/80 px-2 pb-2 pt-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Seek bar */}
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="h-1 w-full cursor-pointer accent-white"
            />

            {/* Buttons row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-7 w-7 items-center justify-center text-white hover:text-white/70"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying
                    ? <Pause className="h-4 w-4 fill-white" />
                    : <Play className="h-4 w-4 fill-white" />}
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex h-7 w-7 items-center justify-center text-white hover:text-white/70"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted
                    ? <VolumeX className="h-4 w-4" />
                    : <Volume2 className="h-4 w-4" />}
                </button>
                <span className="ml-1 text-[10px] tabular-nums text-white/50">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex h-7 w-7 items-center justify-center text-white hover:text-white/70 disabled:opacity-50"
                aria-label="Download video"
              >
                {isDownloading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentAd.mediaUrl}
          alt={currentAd.title ?? "Advertisement"}
          className="max-h-[65vh] w-full object-cover"
        />
      )}

      {/* Dot indicator + prev/next — only when multiple ads */}
      {total > 1 && (
        <div className="flex items-center justify-between bg-black/60 px-3 py-2">
          <button
            type="button"
            onClick={goPrev}
            className="flex h-6 w-6 items-center justify-center rounded-full text-white/60 hover:bg-white/20 hover:text-white"
            aria-label="Previous advertisement"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {ads.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/30"
                }`}
                aria-label={`Go to advertisement ${i + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={goNext}
            className="flex h-6 w-6 items-center justify-center rounded-full text-white/60 hover:bg-white/20 hover:text-white"
            aria-label="Next advertisement"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
