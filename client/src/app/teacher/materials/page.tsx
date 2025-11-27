"use client";

import { useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  useGetClassesQuery,
  useUploadMaterialMutation,
} from "@/store/api/classApi";
import { useToast } from "@/components/providers/ToastProvider";
import { motion } from "framer-motion";
import { useGetClassAccessQuery } from "@/store/api/classApi";

type UploadDraft = {
  title: string;
  file?: File;
};

export default function TeacherMaterialsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { data: classes } = useGetClassesQuery();
  const [uploadMaterial, { isLoading: isUploading }] =
    useUploadMaterialMutation();
  const { pushToast } = useToast();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [uploadDraft, setUploadDraft] = useState<UploadDraft>({
    title: "",
    file: undefined,
  });

  const teacherClasses = useMemo(
    () =>
      (classes ?? []).filter(
        (klass) => klass.instructorId === user?._id || klass.instructorId === user?.id,
      ),
    [classes, user?._id, user?.id],
  );

  const { data: classAccess } = useGetClassAccessQuery(selectedClassId ?? "", {
    skip: !selectedClassId,
  });

  const handleUpload = async () => {
    if (!selectedClassId) {
      pushToast({
        title: "Select a class first",
        variant: "error",
      });
      return;
    }
    if (!uploadDraft.file) {
      pushToast({
        title: "Choose a file first",
        variant: "error",
      });
      return;
    }
    try {
      await uploadMaterial({
        classId: selectedClassId,
        file: uploadDraft.file,
        title: uploadDraft.title || uploadDraft.file.name,
      }).unwrap();
      pushToast({
        title: "Material uploaded",
        variant: "success",
      });
      setUploadDraft({ title: "", file: undefined });
    } catch {
      pushToast({
        title: "Upload failed",
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          Class Materials
        </p>
        <h1 className="text-3xl font-serif text-primary">Upload Materials</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Upload PDFs, slides, videos, and other class materials for your students.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-xl font-serif text-primary">Upload New Material</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                Select Class
              </label>
              <select
                value={selectedClassId ?? ""}
                onChange={(e) => setSelectedClassId(e.target.value || null)}
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              >
                <option value="">Choose a class...</option>
                {teacherClasses.map((klass) => (
                  <option key={klass._id} value={klass._id}>
                    {klass.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                Material Title
              </label>
              <input
                type="text"
                placeholder="e.g., Lesson 1: Introduction to Begena"
                value={uploadDraft.title}
                onChange={(e) =>
                  setUploadDraft((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                File (PDF, Video, Images)
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.jpg,.jpeg,.png"
                onChange={(e) =>
                  setUploadDraft((prev) => ({
                    ...prev,
                    file: e.target.files?.[0],
                  }))
                }
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground/70 file:mr-3 file:rounded-full file:border-0 file:bg-secondary/20 file:px-4 file:py-2 file:text-secondary"
              />
              {uploadDraft.file && (
                <p className="mt-2 text-xs text-foreground/70">
                  Selected: {uploadDraft.file.name} ({(uploadDraft.file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={isUploading || !selectedClassId || !uploadDraft.file}
              onClick={handleUpload}
              className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {isUploading ? "Uploading..." : "Upload Material"}
            </motion.button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-xl font-serif text-primary">
            {selectedClassId ? "Class Materials" : "Select a class to view materials"}
          </h2>
          {selectedClassId && classAccess ? (
            <div className="space-y-3">
              {classAccess.materials.length === 0 ? (
                <p className="text-sm text-foreground/70">No materials uploaded yet.</p>
              ) : (
                classAccess.materials.map((material, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border bg-background/50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-primary">{material.title}</p>
                        {material.uploadedAt && (
                          <p className="text-xs text-foreground/70">
                            Uploaded: {new Date(material.uploadedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <a
                        href={material.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition hover:bg-secondary/10"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <p className="text-sm text-foreground/70">
              Choose a class from the dropdown to view or upload materials.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

