"use client";

import { useMemo, useState } from "react";
import {
  MessageCircle,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  ExternalLink,
} from "lucide-react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { VideoTile } from "./VideoTile";
import { useI18n } from "@/components/providers/I18nProvider";

type LiveRoomProps = {
  classId: string;
  userId: string;
  displayName: string;
  role: "Teacher" | "Student" | "Admin";
  externalLink?: string | null;
  onLeave?: () => void;
  isTeacherSession?: boolean;
};

export function LiveRoom({
  classId,
  userId,
  displayName,
  role,
  externalLink,
  onLeave,
  isTeacherSession,
}: LiveRoomProps) {
  const normalizedRole =
    role === "Teacher" ? "teacher" : role === "Admin" ? "admin" : "student";
  const { t } = useI18n();
  const [chatInput, setChatInput] = useState("");

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
  } = useWebRTC({
    classId,
    displayName,
    userId,
    role: normalizedRole,
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
    handleLeave();
  };

  return (
    <div className="flex h-full flex-col gap-4 md:flex-row">
      <div className="flex-1 space-y-3 rounded-3xl border border-border bg-black/80 p-3 md:p-4">
        <div
          className={`grid gap-3 md:gap-4 ${layoutCols}`}
        >
          <VideoTile
            stream={localStream}
            isLocal
            displayName={displayName}
          />
          {remoteStreams.map((remote) => (
            <VideoTile
              key={remote.socketId}
              stream={remote.stream}
              displayName={remote.displayName}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black/70 px-3 py-2 text-xs text-gray-100 md:px-4 md:py-3">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 md:text-xs">
              {t("live.status.live", "Live")}
            </span>
            <span className="text-[11px] text-gray-300 md:text-xs">
              {t("live.status.participants", "Participants")}:{" "}
              {participants.length}
            </span>
            {sessionEndedBy && (
              <span className="text-[11px] text-rose-300 md:text-xs">
                {t("live.status.endedBy", "Session ended by")}{" "}
                {sessionEndedBy}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
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
        <div className="mb-2 flex items-center justify-between gap-2 border-b border-border/70 pb-2 md:mb-3 md:pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/10 text-secondary md:h-8 md:w-8">
              <MessageCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary md:text-[11px]">
                {t("live.chat.kicker", "Classroom Chat")}
              </p>
              <p className="text-[11px] text-foreground/70 md:text-xs">
                {t("live.chat.subtitle", "Stay in sync with your cohort.")}
              </p>
            </div>
          </div>
        </div>

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
      </aside>
    </div>
  );
}


