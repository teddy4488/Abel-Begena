import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import {
  useGetClassesQuery,
  useUpdateLiveStateMutation,
  useUploadMaterialMutation,
} from "@/store/api/classApi";
import { useToast } from "@/components/providers/ToastProvider";
import { BlogStudio } from "@/components/blog/BlogStudio";

type UploadDraft = Record<
  string,
  {
    title: string;
    file?: File;
  }
>;

export default function TeacherPage() {
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const { pushToast } = useToast();
  const { data: classes, isLoading } = useGetClassesQuery();
  const [updateLiveState] = useUpdateLiveStateMutation();
  const [uploadMaterial, { isLoading: isUploading }] =
    useUploadMaterialMutation();
  const [uploadDrafts, setUploadDrafts] = useState<UploadDraft>({});

  useEffect(() => {
    if (!isLoggedIn || user?.role !== "Teacher") {
      router.replace(isLoggedIn ? "/dashboard" : "/login");
    }
  }, [isLoggedIn, router, user?.role]);

  const teacherClasses = useMemo(
    () =>
      (classes ?? []).filter(
        (klass) => klass.instructorId === user?._id || klass.instructorId === user?.id,
      ),
    [classes, user?._id, user?.id],
  );

  if (!isLoggedIn || user?.role !== "Teacher") {
    return null;
  }

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

  const handleUpload = async (classId: string) => {
    const draft = uploadDrafts[classId];
    if (!draft?.file) {
      pushToast({
        title: "Choose a file first",
        variant: "error",
      });
      return;
    }
    try {
      await uploadMaterial({
        classId,
        file: draft.file,
        title: draft.title || draft.file.name,
      }).unwrap();
      pushToast({
        title: "Material uploaded",
        variant: "success",
      });
      setUploadDrafts((prev) => ({
        ...prev,
        [classId]: { title: "", file: undefined },
      }));
    } catch {
      pushToast({
        title: "Upload failed",
        variant: "error",
      });
    }
  };

  return (
    <section className="min-h-screen bg-background px-4 py-16 text-foreground md:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="space-y-4 rounded-[32px] border border-border bg-linear-to-br from-surface via-background to-(--color-secondary-soft) p-8 shadow-[0_40px_100px_rgba(34,6,9,0.25)]">
          <p className="text-xs uppercase tracking-[0.35em] text-secondary">
            Teacher Studio
          </p>
          <h1 className="text-3xl font-serif text-primary md:text-4xl">
            Steward your classes, materials, and live rooms.
          </h1>
          <p className="text-sm text-foreground/75">
            Upload lesson plans, keep rosters ready, and light up live rooms for
            the faithful.
          </p>
          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-secondary/70">
            <span>{teacherClasses.length} Active classes</span>
            <span>•</span>
            <span>Cloudinary media pipeline</span>
            <span>•</span>
            <span>Zoom / Meet ready</span>
          </div>
        </header>

        <div className="space-y-4 rounded-[32px] border border-border bg-surface p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                My classes
              </p>
              <h2 className="text-2xl font-serif text-primary">
                Live control room
              </h2>
            </div>
            <Link
              href="/dashboard"
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider"
            >
              View as student
            </Link>
          </div>

          {isLoading && (
            <p className="text-sm text-foreground/70">Loading assignments...</p>
          )}

          {!isLoading && teacherClasses.length === 0 && (
            <p className="text-sm text-foreground/70">
              No classes assigned yet. Coordinate with the admin team to become
              an instructor.
            </p>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            {teacherClasses.map((klass) => (
              <div
                key={klass._id}
                className="space-y-4 rounded-3xl border border-border bg-background/70 p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                      Class
                    </p>
                    <h3 className="text-xl font-serif text-primary">
                      {klass.title}
                    </h3>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleToggleLive(klass._id, klass.isLive ?? false)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                      klass.isLive
                        ? "bg-green-500 text-white"
                        : "border border-border text-foreground"
                    }`}
                  >
                    {klass.isLive ? "End live session" : "Go live"}
                  </motion.button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-secondary">
                    Live link
                  </label>
                  <input
                    type="text"
                    placeholder="https://meet.google.com/..."
                    onBlur={(e) => handleLiveLinkBlur(klass._id, e.target.value)}
                    className="w-full rounded-2xl border border-border bg-background/60 px-4 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  />
                </div>

                <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                    Upload materials
                  </p>
                  <input
                    type="text"
                    placeholder="Material title"
                    value={uploadDrafts[klass._id]?.title ?? ""}
                    onChange={(e) =>
                      setUploadDrafts((prev) => ({
                        ...prev,
                        [klass._id]: {
                          ...(prev[klass._id] ?? { file: undefined }),
                          title: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-2xl border border-border bg-background/80 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  />
                  <input
                    type="file"
                    onChange={(e) =>
                      setUploadDrafts((prev) => ({
                        ...prev,
                        [klass._id]: {
                          ...(prev[klass._id] ?? { title: "" }),
                          file: e.target.files?.[0],
                        },
                      }))
                    }
                    className="text-xs text-foreground/70 file:mr-3 file:rounded-full file:border-0 file:bg-secondary/20 file:px-4 file:py-2 file:text-secondary"
                  />
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    disabled={isUploading}
                    onClick={() => handleUpload(klass._id)}
                    className="w-full rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
                  >
                    Upload to class
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <BlogStudio
          filterByAuthorId={user?._id ?? user?.id}
          title="Contribute to Heritage"
        />
      </div>
    </section>
  );
}


