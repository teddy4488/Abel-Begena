"use client";

import { useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  useGetClassesQuery,
  useUploadMaterialMutation,
} from "@/store/api/classApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { motion, AnimatePresence } from "framer-motion";
import { useGetClassAccessQuery } from "@/store/api/classApi";
import { Upload, FileText, Download, X, Loader2, File } from "lucide-react";

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
  const { t } = useI18n();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [uploadDraft, setUploadDraft] = useState<UploadDraft>({
    title: "",
    file: undefined,
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const teacherClasses = useMemo(
    () =>
      (classes ?? []).filter(
        (klass) => klass.instructorId === user?._id || klass.instructorId === user?.id,
      ),
    [classes, user?._id, user?.id],
  );

  const { data: classAccess, refetch: refetchMaterials } = useGetClassAccessQuery(selectedClassId ?? "", {
    skip: !selectedClassId,
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadDraft((prev) => ({
        ...prev,
        file,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
      }));
    }
  };

  const handleFileSelect = (file: File) => {
    setUploadDraft((prev) => ({
      ...prev,
      file,
      title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
    }));
  };

  const handleUpload = async () => {
    if (!selectedClassId) {
      pushToast({
        title: t("teacher.materials.selectClass", "Select a class first"),
        variant: "error",
      });
      return;
    }
    if (!uploadDraft.file) {
      pushToast({
        title: t("teacher.materials.selectFile", "Choose a file first"),
        variant: "error",
      });
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (uploadDraft.file.size > maxSize) {
      pushToast({
        title: t("teacher.materials.fileTooLarge", "File too large"),
        description: t("teacher.materials.maxSize", "Maximum file size is 50MB"),
        variant: "error",
      });
      return;
    }

    try {
      setUploadProgress(0);
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await uploadMaterial({
        classId: selectedClassId,
        file: uploadDraft.file,
        title: uploadDraft.title || uploadDraft.file.name,
      }).unwrap();

      clearInterval(progressInterval);
      setUploadProgress(100);

      pushToast({
        title: t("teacher.materials.uploadSuccess", "Material uploaded successfully"),
        variant: "success",
      });
      
      setUploadDraft({ title: "", file: undefined });
      setUploadProgress(0);
      void refetchMaterials();
    } catch (error) {
      setUploadProgress(0);
      pushToast({
        title: t("teacher.materials.uploadError", "Upload failed"),
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const getFileIcon = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext || '')) return FileText;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return File;
    return File;
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          {t("teacher.materials.kicker", "Class Materials")}
        </p>
        <h1 className="text-3xl font-serif text-primary">
          {t("teacher.materials.title", "Upload Materials")}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {t(
            "teacher.materials.subtitle",
            "Upload PDFs, slides, videos, and other class materials for your students.",
          )}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-surface p-6 shadow-lg"
        >
          <h2 className="mb-4 text-xl font-serif text-primary">
            {t("teacher.materials.uploadTitle", "Upload New Material")}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("teacher.materials.selectClass", "Select Class")}
              </label>
              <select
                value={selectedClassId ?? ""}
                onChange={(e) => setSelectedClassId(e.target.value || null)}
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              >
                <option value="">{t("teacher.materials.chooseClass", "Choose a class...")}</option>
                {teacherClasses.map((klass) => (
                  <option key={klass._id} value={klass._id}>
                    {klass.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("teacher.materials.materialTitle", "Material Title")}
              </label>
              <input
                type="text"
                placeholder={t("teacher.materials.titlePlaceholder", "e.g., Lesson 1: Introduction to Begena")}
                value={uploadDraft.title}
                onChange={(e) =>
                  setUploadDraft((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("teacher.materials.file", "File")} (PDF, Video, Images)
              </label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative rounded-2xl border-2 border-dashed transition-all ${
                  dragActive
                    ? "border-secondary bg-secondary/10"
                    : "border-border bg-background/50 hover:border-secondary/50"
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.avi,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Upload className={`w-12 h-12 mb-3 ${dragActive ? "text-secondary" : "text-foreground/40"}`} />
                  <p className="text-sm font-medium text-foreground/70 mb-1">
                    {dragActive
                      ? t("teacher.materials.dropHere", "Drop file here")
                      : t("teacher.materials.clickOrDrag", "Click or drag file here")}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {t("teacher.materials.supportedFormats", "PDF, DOC, PPT, MP4, Images (Max 50MB)")}
                  </p>
                </div>
              </div>
              {uploadDraft.file && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center justify-between rounded-xl border border-border bg-background/80 p-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-secondary" />
                    <div>
                      <p className="text-sm font-medium text-primary">{uploadDraft.file.name}</p>
                      <p className="text-xs text-foreground/60">{formatFileSize(uploadDraft.file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setUploadDraft((prev) => ({ ...prev, file: undefined }))}
                    className="rounded-full p-1 hover:bg-background transition-colors"
                    aria-label={t("teacher.materials.removeFile", "Remove file")}
                  >
                    <X className="w-4 h-4 text-foreground/60" />
                  </button>
                </motion.div>
              )}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-foreground/70">
                      {t("teacher.materials.uploading", "Uploading...")}
                    </span>
                    <span className="text-xs font-semibold text-secondary">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-background/80 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-secondary to-secondary/70"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </div>
            <motion.button
              whileHover={{ scale: selectedClassId && uploadDraft.file ? 1.02 : 1 }}
              whileTap={{ scale: selectedClassId && uploadDraft.file ? 0.98 : 1 }}
              disabled={isUploading || !selectedClassId || !uploadDraft.file || uploadProgress > 0}
              onClick={handleUpload}
              className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              {isUploading || uploadProgress > 0 ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("teacher.materials.uploading", "Uploading...")}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {t("teacher.materials.uploadButton", "Upload Material")}
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Materials List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-surface p-6 shadow-lg"
        >
          <h2 className="mb-4 text-xl font-serif text-primary">
            {selectedClassId
              ? t("teacher.materials.classMaterials", "Class Materials")
              : t("teacher.materials.selectClassToView", "Select a class to view materials")}
          </h2>
          {selectedClassId && classAccess ? (
            <div className="space-y-3">
              {classAccess.materials.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-background/50 p-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
                  <p className="text-sm text-foreground/70">
                    {t("teacher.materials.noMaterials", "No materials uploaded yet.")}
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {classAccess.materials.map((material, idx) => {
                    const FileIcon = getFileIcon(material.url);
                    return (
                      <motion.div
                        key={`${selectedClassId}-${material.url}-${idx}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.05 }}
                        className="rounded-xl border border-border bg-background/50 p-4 hover:bg-background/80 transition-all hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                              <FileIcon className="w-5 h-5 text-secondary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-primary truncate">{material.title}</p>
                              {material.uploadedAt && (
                                <p className="text-xs text-foreground/60">
                                  {t("teacher.materials.uploaded", "Uploaded")}: {new Date(material.uploadedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <a
                            href={material.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold uppercase tracking-wide transition hover:bg-secondary/10 hover:border-secondary flex-shrink-0"
                          >
                            <Download className="w-3 h-3" />
                            {t("teacher.materials.download", "Download")}
                          </a>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-background/50 p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
              <p className="text-sm text-foreground/70">
                {t("teacher.materials.chooseClassPrompt", "Choose a class from the dropdown to view or upload materials.")}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
