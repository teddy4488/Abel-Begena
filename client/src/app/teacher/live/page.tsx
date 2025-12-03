"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import {
  useGetClassesQuery,
  useUpdateLiveStateMutation,
} from "@/store/api/classApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { Video, ExternalLink, VideoIcon, Globe, Users } from "lucide-react";

type LiveSessionType = "builtin" | "external" | null;

export default function TeacherLiveClassesPage() {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const { pushToast } = useToast();
  const { t } = useI18n();
  const { data: classes, isLoading } = useGetClassesQuery();
  const [updateLiveState] = useUpdateLiveStateMutation();
  const [liveLinks, setLiveLinks] = useState<Record<string, string>>({});
  const [sessionTypes, setSessionTypes] = useState<Record<string, LiveSessionType>>({});

  const teacherClasses = useMemo(
    () =>
      (classes ?? []).filter(
        (klass) => klass.instructorId === user?._id || klass.instructorId === user?.id,
      ),
    [classes, user?._id, user?.id],
  );

  // Initialize session types based on existing liveRoomCode
  useMemo(() => {
    teacherClasses.forEach((klass) => {
      if (klass.liveRoomCode && !sessionTypes[klass._id]) {
        const isExternal = klass.liveRoomCode.startsWith("http://") || klass.liveRoomCode.startsWith("https://");
        setSessionTypes((prev) => ({
          ...prev,
          [klass._id]: isExternal ? "external" : "builtin",
        }));
        if (isExternal) {
          setLiveLinks((prev) => ({
            ...prev,
            [klass._id]: klass.liveRoomCode || "",
          }));
        }
      }
    });
  }, [teacherClasses, sessionTypes]);

  const handleToggleLive = async (classId: string, current: boolean) => {
    try {
      const sessionType = sessionTypes[classId];
      const liveLink = liveLinks[classId]?.trim() || "";

      // If going live with external link, validate URL
      if (!current && sessionType === "external" && !liveLink) {
        pushToast({
          title: t("teacher.live.externalLinkRequired", "Please provide an external link"),
          variant: "error",
        });
        return;
      }

      await updateLiveState({
        classId,
        isLive: !current,
        liveRoomCode: sessionType === "external" && liveLink ? liveLink : sessionType === "builtin" ? "builtin" : undefined,
      }).unwrap();
      pushToast({
        title: !current 
          ? t("teacher.live.sessionStarted", "Live session started")
          : t("teacher.live.sessionEnded", "Session ended"),
        variant: "success",
      });
    } catch {
      pushToast({
        title: t("teacher.live.updateError", "Unable to update session"),
        variant: "error",
      });
    }
  };

  const handleLiveLinkBlur = async (classId: string, link: string) => {
    const trimmed = link.trim();
    if (!trimmed) {
      // Clear external link if empty
      setSessionTypes((prev) => ({
        ...prev,
        [classId]: "builtin",
      }));
      try {
        await updateLiveState({
          classId,
          liveRoomCode: "builtin",
        }).unwrap();
      } catch {
        // ignore
      }
      return;
    }
    try {
      await updateLiveState({
        classId,
        liveRoomCode: trimmed,
      }).unwrap();
      setSessionTypes((prev) => ({
        ...prev,
        [classId]: "external",
      }));
      pushToast({
        title: t("teacher.live.linkSaved", "Live link saved"),
        variant: "success",
      });
    } catch {
      pushToast({
        title: t("teacher.live.linkSaveError", "Unable to save link"),
        variant: "error",
      });
    }
  };

  const handleSessionTypeChange = async (classId: string, type: LiveSessionType) => {
    setSessionTypes((prev) => ({
      ...prev,
      [classId]: type,
    }));
    
    if (type === "builtin") {
      // Clear external link when switching to built-in
      setLiveLinks((prev) => {
        const next = { ...prev };
        delete next[classId];
        return next;
      });
      try {
        await updateLiveState({
          classId,
          liveRoomCode: "builtin",
        }).unwrap();
      } catch {
        // ignore
      }
    }
  };

  const handleJoinClass = (classId: string, sessionType: LiveSessionType) => {
    if (sessionType === "external" && liveLinks[classId]) {
      // Open external link in new tab
      window.open(liveLinks[classId], "_blank", "noopener,noreferrer");
    } else {
      // Use built-in platform
      router.push(`/live/class/${classId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          {t("teacher.live.kicker", "Live Sessions")}
        </p>
        <h1 className="text-3xl font-serif text-primary">
          {t("teacher.live.title", "Manage Live Classes")}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {t(
            "teacher.live.subtitle",
            "Start and stop live class sessions. Choose between built-in platform or external links (Zoom, Google Meet, etc.). Only enrolled students can access live rooms.",
          )}
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-foreground/70">
          {t("teacher.live.loading", "Loading classes...")}
        </p>
      ) : teacherClasses.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <Video className="mx-auto h-12 w-12 text-foreground/30" />
          <p className="mt-4 text-sm text-foreground/70">
            {t("teacher.live.noClasses", "No classes assigned yet.")}
          </p>
          <p className="mt-2 text-xs text-foreground/50">
            {t(
              "teacher.live.coordinateAdmin",
              "Coordinate with the admin team to become an instructor.",
            )}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {teacherClasses.map((klass) => {
            const currentSessionType = sessionTypes[klass._id] || 
              (klass.liveRoomCode && (klass.liveRoomCode.startsWith("http://") || klass.liveRoomCode.startsWith("https://")) 
                ? "external" 
                : klass.liveRoomCode ? "builtin" : null);
            const isLive = klass.isLive ?? false;

            return (
              <motion.div
                key={klass._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                      {t("teacher.live.class", "Class")}
                    </p>
                    <h3 className="text-xl font-serif text-primary">{klass.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        isLive ? "bg-green-500 animate-pulse shadow-lg shadow-green-500/50" : "bg-gray-400"
                      }`}
                    />
                    {isLive && (
                      <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">
                        {t("teacher.live.liveNow", "LIVE")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Session Type Selection */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                      {t("teacher.live.sessionType", "Session Type")}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSessionTypeChange(klass._id, "builtin")}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          currentSessionType === "builtin"
                            ? "border-begena-gold bg-begena-gold/20 text-begena-darkBrown shadow-md"
                            : "border-border bg-background/50 text-foreground/70 hover:border-begena-gold/50"
                        }`}
                      >
                        <VideoIcon className={`w-4 h-4 ${currentSessionType === "builtin" ? "text-begena-gold" : ""}`} />
                        <span className="text-xs font-semibold">
                          {t("teacher.live.builtIn", "Built-in")}
                        </span>
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSessionTypeChange(klass._id, "external")}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          currentSessionType === "external"
                            ? "border-begena-gold bg-begena-gold/20 text-begena-darkBrown shadow-md"
                            : "border-border bg-background/50 text-foreground/70 hover:border-begena-gold/50"
                        }`}
                      >
                        <Globe className={`w-4 h-4 ${currentSessionType === "external" ? "text-begena-gold" : ""}`} />
                        <span className="text-xs font-semibold">
                          {t("teacher.live.external", "External")}
                        </span>
                      </motion.button>
                    </div>
                  </div>

                  {/* External Link Input (only show if external selected) */}
                  {currentSessionType === "external" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                        {t("teacher.live.externalLink", "External Meeting Link")}
                      </label>
                      <input
                        type="url"
                        placeholder="https://meet.google.com/... or https://zoom.us/j/..."
                        value={liveLinks[klass._id] || ""}
                        onChange={(e) => {
                          setLiveLinks((prev) => ({
                            ...prev,
                            [klass._id]: e.target.value,
                          }));
                        }}
                        onBlur={(e) => handleLiveLinkBlur(klass._id, e.target.value)}
                        className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                      />
                      <p className="mt-1 text-xs text-foreground/60">
                        {t(
                          "teacher.live.externalHint",
                          "Paste Zoom, Google Meet, or other meeting platform link",
                        )}
                      </p>
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleToggleLive(klass._id, isLive)}
                      className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold uppercase tracking-wide transition shadow-lg ${
                        isLive
                          ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/40"
                          : "bg-green-500 text-white hover:bg-green-600 shadow-green-500/40"
                      }`}
                    >
                      {isLive 
                        ? t("teacher.live.endSession", "End Session")
                        : t("teacher.live.goLive", "Go Live")}
                    </motion.button>
                    {isLive && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleJoinClass(klass._id, currentSessionType || "builtin")}
                        className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-3 text-sm font-semibold transition hover:bg-secondary/10 shadow-md"
                      >
                        {currentSessionType === "external" ? (
                          <>
                            <ExternalLink className="h-4 w-4" />
                            {t("teacher.live.openExternal", "Open")}
                          </>
                        ) : (
                          <>
                            <VideoIcon className="h-4 w-4" />
                            {t("teacher.live.joinBuiltIn", "Join")}
                          </>
                        )}
                      </motion.button>
                    )}
                  </div>

                  {/* Status Card */}
                  <div className="rounded-xl border border-border bg-background/50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs uppercase tracking-wide text-secondary">
                        {t("teacher.live.status", "Status")}
                      </p>
                      <Users className="w-4 h-4 text-secondary/60" />
                    </div>
                    <p className={`text-sm font-semibold ${isLive ? "text-green-600" : "text-primary"}`}>
                      {isLive 
                        ? t("teacher.live.liveNow", "Live Now")
                        : t("teacher.live.offline", "Offline")}
                    </p>
                    <p className="mt-1 text-xs text-foreground/70">
                      {isLive
                        ? currentSessionType === "external"
                          ? t("teacher.live.externalActive", "Students can join via external link")
                          : t("teacher.live.builtInActive", "Students can join via built-in platform")
                        : t("teacher.live.sessionInactive", "Session is not active")}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
