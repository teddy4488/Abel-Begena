"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  useGetClassesQuery,
  useUploadMaterialMutation,
  useGetClassAccessQuery,
} from "@/store/api/classApi";
import {
  useGetTeacherMaterialsQuery,
  useUploadInstrumentMaterialMutation,
  useDeleteMaterialMutation,
} from "@/store/api/materialsApi";
import { useGetInstrumentLessonsQuery } from "@/store/api/attendanceApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Download, X, Loader2, File, BookOpen, GraduationCap } from "lucide-react";
import { InstrumentType } from "@/store/api/storeApi";

type UploadDraft = {
  title: string;
  file?: File;
  description?: string;
  instrumentType?: InstrumentType;
  lessonId?: string;
};

type TabType = "class" | "lesson";

export default function TeacherMaterialsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { data: classes } = useGetClassesQuery();
  const [uploadMaterial, { isLoading: isUploadingClass }] =
    useUploadMaterialMutation();
  const [uploadInstrumentMaterial, { isLoading: isUploadingInstrument }] =
    useUploadInstrumentMaterialMutation();
  const [deleteMaterial, { isLoading: isDeletingMaterial }] =
    useDeleteMaterialMutation();
  const { data: instrumentMaterials, refetch: refetchInstrumentMaterials } =
    useGetTeacherMaterialsQuery();
  const { pushToast } = useToast();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>("class");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [uploadDraft, setUploadDraft] = useState<UploadDraft>({
    title: "",
    file: undefined,
    description: "",
    instrumentType: "Begena",
    lessonId: "",
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Get lessons for selected class (for lesson materials tab)
  const { data: lessons = [] } = useGetInstrumentLessonsQuery(
    selectedClassId ? { classId: selectedClassId } : undefined,
  );

  const filteredLessons = useMemo(() => {
    if (!selectedClassId) return [];
    return lessons.filter(
      (lesson) => lesson.classId === selectedClassId && lesson.isActive,
    );
  }, [lessons, selectedClassId]);

  const openDeleteConfirm = (id: string) => {
    setPendingDeleteId(id);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteMaterial(pendingDeleteId).unwrap();
      pushToast({
        title: "Material deleted",
        variant: "success",
      });
      void refetchInstrumentMaterials();
    } catch {
      pushToast({
        title: "Failed to delete",
        variant: "error",
      });
    } finally {
      setConfirmDeleteOpen(false);
      setPendingDeleteId(null);
    }
  };

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

  // Keep instrument type in sync with selected class (defer setState to avoid sync-in-effect lint)
  useEffect(() => {
    if (!selectedClassId) return;
    const klass = classes?.find((item) => item._id === selectedClassId);
    if (klass?.instrumentType) {
      const inst = klass.instrumentType;
      const id = setTimeout(() => setUploadDraft((prev) => ({ ...prev, instrumentType: inst })), 0);
      return () => clearTimeout(id);
    }
  }, [classes, selectedClassId]);

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
    if (activeTab === "class") {
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
        
        setUploadDraft({ title: "", file: undefined, description: "", instrumentType: "Begena", lessonId: "" });
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
    } else {
      // Lesson-specific upload
      if (!selectedClassId) {
        pushToast({
          title: t("teacher.materials.selectClass", "Select a class first"),
          variant: "error",
        });
        return;
      }
      if (!uploadDraft.lessonId) {
        pushToast({
          title: t("teacher.materials.selectLessonRequired", "Select a lesson first"),
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
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);

        await uploadInstrumentMaterial({
          classId: selectedClassId,
          file: uploadDraft.file,
          title: uploadDraft.title || uploadDraft.file.name,
          instrumentType: uploadDraft.instrumentType,
          description: uploadDraft.description,
          lessonId: uploadDraft.lessonId,
        }).unwrap();

        clearInterval(progressInterval);
        setUploadProgress(100);

        pushToast({
          title: "Material uploaded successfully",
          description: t("teacher.materials.lessonUploadSuccess", "Students in this class can now access the material."),
          variant: "success",
        });
        
        setUploadDraft({ title: "", file: undefined, description: "", instrumentType: "Begena", lessonId: "" });
        setUploadProgress(0);
        void refetchInstrumentMaterials();
      } catch (error) {
        setUploadProgress(0);
        pushToast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : undefined,
          variant: "error",
        });
      }
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

  const instrumentTypes: InstrumentType[] = ["Begena", "Kirar", "Masinko", "Washint", "Kebero", "Other"];
  const isUploading = isUploadingClass || isUploadingInstrument;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="mb-4 sm:mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          {t("teacher.materials.kicker", "Materials Management")}
        </p>
        <h1 className="text-2xl font-serif text-primary sm:text-3xl">
          {t("teacher.materials.title", "Upload Materials")}
        </h1>
        <p className="mt-2 text-xs text-foreground/70 sm:text-sm">
          {t(
            "teacher.materials.subtitle",
            "Upload materials for specific classes or for all students of an instrument type.",
          )}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => {
            setActiveTab("class");
            setUploadDraft({
              title: "",
              file: undefined,
              description: "",
              instrumentType: "Begena",
              lessonId: "",
            });
          }}
          className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "class"
              ? "border-secondary text-secondary"
              : "border-transparent text-foreground/60 hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            {t("teacher.materials.tabClass", "Class materials")}
          </div>
        </button>
        <button
          onClick={() => {
            setActiveTab("lesson");
            setUploadDraft({
              title: "",
              file: undefined,
              description: "",
              instrumentType: "Begena",
              lessonId: "",
            });
          }}
          className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "lesson"
              ? "border-secondary text-secondary"
              : "border-transparent text-foreground/60 hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {t("teacher.materials.tabLesson", "Lesson materials")}
          </div>
        </button>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl  surface-elevated p-4 shadow-lg sm:p-6"
        >
          <h2 className="mb-4 text-lg font-serif text-primary sm:text-xl">
            {t("teacher.materials.uploadTitle", "Upload New Material")}
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {activeTab === "class" ? (
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("teacher.materials.selectClass", "Select Class")}
                </label>
                <select
                  value={selectedClassId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setSelectedClassId(val);
                    if (val && classes) {
                      const klass = classes.find((item) => item._id === val);
                      if (klass?.instrumentType) {
                        setUploadDraft((prev) => ({ ...prev, instrumentType: klass.instrumentType }));
                      }
                    }
                  }}
                  className="w-full rounded-2xl  card-elevated80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                >
                  <option value="">{t("teacher.materials.chooseClass", "Choose a class...")}</option>
                  {teacherClasses.map((klass) => (
                    <option key={klass._id} value={klass._id}>
                      {klass.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                    Instrument Type *
                  </label>
                  <select
                    value={uploadDraft.instrumentType ?? "Begena"}
                    onChange={(e) =>
                      setUploadDraft((prev) => ({
                        ...prev,
                        instrumentType: e.target.value as InstrumentType,
                      }))
                    }
                    className="w-full rounded-2xl  card-elevated80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  >
                    {instrumentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                    {t("teacher.materials.lesson", "Lesson")} *
                  </label>
                  <select
                    value={uploadDraft.lessonId || ""}
                    onChange={(e) =>
                      setUploadDraft((prev) => ({ ...prev, lessonId: e.target.value || undefined }))
                    }
                    className="w-full rounded-2xl  card-elevated80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  >
                    <option value="">{t("teacher.materials.selectLessonRequired", "Select a lesson")}</option>
                    {filteredLessons.map((lesson) => (
                      <option key={lesson._id} value={lesson._id}>
                        {lesson.title} {lesson.code && `(${lesson.code})`}
                      </option>
                    ))}
                  </select>
                  {filteredLessons.length === 0 && uploadDraft.instrumentType && (
                    <p className="mt-1 text-xs text-foreground/60">
                      {t("teacher.materials.noLessons", "No lessons available for this instrument yet.")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                    Description (Optional)
                  </label>
                  <textarea
                    placeholder="Brief description of the material..."
                    value={uploadDraft.description ?? ""}
                    onChange={(e) =>
                      setUploadDraft((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={2}
                    className="w-full rounded-2xl  card-elevated80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  />
                </div>
              </>
            )}
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
                className="w-full rounded-2xl  card-elevated80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
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
                    : "border-border card-elevated50 hover:border-secondary/50"
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
                  className="mt-3 flex items-center justify-between rounded-xl  card-elevated80 p-3"
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
                  <div className="h-2 rounded-full card-elevated80 overflow-hidden">
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
              whileHover={
                (activeTab === "class" && selectedClassId && uploadDraft.file) ||
                (activeTab === "lesson" &&
                  uploadDraft.file &&
                  uploadDraft.instrumentType &&
                  uploadDraft.lessonId)
                  ? { scale: 1.02 }
                  : { scale: 1 }
              }
              whileTap={
                (activeTab === "class" && selectedClassId && uploadDraft.file) ||
                (activeTab === "lesson" &&
                  uploadDraft.file &&
                  uploadDraft.instrumentType &&
                  uploadDraft.lessonId)
                  ? { scale: 0.98 }
                  : { scale: 1 }
              }
              disabled={
                isUploading ||
                (activeTab === "class" && (!selectedClassId || !uploadDraft.file)) ||
                (activeTab === "lesson" &&
                  (!uploadDraft.file || !uploadDraft.instrumentType || !uploadDraft.lessonId)) ||
                uploadProgress > 0
              }
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
          className="rounded-2xl  surface-elevated p-6 shadow-lg"
        >
          <h2 className="mb-4 text-xl font-serif text-primary">
            {activeTab === "class"
              ? selectedClassId
                ? t("teacher.materials.classMaterials", "Class Materials")
                : t("teacher.materials.selectClassToView", "Select a class to view materials")
              : "Instrument Materials"}
          </h2>
          {activeTab === "class" && selectedClassId && classAccess ? (
            <div className="space-y-3">
              {classAccess.materials.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border card-elevated50 p-8 text-center">
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
                        className="rounded-xl  card-elevated50 p-4 hover:card-elevated80 transition-all hover:shadow-md"
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
                            className="flex items-center gap-2 rounded-full  bg-background px-3 py-2 text-xs font-semibold uppercase tracking-wide transition hover:bg-secondary/10 hover:border-secondary flex-shrink-0"
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
          ) : activeTab === "class" ? (
            <div className="rounded-xl border border-dashed border-border card-elevated50 p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
              <p className="text-sm text-foreground/70">
                {t("teacher.materials.chooseClassPrompt", "Choose a class from the dropdown to view or upload materials.")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {!instrumentMaterials || instrumentMaterials.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border card-elevated50 p-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
                  <p className="text-sm text-foreground/70">
                    No instrument materials uploaded yet.
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {instrumentMaterials.map((material, idx) => {
                    const FileIcon = getFileIcon(material.url);
                    return (
                      <motion.div
                        key={material._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.05 }}
                        className="rounded-xl  card-elevated50 p-4 hover:card-elevated80 transition-all hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                              <FileIcon className="w-5 h-5 text-secondary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-primary truncate">{material.title}</p>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                                  {material.instrumentType}
                                </span>
                              </div>
                              {material.description && (
                                <p className="text-xs text-foreground/60 mt-1 line-clamp-1">
                                  {material.description}
                                </p>
                              )}
                              {material.uploadedAt && (
                                <p className="text-xs text-foreground/60">
                                  {new Date(material.uploadedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={material.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-full  bg-background px-3 py-2 text-xs font-semibold uppercase tracking-wide transition hover:bg-secondary/10 hover:border-secondary flex-shrink-0"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </a>
                            <button
                              onClick={async () => {
                                openDeleteConfirm(material._id);
                              }}
                              className="rounded-full p-2 hover:bg-red-500/10 text-red-500 transition-colors"
                              aria-label="Delete material"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          )}
        </motion.div>
      </div>

      <ConfirmModal
        open={confirmDeleteOpen}
        title={t("teacher.materials.confirmDeleteTitle", "Delete material?")}
        description={t(
          "teacher.materials.confirmDelete",
          "Delete this material? This action cannot be undone.",
        )}
        confirmLabel={t("button.delete", "Delete")}
        cancelLabel={t("button.cancel", "Cancel")}
        isLoading={isDeletingMaterial}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!isDeletingMaterial) {
            setConfirmDeleteOpen(false);
            setPendingDeleteId(null);
          }
        }}
      />
    </div>
  );
}
