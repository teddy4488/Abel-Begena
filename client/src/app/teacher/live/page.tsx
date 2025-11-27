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
import { Video, ExternalLink } from "lucide-react";

export default function TeacherLiveClassesPage() {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const { pushToast } = useToast();
  const { data: classes, isLoading } = useGetClassesQuery();
  const [updateLiveState] = useUpdateLiveStateMutation();
  const [liveLinks, setLiveLinks] = useState<Record<string, string>>({});

  const teacherClasses = useMemo(
    () =>
      (classes ?? []).filter(
        (klass) => klass.instructorId === user?._id || klass.instructorId === user?.id,
      ),
    [classes, user?._id, user?.id],
  );

  const handleToggleLive = async (classId: string, current: boolean) => {
    try {
      await updateLiveState({
        classId,
        isLive: !current,
      }).unwrap();
      pushToast({
        title: !current ? "Live session started" : "Session ended",
        variant: "success",
      });
    } catch {
      pushToast({
        title: "Unable to update session",
        variant: "error",
      });
    }
  };

  const handleLiveLinkBlur = async (classId: string, link: string) => {
    const trimmed = link.trim();
    if (!trimmed) return;
    try {
      await updateLiveState({
        classId,
        liveRoomCode: trimmed,
      }).unwrap();
      pushToast({
        title: "Live link saved",
        variant: "success",
      });
    } catch {
      pushToast({
        title: "Unable to save link",
        variant: "error",
      });
    }
  };

  const handleJoinClass = (classId: string) => {
    router.push(`/live/class/${classId}`);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          Live Sessions
        </p>
        <h1 className="text-3xl font-serif text-primary">Manage Live Classes</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Start and stop live class sessions. Only enrolled students can access live rooms.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-foreground/70">Loading classes...</p>
      ) : teacherClasses.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <Video className="mx-auto h-12 w-12 text-foreground/30" />
          <p className="mt-4 text-sm text-foreground/70">
            No classes assigned yet.
          </p>
          <p className="mt-2 text-xs text-foreground/50">
            Coordinate with the admin team to become an instructor.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {teacherClasses.map((klass) => (
            <div
              key={klass._id}
              className="space-y-4 rounded-2xl border border-border bg-surface p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                    Class
                  </p>
                  <h3 className="text-xl font-serif text-primary">{klass.title}</h3>
                </div>
                <div
                  className={`h-3 w-3 rounded-full ${
                    klass.isLive ? "bg-green-500 animate-pulse" : "bg-gray-400"
                  }`}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                    Live Room Link
                  </label>
                  <input
                    type="text"
                    placeholder="https://meet.google.com/..."
                    defaultValue={liveLinks[klass._id] || ""}
                    onBlur={(e) => {
                      setLiveLinks((prev) => ({
                        ...prev,
                        [klass._id]: e.target.value,
                      }));
                      handleLiveLinkBlur(klass._id, e.target.value);
                    }}
                    className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  />
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleToggleLive(klass._id, klass.isLive ?? false)}
                    className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold uppercase tracking-wide transition ${
                      klass.isLive
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-green-500 text-white hover:bg-green-600"
                    }`}
                  >
                    {klass.isLive ? "End Session" : "Go Live"}
                  </motion.button>
                  {klass.isLive && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleJoinClass(klass._id)}
                      className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-3 text-sm font-semibold transition hover:bg-secondary/10"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Join
                    </motion.button>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-background/50 p-3">
                  <p className="text-xs uppercase tracking-wide text-secondary">
                    Status
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary">
                    {klass.isLive ? "Live Now" : "Offline"}
                  </p>
                  <p className="mt-1 text-xs text-foreground/70">
                    {klass.isLive
                      ? "Students can join the live session"
                      : "Session is not active"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

