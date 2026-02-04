"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Edit, Loader2, Trash2, Plus, Music, X } from "lucide-react";
import {
  useAssignClassInstructorMutation,
  useCreateManagedClassMutation,
  useDeleteManagedClassMutation,
  useGetManagedClassesQuery,
  useUpdateManagedClassMutation,
} from "@/store/api/adminApi";
import { useGetTeachersQuery } from "@/store/api/adminApi";
import {
  useGetInstrumentLessonsQuery,
  useCreateLessonMutation,
  useUpdateLessonMutation,
  useDeleteLessonMutation,
} from "@/store/api/attendanceApi";
import type { InstrumentType } from "@/store/api/storeApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import Pagination from "@/components/ui/Pagination";

const emptyForm = {
  title: "",
  description: "",
  classType: "online" as "online" | "physical" | "both",
  instructorId: "",
  startDate: "",
  endDate: "",
  capacity: "",
  tuition: "",
  currency: "ETB",
  enrollmentDeadline: "",
};

export default function AdminClassesPage() {
  const { data: classes, isLoading } = useGetManagedClassesQuery();
  const { data: teachers = [] } = useGetTeachersQuery();
  const [createClass] = useCreateManagedClassMutation();
  const [updateClass] = useUpdateManagedClassMutation();
  const [deleteClass] = useDeleteManagedClassMutation();
  const [assignInstructor] = useAssignClassInstructorMutation();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { pushToast } = useToast();
  const { t } = useI18n();

  const [searchTerm, setSearchTerm] = useState("");
  const [viewFilter, setViewFilter] = useState<"all" | "unassigned" | "live">("all");
  const [activeTab, setActiveTab] = useState<"classes" | "lessons">("classes");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [lessonsCurrentPage, setLessonsCurrentPage] = useState(1);
  const [lessonsItemsPerPage, setLessonsItemsPerPage] = useState(10);
  
  // Lessons management
  // Keep this in sync with backend InstrumentType (Begena, Kirar, Masinko, Washint, Kebero, Other)
  const INSTRUMENTS: InstrumentType[] = [
    "Begena",
    "Masinko",
    "Kirar",
    "Washint",
    "Kebero",
    "Other",
  ];
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>("Begena");
  const { data: lessons = [], isLoading: lessonsLoading } = useGetInstrumentLessonsQuery(selectedInstrument);
  const [createLesson, { isLoading: creatingLesson }] = useCreateLessonMutation();
  const [updateLesson, { isLoading: updatingLesson }] = useUpdateLessonMutation();
  const [deleteLesson, { isLoading: deletingLesson }] = useDeleteLessonMutation();
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({
    instrumentType: "Begena" as InstrumentType,
    title: "",
    code: "",
    order: 0,
    isActive: true,
  });

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) {
      next.title = t("admin.classes.errors.titleRequired", "Class title is required.");
    }
    if (form.capacity && Number(form.capacity) < 0) {
      next.capacity = t("admin.classes.errors.capacityInvalid", "Capacity must be zero or higher.");
    }
    if (form.tuition && Number(form.tuition) < 0) {
      next.tuition = t("admin.classes.errors.tuitionInvalid", "Tuition must be zero or higher.");
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    const payload = {
      title: form.title,
      description: form.description || undefined,
      classType: form.classType || "online",
      instructorId: form.instructorId || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      capacity: form.capacity ? Number(form.capacity) : undefined,
      tuition: form.tuition ? Number(form.tuition) : undefined,
      currency: form.currency || undefined,
      enrollmentDeadline: form.enrollmentDeadline || undefined,
    };
    try {
      if (editingId) {
        await updateClass({ id: editingId, data: payload }).unwrap();
        pushToast({
          title: t("admin.classes.toast.updated", "Class updated"),
          variant: "success",
        });
      } else {
        await createClass(payload).unwrap();
        pushToast({
          title: t("admin.classes.toast.created", "Class created"),
          variant: "success",
        });
      }
      setForm(emptyForm);
      setEditingId(null);
      setFieldErrors({});
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("admin.classes.toast.error", "Unable to save class"),
        description: t("admin.classes.toast.errorDesc", "Please verify the form and try again."),
        variant: "error",
      });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startEdit = (klass: any) => {
    setEditingId(klass._id);
    setShowForm(true);
    setForm({
      title: klass.title ?? "",
      description: klass.description ?? "",
      classType: klass.classType ?? "online",
      instructorId: klass.instructorId?._id ?? "",
      startDate: klass.startDate ? klass.startDate.slice(0, 10) : "",
      endDate: klass.endDate ? klass.endDate.slice(0, 10) : "",
      capacity: (klass.capacity ?? "").toString(),
      tuition: (klass.tuition ?? "").toString(),
      currency: klass.currency ?? "ETB",
      enrollmentDeadline: klass.enrollmentDeadline
        ? klass.enrollmentDeadline.slice(0, 10)
        : "",
    });
  };

  const clearForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFieldErrors({});
    setShowForm(false);
  };

  const handleAssign = async (classId: string, value: string) => {
    if (!value) return;
    try {
      await assignInstructor({ classId, instructorId: value }).unwrap();
      pushToast({
        title: t("admin.classes.toast.instructorUpdated", "Instructor updated"),
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("admin.classes.toast.instructorError", "Unable to assign instructor"),
        variant: "error",
      });
    }
  };

  const handleDelete = async (classId: string) => {
    if (
      !confirm(
        t(
          "admin.classes.confirmDelete",
          "Are you sure you want to delete this class? This action cannot be undone.",
        ),
      )
    ) {
      return;
    }
    try {
      await deleteClass(classId).unwrap();
      pushToast({
        title: t("admin.classes.toast.deleted", "Class removed"),
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("admin.classes.toast.deleteError", "Unable to delete class"),
        variant: "error",
      });
    }
  };

  const sortedClasses = useMemo(
    () => [...(classes ?? [])].sort((a, b) => a.title.localeCompare(b.title)),
    [classes],
  );

  const filteredClasses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return sortedClasses.filter((klass) => {
      if (viewFilter === "unassigned" && klass.instructorId) return false;
      if (viewFilter === "live" && !klass.isLive) return false;
      if (query) {
        const instructor =
          typeof klass.instructorId === "object" && klass.instructorId
            ? `${(klass.instructorId as any).firstName ?? ""} ${
                (klass.instructorId as any).lastName ?? ""
              }`
            : "";
        const haystack = `${klass.title} ${instructor}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [sortedClasses, searchTerm, viewFilter]);

  const stats = useMemo(() => {
    const total = sortedClasses.length;
    const live = sortedClasses.filter((klass) => klass.isLive).length;
    const unassigned = sortedClasses.filter((klass) => !klass.instructorId).length;
    const online = sortedClasses.filter((klass) => klass.classType === "online").length;
    const physical = sortedClasses.filter((klass) => klass.classType === "physical").length;
    const both = sortedClasses.filter((klass) => klass.classType === "both").length;
    return { total, live, unassigned, online, physical, both };
  }, [sortedClasses]);

  const [showForm, setShowForm] = useState(false);

  // Lesson handlers
  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonForm.title.trim()) {
      pushToast({
        title: t("admin.lessons.error", "Error"),
        description: t("admin.lessons.titleRequired", "Lesson title is required"),
        variant: "error",
      });
      return;
    }

    try {
      if (editingLessonId) {
        await updateLesson({
          id: editingLessonId,
          title: lessonForm.title,
          code: lessonForm.code || undefined,
          order: lessonForm.order,
          isActive: lessonForm.isActive,
        }).unwrap();
        pushToast({
          title: t("admin.lessons.updated", "Lesson updated"),
          variant: "success",
        });
      } else {
        await createLesson({
          instrumentType: lessonForm.instrumentType,
          title: lessonForm.title,
          code: lessonForm.code || undefined,
          order: lessonForm.order,
        }).unwrap();
        pushToast({
          title: t("admin.lessons.created", "Lesson created"),
          variant: "success",
        });
      }
      setShowLessonModal(false);
      setEditingLessonId(null);
      setLessonForm({
        instrumentType: selectedInstrument,
        title: "",
        code: "",
        order: 0,
        isActive: true,
      });
    } catch (error: any) {
      pushToast({
        title: t("admin.lessons.error", "Error"),
        description: error?.data?.message || t("admin.lessons.errorDesc", "Unable to save lesson"),
        variant: "error",
      });
    }
  };

  const startEditLesson = (lesson: any) => {
    setEditingLessonId(lesson._id);
    setLessonForm({
      instrumentType: lesson.instrumentType,
      title: lesson.title,
      code: lesson.code || "",
      order: lesson.order || 0,
      isActive: lesson.isActive !== false,
    });
    setShowLessonModal(true);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm(t("admin.lessons.confirmDelete", "Are you sure you want to delete this lesson?"))) {
      return;
    }
    try {
      await deleteLesson(lessonId).unwrap();
      pushToast({
        title: t("admin.lessons.deleted", "Lesson deleted"),
        variant: "success",
      });
    } catch (error: any) {
      pushToast({
        title: t("admin.lessons.error", "Error"),
        description: error?.data?.message || t("admin.lessons.deleteError", "Unable to delete lesson"),
        variant: "error",
      });
    }
  };

  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => lesson.instrumentType === selectedInstrument);
  }, [lessons, selectedInstrument]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, viewFilter]);

  useEffect(() => {
    setLessonsCurrentPage(1);
  }, [selectedInstrument]);

  // Calculate pagination for classes
  const classesTotalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  const classesStartIndex = (currentPage - 1) * itemsPerPage;
  const classesEndIndex = classesStartIndex + itemsPerPage;
  const paginatedClasses = filteredClasses.slice(classesStartIndex, classesEndIndex);

  // Calculate pagination for lessons
  const lessonsTotalPages = Math.ceil(filteredLessons.length / lessonsItemsPerPage);
  const lessonsStartIndex = (lessonsCurrentPage - 1) * lessonsItemsPerPage;
  const lessonsEndIndex = lessonsStartIndex + lessonsItemsPerPage;
  const paginatedLessons = filteredLessons.slice(lessonsStartIndex, lessonsEndIndex);

  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 sm:mb-6"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          {t("admin.classes.kicker", "Class Management")}
        </p>
        <h1 className="text-2xl font-serif text-primary sm:text-3xl md:text-4xl">
          {t("admin.classes.title", "Manage Classes")}
        </h1>
        <p className="mt-2 text-xs text-foreground/70 sm:text-sm">
          {t(
            "admin.classes.subtitle",
            "Create, edit, and manage all classes, instruments, and lessons.",
          )}
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("classes")}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === "classes"
              ? "border-b-2 border-primary text-primary"
              : "text-foreground/60 hover:text-foreground"
          }`}
        >
          {t("admin.classes.tabs.classes", "Classes")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("lessons")}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === "lessons"
              ? "border-b-2 border-primary text-primary"
              : "text-foreground/60 hover:text-foreground"
          }`}
        >
          {t("admin.classes.tabs.lessons", "Instruments & Lessons")}
        </button>
      </div>

      {/* Classes Tab */}
      {activeTab === "classes" && (
        <>
      {/* Summary View */}
      {!showForm && !editingId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-surface-elevated p-4 shadow-lg">
              <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">
                {t("admin.classes.stats.total", "Total Classes")}
              </p>
              <p className="mt-1 text-2xl font-serif text-primary">{stats.total}</p>
            </div>
            <div className="rounded-2xl bg-surface-elevated p-4 shadow-lg">
              <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">
                {t("admin.classes.stats.live", "Live Classes")}
              </p>
              <p className="mt-1 text-2xl font-serif text-primary">{stats.live}</p>
            </div>
            <div className="rounded-2xl bg-surface-elevated p-4 shadow-lg">
              <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">
                {t("admin.classes.stats.unassigned", "Unassigned")}
              </p>
              <p className="mt-1 text-2xl font-serif text-primary">{stats.unassigned}</p>
            </div>
            <div className="rounded-2xl bg-surface-elevated p-4 shadow-lg">
              <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">
                {t("admin.classes.stats.online", "Online Only")}
              </p>
              <p className="mt-1 text-2xl font-serif text-primary">{stats.online}</p>
            </div>
            <div className="rounded-2xl bg-surface-elevated p-4 shadow-lg">
              <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">
                {t("admin.classes.stats.physical", "Physical Only")}
              </p>
              <p className="mt-1 text-2xl font-serif text-primary">{stats.physical}</p>
            </div>
            <div className="rounded-2xl bg-surface-elevated p-4 shadow-lg">
              <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">
                {t("admin.classes.stats.both", "Both Types")}
              </p>
              <p className="mt-1 text-2xl font-serif text-primary">{stats.both}</p>
            </div>
          </div>

          {/* Action Buttons removed (not used) */}

          {/* Classes List */}
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("admin.classes.search", "Search classes...")}
                  className="rounded-2xl border border-border bg-surface-elevated px-4 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                />
                <select
                  value={viewFilter}
                  onChange={(e) => setViewFilter(e.target.value as "all" | "unassigned" | "live")}
                  className="rounded-2xl border border-border bg-surface-elevated px-4 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 shadow-sm"
                >
                  <option value="all">{t("admin.classes.filter.all", "All Classes")}</option>
                  <option value="live">{t("admin.classes.filter.live", "Live Only")}</option>
                  <option value="unassigned">{t("admin.classes.filter.unassigned", "Unassigned")}</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex min-h-[200px] items-center justify-center rounded-3xl bg-surface-elevated shadow-lg">
                <Loader2 className="h-6 w-6 animate-spin text-secondary" />
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="rounded-3xl bg-surface-elevated p-10 text-center text-sm text-foreground/70 shadow-lg">
                {t("admin.classes.empty", "No classes found.")}
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-end gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                    {t("pagination.itemsPerPage", "Items per page")}:
                  </label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="space-y-3">
                  {paginatedClasses.map((klass) => (
                  <motion.div
                    key={klass._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3 rounded-2xl bg-surface-elevated p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-serif text-primary">{klass.title}</h3>
                        {klass.isLive && (
                          <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs font-semibold text-green-500">
                            {t("admin.classes.live", "Live")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-foreground/70">{klass.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground/60">
                        <span>{t("admin.classes.type", "Type")}: {klass.classType}</span>
                        {klass.instructorId && typeof klass.instructorId === "object" && (
                          <span>
                            {t("admin.classes.instructor", "Instructor")}:{" "}
                            {(klass.instructorId as any).firstName} {(klass.instructorId as any).lastName}
                          </span>
                        )}
                        {!klass.instructorId && (
                          <span className="text-amber-500">{t("admin.classes.noInstructor", "No instructor")}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          startEdit(klass);
                          setShowForm(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-2 text-xs font-semibold text-secondary transition hover:bg-secondary/20"
                      >
                        <Edit className="h-3 w-3" />
                        {t("button.edit", "Edit")}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(klass._id)}
                        className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-500/20"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t("button.delete", "Delete")}
                      </motion.button>
                    </div>
                  </motion.div>
                  ))}
                </div>
                {classesTotalPages > 1 && (
                  <div className="mt-6">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={classesTotalPages}
                      totalItems={filteredClasses.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
        </>
      )}

      {/* Lessons Tab */}
      {activeTab === "lessons" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Instrument Selector */}
          <div className="rounded-2xl bg-surface-elevated p-4 shadow-lg">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
              {t("admin.lessons.selectInstrument", "Select Instrument")}
            </label>
            <div className="flex flex-wrap gap-2">
              {INSTRUMENTS.map((instrument) => (
                <button
                  key={instrument}
                  type="button"
                  onClick={() => {
                    setSelectedInstrument(instrument);
                    setLessonForm((prev) => ({ ...prev, instrumentType: instrument }));
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selectedInstrument === instrument
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-secondary/10"
                  }`}
                >
                  <Music className="mr-2 inline h-4 w-4" />
                  {instrument}
                </button>
              ))}
            </div>
          </div>

          {/* Add Lesson Button */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-serif text-primary">
                {t("admin.lessons.title", `Lessons for ${selectedInstrument}`)}
              </h2>
              <p className="text-xs text-foreground/70 mt-1">
                {t("admin.lessons.subtitle", `Manage lessons for ${selectedInstrument} students`)}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setEditingLessonId(null);
                setLessonForm({
                  instrumentType: selectedInstrument,
                  title: "",
                  code: "",
                  order: filteredLessons.length,
                  isActive: true,
                });
                setShowLessonModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:brightness-95"
            >
              <Plus className="h-4 w-4" />
              {t("admin.lessons.addLesson", "Add Lesson")}
            </motion.button>
          </div>

          {/* Lessons List */}
          {lessonsLoading ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-3xl bg-surface-elevated shadow-lg">
              <Loader2 className="h-6 w-6 animate-spin text-secondary" />
            </div>
          ) : filteredLessons.length === 0 ? (
            <div className="rounded-3xl bg-surface-elevated p-10 text-center text-sm text-foreground/70 shadow-lg">
              {t("admin.lessons.empty", `No lessons found for ${selectedInstrument}.`)}
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-end gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                  {t("pagination.itemsPerPage", "Items per page")}:
                </label>
                <select
                  value={lessonsItemsPerPage}
                  onChange={(e) => {
                    setLessonsItemsPerPage(Number(e.target.value));
                    setLessonsCurrentPage(1);
                  }}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="space-y-3">
                {paginatedLessons
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((lesson) => (
                  <motion.div
                    key={lesson._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3 rounded-2xl bg-surface-elevated p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-serif text-primary">{lesson.title}</h3>
                        {lesson.code && (
                          <span className="rounded-full bg-secondary/10 px-2 py-1 text-xs font-semibold text-secondary">
                            {lesson.code}
                          </span>
                        )}
                        {!lesson.isActive && (
                          <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs font-semibold text-red-500">
                            {t("admin.lessons.inactive", "Inactive")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-foreground/60">
                        {t("admin.lessons.order", "Order")}: {lesson.order || 0}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => startEditLesson(lesson)}
                        className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-2 text-xs font-semibold text-secondary transition hover:bg-secondary/20"
                      >
                        <Edit className="h-3 w-3" />
                        {t("button.edit", "Edit")}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeleteLesson(lesson._id)}
                        disabled={deletingLesson}
                        className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-500/20 disabled:opacity-60"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t("button.delete", "Delete")}
                      </motion.button>
                    </div>
                  </motion.div>
                  ))}
              </div>
              {lessonsTotalPages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={lessonsCurrentPage}
                    totalPages={lessonsTotalPages}
                    totalItems={filteredLessons.length}
                    itemsPerPage={lessonsItemsPerPage}
                    onPageChange={setLessonsCurrentPage}
                  />
                </div>
              )}
            </>
          )}

          {/* Lesson Modal */}
          {showLessonModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md rounded-3xl bg-surface-elevated p-6 shadow-2xl"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-serif text-primary">
                    {editingLessonId
                      ? t("admin.lessons.editLesson", "Edit Lesson")
                      : t("admin.lessons.newLesson", "New Lesson")}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLessonModal(false);
                      setEditingLessonId(null);
                    }}
                    className="rounded-full p-1 hover:bg-background/60"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleLessonSubmit} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                      {t("admin.lessons.form.instrument", "Instrument")} *
                    </label>
                    <select
                      value={lessonForm.instrumentType}
                      onChange={(e) =>
                        setLessonForm((prev) => ({
                          ...prev,
                          instrumentType: e.target.value as InstrumentType,
                        }))
                      }
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                      required
                    >
                      {INSTRUMENTS.map((instrument) => (
                        <option key={instrument} value={instrument}>
                          {instrument}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                      {t("admin.lessons.form.title", "Title")} *
                    </label>
                    <input
                      type="text"
                      value={lessonForm.title}
                      onChange={(e) =>
                        setLessonForm((prev) => ({ ...prev, title: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                      required
                      placeholder={t("admin.lessons.form.titlePlaceholder", "Lesson title")}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                      {t("admin.lessons.form.code", "Code")}
                    </label>
                    <input
                      type="text"
                      value={lessonForm.code}
                      onChange={(e) =>
                        setLessonForm((prev) => ({ ...prev, code: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                      placeholder={t("admin.lessons.form.codePlaceholder", "Lesson code (optional)")}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                      {t("admin.lessons.form.order", "Order")}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={lessonForm.order}
                      onChange={(e) =>
                        setLessonForm((prev) => ({
                          ...prev,
                          order: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                    />
                  </div>
                  {editingLessonId && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={lessonForm.isActive}
                        onChange={(e) =>
                          setLessonForm((prev) => ({ ...prev, isActive: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-border"
                      />
                      <label htmlFor="isActive" className="text-sm text-foreground/70">
                        {t("admin.lessons.form.active", "Active")}
                      </label>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <motion.button
                      type="submit"
                      whileTap={{ scale: 0.97 }}
                      disabled={creatingLesson || updatingLesson}
                      className="flex-1 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:brightness-95 disabled:opacity-60"
                    >
                      {creatingLesson || updatingLesson ? (
                        <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                      ) : editingLessonId ? (
                        t("admin.lessons.form.update", "Update Lesson")
                      ) : (
                        t("admin.lessons.form.create", "Create Lesson")
                      )}
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setShowLessonModal(false);
                        setEditingLessonId(null);
                      }}
                      className="flex-1 rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary/10"
                    >
                      {t("button.cancel", "Cancel")}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}

      {/* Form View */}
      {(showForm || editingId) && (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <motion.form
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleSubmit}
            className="space-y-3 rounded-2xl bg-surface-elevated p-4 shadow-lg sm:rounded-3xl sm:p-6"
          >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">
                {editingId
                  ? t("admin.classes.editClass", "Edit Class")
                  : t("admin.classes.createClass", "Create Class")}
              </p>
              <h2 className="text-lg font-serif text-primary sm:text-xl">
                {editingId
                  ? t("admin.classes.updateDetails", "Update details")
                  : t("admin.classes.newCohort", "New cohort")}
              </h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={clearForm}
                className="text-xs uppercase tracking-[0.3em] text-secondary hover:underline"
              >
                {t("button.reset", "Reset")}
              </button>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
              {t("admin.classes.form.title", "Title")}
            </label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder={t("admin.classes.form.titlePlaceholder", "Class title")}
              className={`w-full rounded-2xl border px-4 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 ${
                fieldErrors.title ? "border-red-400" : "border-border"
              } card-elevated70`}
            />
            {fieldErrors.title && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.title}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
              {t("admin.classes.form.description", "Description")}
            </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t("admin.classes.form.descriptionPlaceholder", "Class description")}
            rows={3}
              className="w-full rounded-2xl  card-elevated70 px-4 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
          />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
              {t("admin.classes.form.classType", "Class Type")}
            </label>
            <select
              value={form.classType}
              onChange={(e) => setForm((prev) => ({ ...prev, classType: e.target.value as "online" | "physical" | "both" }))}
              className="w-full rounded-2xl card-elevated70 px-4 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            >
              <option value="online">{t("admin.classes.form.online", "Online")}</option>
              <option value="physical">{t("admin.classes.form.physical", "Physical")}</option>
              <option value="both">{t("admin.classes.form.both", "Both (Online & Physical)")}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
              {t("admin.classes.form.instructor", "Instructor")}
            </label>
          <select
            value={form.instructorId}
            onChange={(e) => setForm((prev) => ({ ...prev, instructorId: e.target.value }))}
              className="w-full rounded-2xl  card-elevated70 px-4 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
          >
              <option value="">{t("admin.classes.form.assignInstructor", "Assign instructor")}</option>
            {teachers.map((teacher) => (
              <option key={teacher._id ?? teacher.id} value={teacher._id ?? teacher.id}>
                {teacher.firstName} {teacher.lastName}
              </option>
            ))}
          </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("admin.classes.form.startDate", "Start Date")}
              </label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full rounded-2xl  card-elevated70 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("admin.classes.form.endDate", "End Date")}
              </label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full rounded-2xl  card-elevated70 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("admin.classes.form.deadline", "Enrollment Deadline")}
              </label>
            <input
              type="date"
              value={form.enrollmentDeadline}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, enrollmentDeadline: e.target.value }))
              }
                className="w-full rounded-2xl  card-elevated70 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("admin.classes.form.capacity", "Capacity")}
              </label>
              <input
                type="number"
                min={0}
                value={form.capacity}
                onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}
                placeholder={t("admin.classes.form.capacityPlaceholder", "Max students")}
                className={`w-full rounded-2xl  card-elevated70 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 ${
                  fieldErrors.capacity ? "border-red-400" : ""
                }`}
              />
              {fieldErrors.capacity && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.capacity}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("admin.classes.form.tuition", "Tuition")}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.tuition}
                onChange={(e) => setForm((prev) => ({ ...prev, tuition: e.target.value }))}
                placeholder={t("admin.classes.form.tuitionPlaceholder", "Amount")}
                className={`w-full rounded-2xl  card-elevated70 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 ${
                  fieldErrors.tuition ? "border-red-400" : ""
                }`}
              />
              {fieldErrors.tuition && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.tuition}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("admin.classes.form.currency", "Currency")}
              </label>
            <select
              value={form.currency}
              onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                className="w-full rounded-2xl  card-elevated70 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            >
              <option value="ETB">ETB</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          </div>
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-95"
          >
            {editingId
              ? t("admin.classes.form.save", "Save class")
              : t("admin.classes.form.create", "Create class")}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={clearForm}
            className="w-full rounded-full border border-border bg-surface-elevated px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-secondary/10"
          >
            {t("button.cancel", "Cancel")}
          </motion.button>
        </motion.form>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl bg-surface-elevated p-4 shadow-lg sm:rounded-3xl sm:p-6"
        >
          <h2 className="text-lg font-serif text-primary sm:text-xl">
            {t("admin.classes.classesList", "Classes")}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl /70 card-elevated60 p-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">
                {t("admin.classes.stats.total", "Total")}
              </p>
              <p className="text-2xl font-serif text-primary">{stats.total}</p>
            </div>
            <div className="rounded-2xl /70 card-elevated60 p-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">
                {t("admin.classes.stats.live", "Live")}
              </p>
              <p className="text-2xl font-serif text-primary">{stats.live}</p>
            </div>
            <div className="rounded-2xl /70 card-elevated60 p-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">
                {t("admin.classes.stats.unassigned", "Unassigned")}
              </p>
              <p className="text-2xl font-serif text-primary">{stats.unassigned}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {(["all", "unassigned", "live"] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setViewFilter(filterKey)}
                  className={`rounded-full px-3 py-1 tracking-wide transition ${
                    viewFilter === filterKey
                      ? "bg-secondary text-secondary-foreground"
                      : "card-elevated60 text-foreground/70 hover:bg-background"
                  }`}
                >
                  {filterKey === "all"
                    ? t("admin.classes.filters.all", "All")
                    : filterKey === "unassigned"
                      ? t("admin.classes.filters.unassigned", "Unassigned")
                      : t("admin.classes.filters.live", "Live")}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("admin.classes.searchPlaceholder", "Search by title or instructor")}
              className="w-full rounded-2xl  card-elevated70 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 sm:max-w-xs"
            />
          </div>
          {isLoading ? (
            <div className="mt-4 flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-secondary" />
            </div>
          ) : filteredClasses.length ? (
            <>
              <div className="mt-4 mb-4 flex items-center justify-end gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                  {t("pagination.itemsPerPage", "Items per page")}:
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="mt-4 space-y-3">
                {paginatedClasses.map((klass, index) => (
              <motion.div
                key={klass._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl /70 card-elevated50 p-4 transition hover:card-elevated80 hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-primary sm:text-lg">{klass.title}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary/70 mt-1">
                      {klass.instructorId
                        ? `${klass.instructorId.firstName ?? ""} ${klass.instructorId.lastName ?? ""}`
                        : t("admin.classes.unassigned", "Unassigned")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => startEdit(klass)}
                      className="inline-flex items-center gap-1 rounded-full  bg-background px-3 py-1.5 transition hover:bg-secondary/10"
                    >
                      <Edit className="h-3 w-3" />
                      {t("button.edit", "Edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(klass._id)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-red-600 transition hover:bg-red-500/20"
                    >
                      <Trash2 className="h-3 w-3" />
                      {t("button.delete", "Delete")}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-foreground/70 line-clamp-2">
                  {klass.description || "No description"}
                </p>
                <div className="mt-3 grid gap-2 text-xs text-foreground/60 md:grid-cols-3">
                  <span>
                    Start:{" "}
                    {klass.startDate
                      ? new Date(klass.startDate).toLocaleDateString()
                      : "TBD"}
                  </span>
                  <span>
                    End:{" "}
                    {klass.endDate
                      ? new Date(klass.endDate).toLocaleDateString()
                      : "TBD"}
                  </span>
                  <span>Capacity: {klass.capacity ?? "∞"}</span>
                  <span>
                    Tuition:{" "}
                    {klass.tuition
                      ? `${klass.tuition.toLocaleString()} ${klass.currency ?? "ETB"}`
                      : "Free"}
                  </span>
                  <span>
                    Enrollment deadline:{" "}
                    {klass.enrollmentDeadline
                      ? new Date(klass.enrollmentDeadline).toLocaleDateString()
                      : "Rolling"}
                  </span>
                </div>
                <select
                  value={klass.instructorId?._id ?? ""}
                  onChange={(e) => handleAssign(klass._id, e.target.value)}
                  className="mt-3 w-full rounded-2xl  card-elevated70 px-3 py-2 text-xs"
                >
                  <option value="">Assign/Change instructor</option>
                  {teachers.map((teacher) => (
                    <option
                      key={teacher._id ?? teacher.id}
                      value={teacher._id ?? teacher.id}
                    >
                      {teacher.firstName} {teacher.lastName}
                    </option>
                  ))}
                </select>
              </motion.div>
              ))}
            </div>
            {classesTotalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={classesTotalPages}
                  totalItems={filteredClasses.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
            </>
          ) : (
            <div className="mt-6 rounded-3xl  card-elevated70 p-6 text-center text-sm text-foreground/70">
              {searchTerm || viewFilter !== "all"
                ? t(
                    "admin.classes.emptyFiltered",
                    "No classes match these filters. Adjust search or reset filters.",
                  )
                : t(
                    "admin.classes.empty",
                    "No classes created yet. Use the form to create your first cohort.",
                  )}
            </div>
          )}
        </motion.div>
        </div>
      )}
    </section>
  );
}

