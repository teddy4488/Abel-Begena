"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, Settings2, AlertTriangle } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

export type DeviceSelection = { cameraId?: string; micId?: string };

type PreJoinLobbyProps = {
  classTitle: string;
  displayName: string;
  onJoin: (selection: DeviceSelection) => void;
  onCancel?: () => void;
};

type PermissionState = "idle" | "granted" | "denied" | "unavailable";

export function PreJoinLobby({
  classTitle,
  displayName,
  onJoin,
  onCancel,
}: PreJoinLobbyProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [permission, setPermission] = useState<PermissionState>("idle");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState<string>("");
  const [micId, setMicId] = useState<string>("");
  const [camOff, setCamOff] = useState(false);
  const [micOff, setMicOff] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startPreview = useCallback(
    async (camera?: string, mic?: string) => {
      stopStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: camera ? { deviceId: { exact: camera } } : true,
          audio: mic ? { deviceId: { exact: mic } } : true,
        });
        streamRef.current = stream;
        setPermission("granted");
        stream.getVideoTracks().forEach((track) => (track.enabled = !camOff));
        stream.getAudioTracks().forEach((track) => (track.enabled = !micOff));
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
        // Labels only populate after permission is granted.
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter((d) => d.kind === "videoinput");
        const microphones = devices.filter((d) => d.kind === "audioinput");
        setCameras(cams);
        setMics(microphones);
        if (!camera && cams[0]) setCameraId(cams[0].deviceId);
        if (!mic && microphones[0]) setMicId(microphones[0].deviceId);
      } catch (err) {
        console.error("[PreJoinLobby] media error", err);
        const name = (err as DOMException)?.name;
        setPermission(name === "NotAllowedError" ? "denied" : "unavailable");
      }
    },
    [stopStream, camOff, micOff],
  );

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setPermission("unavailable");
      return;
    }
    void startPreview();
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCameraChange = (id: string) => {
    setCameraId(id);
    void startPreview(id, micId);
  };
  const handleMicChange = (id: string) => {
    setMicId(id);
    void startPreview(cameraId, id);
  };

  const toggleCam = () => {
    setCamOff((prev) => {
      const next = !prev;
      streamRef.current?.getVideoTracks().forEach((track) => (track.enabled = !next));
      return next;
    });
  };
  const toggleMic = () => {
    setMicOff((prev) => {
      const next = !prev;
      streamRef.current?.getAudioTracks().forEach((track) => (track.enabled = !next));
      return next;
    });
  };

  const handleJoin = () => {
    stopStream();
    onJoin({ cameraId: cameraId || undefined, micId: micId || undefined });
  };

  const blocked = permission === "denied" || permission === "unavailable";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-surface/95 shadow-2xl">
        <div className="border-b border-border/70 px-6 py-5">
          <p className="text-[11px] uppercase tracking-[0.3em] text-secondary">
            {t("live.lobby.kicker", "Ready to join?")}
          </p>
          <h1 className="mt-1 text-xl font-serif text-primary md:text-2xl">{classTitle}</h1>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          {/* Preview */}
          <div>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black/80">
              {permission === "granted" && !camOff ? (
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-300">
                  {blocked ? (
                    <>
                      <AlertTriangle className="h-8 w-8 text-amber-400" />
                      <p className="px-4 text-center text-xs">
                        {permission === "denied"
                          ? t(
                              "live.lobby.denied",
                              "Camera & microphone access was blocked. Enable it in your browser settings to join with video.",
                            )
                          : t(
                              "live.lobby.unavailable",
                              "No camera or microphone detected on this device.",
                            )}
                      </p>
                    </>
                  ) : (
                    <>
                      <VideoOff className="h-8 w-8" />
                      <p className="text-xs">{t("live.lobby.cameraOff", "Camera is off")}</p>
                    </>
                  )}
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-xs text-white">
                <span className="truncate font-medium">{displayName}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={toggleMic}
                disabled={blocked}
                className={`flex h-10 w-10 items-center justify-center rounded-full border border-border transition disabled:opacity-40 ${micOff ? "border-rose-400 bg-rose-500/10 text-rose-400" : "bg-background hover:bg-secondary/10"}`}
                aria-label={micOff ? "Unmute microphone" : "Mute microphone"}
              >
                {micOff ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={toggleCam}
                disabled={blocked}
                className={`flex h-10 w-10 items-center justify-center rounded-full border border-border transition disabled:opacity-40 ${camOff ? "border-amber-400 bg-amber-500/10 text-amber-400" : "bg-background hover:bg-secondary/10"}`}
                aria-label={camOff ? "Turn camera on" : "Turn camera off"}
              >
                {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Settings */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Settings2 className="h-4 w-4 text-secondary" />
              {t("live.lobby.deviceSettings", "Device settings")}
            </div>

            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-secondary/80">
                {t("live.lobby.camera", "Camera")}
              </span>
              <select
                value={cameraId}
                onChange={(e) => handleCameraChange(e.target.value)}
                disabled={blocked || cameras.length === 0}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-secondary/30 disabled:opacity-40"
              >
                {cameras.length === 0 ? (
                  <option value="">{t("live.lobby.noCamera", "No camera found")}</option>
                ) : (
                  cameras.map((cam, i) => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label || `Camera ${i + 1}`}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-secondary/80">
                {t("live.lobby.microphone", "Microphone")}
              </span>
              <select
                value={micId}
                onChange={(e) => handleMicChange(e.target.value)}
                disabled={blocked || mics.length === 0}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-secondary/30 disabled:opacity-40"
              >
                {mics.length === 0 ? (
                  <option value="">{t("live.lobby.noMic", "No microphone found")}</option>
                ) : (
                  mics.map((mic, i) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Microphone ${i + 1}`}
                    </option>
                  ))
                )}
              </select>
            </label>

            <div className="mt-auto flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleJoin}
                className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:brightness-95"
              >
                {blocked
                  ? t("live.lobby.joinWithoutMedia", "Join without camera/mic")
                  : t("live.lobby.join", "Join now")}
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={() => {
                    stopStream();
                    onCancel();
                  }}
                  className="w-full rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground/70 transition hover:bg-background"
                >
                  {t("button.cancel", "Cancel")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
