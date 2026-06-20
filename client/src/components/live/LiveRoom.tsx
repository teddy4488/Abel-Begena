"use client";

import { useMemo, useRef, useState } from "react";
import {
  MessageCircle,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  ExternalLink,
  MonitorUp,
  Hand,
  Circle,
  Square,
  Download,
  Save,
  Users,
  VolumeX,
  UserX,
  Wifi,
} from "lucide-react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { VideoTile } from "./VideoTile";
import { useI18n } from "@/components/providers/I18nProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useUploadInstrumentMaterialMutation } from "@/store/api/materialsApi";

type LiveRoomProps = {
  classId: string;
  userId: string;
  displayName: string;
  role: "Teacher" | "Student" | "Admin";
  externalLink?: string | null;
  onLeave?: () => void;
  onEndForAll?: () => void;
  isTeacherSession?: boolean;
  cameraId?: string;
  micId?: string;
};

export function LiveRoom({
  classId,
  userId,
  displayName,
  role,
  externalLink,
  onLeave,
  onEndForAll,
  isTeacherSession,
  cameraId,
  micId,
}: LiveRoomProps) {
  const normalizedRole =
    role === "Teacher" ? "teacher" : role === "Admin" ? "admin" : "student";
  const { t } = useI18n();
  const { pushToast } = useToast();
  const [chatInput, setChatInput] = useState("");
  const [activePanel, setActivePanel] = useState<"chat" | "people">("chat");
  const [uploadMaterial, { isLoading: isSaving }] =
    useUploadInstrumentMaterialMutation();
  const savedBlobRef = useRef<Blob | null>(null);

  const {
    localStream,
    remoteStreams,
    messages,
    sendMessage,
    participants,
    isMicMuted,
    isCameraOff,
    toggleMic,
    toggleCamera,
    leaveSession,
    notifySessionEnd,
    sessionEndedBy,
    isHost,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    raisedHands,
    raiseHand,
    isHandRaised,
    hostMute,
    hostMuteAll,
    hostRemove,
    removedBy,
    peerStatus,
    activeSpeakerId,
    isRecording,
    startRecording,
    stopRecording,
    recordingBlob,
    clearRecording,
    connectionState,
  } = useWebRTC({
    classId,
    displayName,
    userId,
    role: normalizedRole,
    cameraId,
    micId,
  });

  const handleSend = async () => {
    if (!chatInput.trim()) return;
    await sendMessage(chatInput);
    setChatInput("");
  };

  const layoutCols = useMemo(() => {
    const count = remoteStreams.length + 1;
    if (count <= 2) return "md:grid-cols-2";
    if (count <= 4) return "md:grid-cols-2 lg:grid-cols-2";
    if (count <= 6) return "md:grid-cols-3 lg:grid-cols-3";
    return "md:grid-cols-3 lg:grid-cols-4";
  }, [remoteStreams.length]);

  const handleLeave = () => {
    leaveSession();
    onLeave?.();
  };

  const handleEndForAll = () => {
    notifySessionEnd();
    leaveSession();
    onEndForAll?.();
  };

  const handleDownloadRecording = () => {
    if (!recordingBlob || typeof window === "undefined") return;
    const url = URL.createObjectURL(recordingBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `live-${classId}-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSaveRecording = async () => {
    if (!recordingBlob) return;
    if (savedBlobRef.current === recordingBlob) {
      pushToast({
        title: t("live.recording.alreadySaved", "This recording was already saved."),
        variant: "default",
      });
      return;
    }
    try {
      const file = new File(
        [recordingBlob],
        `live-${classId}-${Date.now()}.webm`,
        { type: "video/webm" },
      );
      await uploadMaterial({
        file,
        title: `Live recording — ${new Date().toLocaleString()}`,
        classId,
        description: "Recorded live class session",
      }).unwrap();
      savedBlobRef.current = recordingBlob;
      pushToast({
        title: t("live.recording.saved", "Recording saved to class materials."),
        variant: "success",
      });
    } catch {
      pushToast({
        title: t("live.recording.saveError", "Could not save recording"),
        description: t(
          "live.recording.saveErrorDesc",
          "You can still download it and upload manually.",
        ),
        variant: "error",
      });
    }
  };

  const raisedHandIds = useMemo(
    () => new Set(raisedHands.map((h) => h.socketId)),
    [raisedHands],
  );

  return (
    <div className="flex h-full flex-col gap-4 md:flex-row">
      <div className="flex-1 space-y-3 rounded-3xl border border-border bg-black/80 p-3 md:p-4">
        {/* Removed / forced-mute / reconnection banners */}
        {removedBy && (
          <div className="rounded-2xl bg-rose-600/90 px-4 py-2 text-sm font-medium text-white">
            {t("live.banner.removed", "You were removed from the session by")} {removedBy}.
          </div>
        )}
        {connectionState === "reconnecting" && (
          <div className="rounded-2xl bg-amber-500/90 px-4 py-2 text-sm font-medium text-white">
            {t("live.banner.reconnecting", "Reconnecting to the classroom…")}
          </div>
        )}

        <div className={`grid gap-3 md:gap-4 ${layoutCols}`}>
          <VideoTile
            stream={localStream}
            isLocal
            displayName={displayName}
            isHost={isHost}
            isActiveSpeaker={activeSpeakerId === "local"}
            isHandRaised={isHandRaised}
          />
          {remoteStreams.map((remote) => (
            <VideoTile
              key={remote.socketId}
              stream={remote.stream}
              displayName={remote.displayName}
              isActiveSpeaker={activeSpeakerId === remote.socketId}
              isHandRaised={raisedHandIds.has(remote.socketId)}
              connState={peerStatus[remote.socketId]}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black/70 px-3 py-2 text-xs text-gray-100 md:px-4 md:py-3">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 md:text-xs">
              <Wifi className="h-3 w-3" />
              {t("live.status.live", "Live")}
            </span>
            <span className="text-[11px] text-gray-300 md:text-xs">
              {t("live.status.participants", "Participants")}: {participants.length}
            </span>
            {isRecording && (
              <span className="flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-300 md:text-xs">
                <Circle className="h-2.5 w-2.5 animate-pulse fill-rose-400 text-rose-400" />
                {t("live.status.recording", "Recording")}
              </span>
            )}
            {sessionEndedBy && (
              <span className="text-[11px] text-rose-300 md:text-xs">
                {t("live.status.endedBy", "Session ended by")} {sessionEndedBy}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={toggleMic}
              className={`flex h-9 w-9 items-center justify-center rounded-full border border-border bg-black/60 text-xs text-gray-100 transition hover:bg-black md:h-10 md:w-10 ${isMicMuted ? "border-rose-400 text-rose-300" : ""}`}
              aria-label={isMicMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {isMicMuted ? (
                <MicOff className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <Mic className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleCamera}
              className={`flex h-9 w-9 items-center justify-center rounded-full border border-border bg-black/60 text-xs text-gray-100 transition hover:bg-black md:h-10 md:w-10 ${isCameraOff ? "border-amber-400 text-amber-300" : ""}`}
              aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
            >
              {isCameraOff ? (
                <VideoOff className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <Video className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </button>

            {/* Raise hand (students) */}
            {!isHost && (
              <button
                type="button"
                onClick={() => raiseHand(!isHandRaised)}
                className={`flex h-9 w-9 items-center justify-center rounded-full border border-border bg-black/60 text-xs text-gray-100 transition hover:bg-black md:h-10 md:w-10 ${isHandRaised ? "border-amber-400 bg-amber-400/20 text-amber-300" : ""}`}
                aria-label={isHandRaised ? "Lower hand" : "Raise hand"}
                title={isHandRaised ? t("live.controls.lowerHand", "Lower hand") : t("live.controls.raiseHand", "Raise hand")}
              >
                <Hand className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            )}

            {/* Screen share (host) */}
            {isHost && (
              <button
                type="button"
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                className={`flex h-9 w-9 items-center justify-center rounded-full border border-border bg-black/60 text-xs text-gray-100 transition hover:bg-black md:h-10 md:w-10 ${isScreenSharing ? "border-sky-400 bg-sky-400/20 text-sky-300" : ""}`}
                aria-label={isScreenSharing ? "Stop sharing" : "Share screen"}
                title={isScreenSharing ? t("live.controls.stopShare", "Stop sharing") : t("live.controls.shareScreen", "Share screen")}
              >
                <MonitorUp className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            )}

            {/* Recording (host) */}
            {isHost && (
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex h-9 w-9 items-center justify-center rounded-full border border-border bg-black/60 text-xs text-gray-100 transition hover:bg-black md:h-10 md:w-10 ${isRecording ? "border-rose-400 bg-rose-400/20 text-rose-300" : ""}`}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
                title={isRecording ? t("live.controls.stopRecording", "Stop recording") : t("live.controls.startRecording", "Start recording")}
              >
                {isRecording ? (
                  <Square className="h-4 w-4 md:h-5 md:w-5" />
                ) : (
                  <Circle className="h-4 w-4 md:h-5 md:w-5" />
                )}
              </button>
            )}

            {/* Mute all (host) */}
            {isHost && (
              <button
                type="button"
                onClick={hostMuteAll}
                className="flex h-9 items-center justify-center rounded-full border border-border bg-black/60 px-3 text-xs font-semibold text-gray-100 transition hover:bg-black md:h-10 md:text-sm"
                title={t("live.controls.muteAll", "Mute everyone")}
              >
                <VolumeX className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
                {t("live.controls.muteAll", "Mute all")}
              </button>
            )}

            {isTeacherSession && (
              <button
                type="button"
                onClick={handleEndForAll}
                className="flex h-9 items-center justify-center rounded-full bg-rose-600 px-3 text-xs font-semibold text-white shadow-lg shadow-rose-500/40 transition hover:bg-rose-500 md:h-10 md:px-4 md:text-sm"
              >
                <PhoneOff className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
                {t("live.controls.endForAll", "End for everyone")}
              </button>
            )}

            <button
              type="button"
              onClick={handleLeave}
              className="flex h-9 items-center justify-center rounded-full border border-border bg-black/60 px-3 text-xs font-semibold text-gray-100 transition hover:bg-black md:h-10 md:px-4 md:text-sm"
            >
              {t("live.controls.leave", "Leave")}
            </button>
          </div>
        </div>

        {/* Recording actions (host, after a recording exists) */}
        {isHost && recordingBlob && !isRecording && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-black/70 px-3 py-2 text-xs text-gray-100 md:px-4">
            <span className="text-gray-300">
              {t("live.recording.ready", "Recording ready.")}
            </span>
            <button
              type="button"
              onClick={handleDownloadRecording}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-semibold transition hover:bg-black"
            >
              <Download className="h-3.5 w-3.5" />
              {t("live.recording.download", "Download")}
            </button>
            <button
              type="button"
              onClick={handleSaveRecording}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-semibold text-primary transition hover:bg-secondary/90 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving
                ? t("live.recording.saving", "Saving…")
                : t("live.recording.saveToMaterials", "Save to materials")}
            </button>
            <button
              type="button"
              onClick={clearRecording}
              className="inline-flex items-center rounded-full px-2 py-1.5 text-gray-400 transition hover:text-gray-200"
            >
              {t("live.recording.discard", "Discard")}
            </button>
          </div>
        )}
      </div>

      {externalLink ? (
        <div className="hidden w-full max-w-xs flex-col rounded-3xl border border-border bg-surface/95 p-3 text-sm shadow-xl backdrop-blur md:flex md:h-full md:p-4 lg:max-w-sm">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/70 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/10 text-secondary md:h-8 md:w-8">
                <ExternalLink className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary md:text-[11px]">
                  {t("live.external.kicker", "External meeting")}
                </p>
                <p className="text-[11px] text-foreground/70 md:text-xs">
                  {t(
                    "live.external.subtitle",
                    "Join via Zoom, Google Meet, or another platform.",
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-foreground/70 md:text-sm break-all">
              {externalLink}
            </p>
            <button
              type="button"
              onClick={() => {
                if (typeof window === "undefined") return;
                window.open(externalLink, "_blank", "noopener,noreferrer");
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-primary shadow-sm shadow-secondary/40 transition hover:bg-secondary/90 md:text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              {t("live.external.join", "Open external meeting")}
            </button>
            {isTeacherSession && (
              <p className="text-[11px] text-foreground/60 md:text-xs">
                {t(
                  "live.external.teacherHint",
                  "Share this link with students who prefer joining via the external platform.",
                )}
              </p>
            )}
          </div>
        </div>
      ) : null}

      <aside className="flex w-full max-w-xs flex-col rounded-3xl border border-border bg-surface/95 p-3 text-sm shadow-xl backdrop-blur md:h-full md:p-4 lg:max-w-sm">
        {/* Panel tabs */}
        <div className="mb-2 flex items-center gap-1 rounded-full border border-border/70 bg-background/60 p-1 md:mb-3">
          <button
            type="button"
            onClick={() => setActivePanel("chat")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${activePanel === "chat" ? "bg-secondary text-primary shadow-sm" : "text-foreground/60 hover:text-foreground"}`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {t("live.chat.tab", "Chat")}
          </button>
          <button
            type="button"
            onClick={() => setActivePanel("people")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${activePanel === "people" ? "bg-secondary text-primary shadow-sm" : "text-foreground/60 hover:text-foreground"}`}
          >
            <Users className="h-3.5 w-3.5" />
            {t("live.people.tab", "People")}
            {raisedHands.length > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-black">
                {raisedHands.length}
              </span>
            )}
          </button>
        </div>

        {activePanel === "chat" ? (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl bg-background/80 p-2 md:p-3">
              {messages.length === 0 ? (
                <p className="text-xs text-foreground/60 md:text-sm">
                  {t(
                    "live.chat.empty",
                    "No messages yet. Say selam to your classmates.",
                  )}
                </p>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={`${msg.senderId}-${index.toString()}`}
                    className="rounded-2xl bg-surface px-3 py-1.5 text-xs md:px-3.5 md:py-2 md:text-sm"
                  >
                    <p className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-primary">
                        {msg.senderName}
                      </span>
                      <span className="text-[10px] text-foreground/50">
                        {new Date(msg.sentAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                    <p className="mt-0.5 text-foreground/80">{msg.message}</p>
                  </div>
                ))
              )}
            </div>

            <form
              className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-background/95 p-2 md:mt-3 md:p-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={t(
                  "live.chat.placeholder",
                  "Type a message to your class...",
                )}
                className="h-8 flex-1 bg-transparent text-xs outline-none placeholder:text-foreground/50 md:h-9 md:text-sm"
              />
              <button
                type="submit"
                className="inline-flex h-8 items-center justify-center rounded-full bg-secondary px-3 text-[11px] font-semibold text-primary shadow-sm shadow-secondary/30 transition hover:bg-secondary/90 md:h-9 md:px-4 md:text-xs"
              >
                {t("live.chat.send", "Send")}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl bg-background/80 p-2 md:p-3">
            {participants.map((p) => {
              const handUp = p.socketId ? raisedHandIds.has(p.socketId) : false;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-surface px-3 py-2 text-xs md:text-sm"
                >
                  <span className="flex items-center gap-2 truncate">
                    {handUp && <Hand className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                    <span className="truncate font-medium text-foreground/90">
                      {p.displayName}
                      {p.isLocal && (
                        <span className="ml-1 text-foreground/50">
                          ({t("live.people.you", "you")})
                        </span>
                      )}
                    </span>
                    {p.isHost && (
                      <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-600">
                        {t("live.people.host", "Host")}
                      </span>
                    )}
                  </span>

                  {/* Host moderation controls for remote participants */}
                  {isHost && !p.isLocal && p.socketId && (
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => hostMute(p.socketId as string)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-foreground/60 transition hover:bg-amber-500/10 hover:text-amber-600"
                        title={t("live.people.mute", "Mute participant")}
                      >
                        <VolumeX className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => hostRemove(p.socketId as string)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-foreground/60 transition hover:bg-rose-500/10 hover:text-rose-600"
                        title={t("live.people.remove", "Remove participant")}
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </div>
  );
}
