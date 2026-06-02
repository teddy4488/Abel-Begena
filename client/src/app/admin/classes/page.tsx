"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Edit, Loader2, Trash2, Plus, X } from "lucide-react";
import {
  useAssignClassInstructorMutation,
  useCreateManagedClassMutation,
  useDeleteManagedClassMutation,
  useGetManagedClassesQuery,
  useUpdateManagedClassMutation,
  useGetTeachersQuery,
  type ManagedClass,
} from "@/store/api/adminApi";
import {
  useGetInstrumentLessonsQuery,
  useCreateLessonMutation,
  useUpdateLessonMutation,
  useDeleteLessonMutation,
  type InstrumentLesson,
} from "@/store/api/attendanceApi";
import type { InstrumentType } from "@/store/api/storeApi";
import { useGetBranchesAdminQuery } from "@/store/api/branchApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import Pagination from "@/components/ui/Pagination";
import ConfirmModal from "@/components/ui/ConfirmModal";
import OccupancyVisualizer from "@/components/admin/OccupancyVisualizer";

const INSTRUMENTS: InstrumentType[] = [
  "Begena",
  "Kirar",
  "Masinko",
  "Washint",
  "Kebero",
  "Other",
];

const emptyForm = {
  title: "",
  description: "",
  instrumentType: "Begena" as InstrumentType,
  level: "beginner" as "beginner" | "advanced",
  durationMonths: "" as "" | "3" | "6" | "9",
  classType: "online" as "online" | "physical" | "both",
  branchId: "",
  teacherIds: [] as string[],
  primaryInstructorId: "",
  startDate: "",
  endDate: "",
  tuition: "",
  currency: "ETB",
  enrollmentDeadline: "",
};

const SESSIONS_BY_DURATION: Record<string, number> = { "3": 5, "6": 3, "9": 2 };

export default function AdminClassesPage() {
  const { data: classes, isLoading } = useGetManagedClassesQuery();
  const { data: teachers = [] } = useGetTeachersQuery();
  const { data: branches = [] } = useGetBranchesAdminQuery();
  const [createClass, { isLoading: creatingClass }] =
    useCreateManagedClassMutation();
  const [updateClass, { isLoading: updatingClass }] =
    useUpdateManagedClassMutation();
  const [deleteClass, { isLoading: deletingClass }] = useDeleteManagedClassMutation();
  const [assignInstructor] = useAssignClassInstructorMutation();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<
    | { kind: "class"; id: string }
    | { kind: "lesson"; id: string }
    | null
  >(null);
  const { pushToast } = useToast();
  const { t } = useI18n();

  const formatMessage = (
    key: string,
    fallback: string,
    vars: Record<string, string | number>,
  ) => {
    const template = t(key, fallback);
    return Object.entries(vars).reduce(
      (acc, [token, value]) => acc.replace(`{{${token}}}`, String(value)),
      template,
    );
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [viewFilter, setViewFilter] = useState<"all" | "unassigned" | "live">(
    "all",
  );
  const [activeTab, setActiveTab] = useState<"classes" | "lessons" | "occupancy">("classes");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [lessonsCurrentPage, setLessonsCurrentPage] = useState(1);
  const [lessonsItemsPerPage, setLessonsItemsPerPage] = useState(10);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const selectedClass = useMemo(
    () => classes?.find((klass) => klass._id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );
  const { data: lessons = [], isLoading: lessonsLoading } =
    useGetInstrumentLessonsQuery(
      selectedClass ? { classId: selectedClass._id } : undefined,
    );
  const [createLesson, { isLoading: creatingLesson }] = useCreateLessonMutation();
  const [updateLesson, { isLoading: updatingLesson }] = useUpdateLessonMutation();
  const [deleteLesson, { isLoading: deletingLesson }] = useDeleteLessonMutation();
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({
    classId: "",
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
    if (
      (form.classType === "physical" || form.classType === "both") &&
      !form.branchId
    ) {
      next.branchId = t(
        "admin.classes.errors.branchRequired",
        "Branch is required for physical classes.",
      );
    }
    if (form.tuition && Number(form.tuition) < 0) {
      next.tuition = t("admin.classes.errors.tuitionInvalid", "Tuition must be zero or higher.");
    }
    if (!form.durationMonths) {
      next.durationMonths = t(
        "admin.classes.errors.durationRequired",
        "Choose a package duration.",
      );
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    // Primary defaults to the first selected teacher if not explicitly chosen.
    const primary =
      form.primaryInstructorId && form.teacherIds.includes(form.primaryInstructorId)
        ? form.primaryInstructorId
        : form.teacherIds[0];
    const payload = {
      title: form.title,
      description: form.description || undefined,
      instrumentType: form.instrumentType,
      level: form.level,
      durationMonths: form.durationMonths ? Number(form.durationMonths) : undefined,
      classType: form.classType || "online",
      branchId: form.branchId || undefined,
      teacherIds: form.teacherIds.length ? form.teacherIds : undefined,
      primaryInstructorId: primary || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      tuition: form.tuition ? Number(form.tuition) : undefined,
      currency: form.currency || undefined,
      enrollmentDeadline: form.enrollmentDeadline || undefined,
    };
    try {
      const result = editingId
        ? await updateClass({ id: editingId, data: payload }).unwrap()
        : await createClass(payload).unwrap();
      pushToast({
        title: editingId
          ? t("admin.classes.toast.updated", "Class updated")
          : t("admin.classes.toast.created", "Class created"),
        variant: "success",
      });
      // Surface non-blocking branch warnings from the server.
      const warnings = (result as { warnings?: string[] })?.warnings ?? [];
      warnings.forEach((w) =>
        pushToast({ title: t("admin.classes.warning", "Heads up"), description: w, variant: "default" }),
      );
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

  const startEdit = (klass: ManagedClass) => {
    setEditingId(klass._id);
    setShowForm(true);
    setForm({
      title: klass.title ?? "",
      description: klass.description ?? "",
      instrumentType: klass.instrumentType ?? "Begena",
      level: klass.level ?? "beginner",
      durationMonths: klass.durationMonths
        ? (String(klass.durationMonths) as "3" | "6" | "9")
        : "",
      classType: klass.classType ?? "online",
      branchId: (typeof klass.branchId === "string" ? klass.branchId : "") ?? "",
      teacherIds: klass.teacherIds ?? (klass.instructorId?._id ? [klass.instructorId._id] : []),
      primaryInstructorId: klass.primaryInstructorId ?? klass.instructorId?._id ?? "",
      startDate: klass.startDate ? klass.startDate.slice(0, 10) : "",
      endDate: klass.endDate ? klass.endDate.slice(0, 10) : "",
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

  const openConfirmDeleteClass = (classId: string) => {
    setConfirmTarget({ kind: "class", id: classId });
    setConfirmOpen(true);
  };

  const openConfirmDeleteLesson = (lessonId: string) => {
    setConfirmTarget({ kind: "lesson", id: lessonId });
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.kind === "class") {
        await deleteClass(confirmTarget.id).unwrap();
        pushToast({
          title: t("admin.classes.toast.deleted", "Class removed"),
          variant: "success",
        });
      } else {
        await deleteLesson(confirmTarget.id).unwrap();
        pushToast({
          title: t("admin.lessons.deleted", "Lesson deleted"),
          variant: "success",
        });
      }
    } catch (error) {
      console.error(error);
      pushToast({
        title:
          confirmTarget.kind === "class"
            ? t("admin.classes.toast.deleteError", "Unable to delete class")
            : t("admin.lessons.deleteError", "Unable to delete lesson"),
        variant: "error",
      });
    } finally {
      setConfirmOpen(false);
      setConfirmTarget(null);
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
          klass.instructorId
            ? `${klass.instructorId.firstName ?? ""} ${
                klass.instructorId.lastName ?? ""
              }`.trim()
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
      if (!lessonForm.classId) {
        pushToast({
          title: t("admin.lessons.error", "Error"),
          description: t("admin.lessons.classRequired", "Please choose a class"),
          variant: "error",
        });
        return;
      }

      if (editingLessonId) {
        await updateLesson({
          id: editingLessonId,
          classId: lessonForm.classId,
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
          classId: lessonForm.classId,
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
        classId: selectedClass?._id ?? "",
        title: "",
        code: "",
        order: 0,
        isActive: true,
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err && err.data
          ? (err.data as { message?: unknown }).message
          : undefined;
      pushToast({
        title: t("admin.lessons.error", "Error"),
        description:
          typeof message === "string" && message.length > 0
            ? message
            : t("admin.lessons.errorDesc", "Unable to save lesson"),
        variant: "error",
      });
    }
  };

  const startEditLesson = (lesson: InstrumentLesson) => {
    setEditingLessonId(lesson._id);
    setLessonForm({
      classId: lesson.classId ?? selectedClassId ?? "",
      title: lesson.title,
      code: lesson.code || "",
      order: lesson.order || 0,
      isActive: lesson.isActive !== false,
    });
    setShowLessonModal(true);
  };

  const handleDeleteLesson = (lessonId: string) => {
    openConfirmDeleteLesson(lessonId);
  };

  const filteredLessons = useMemo(() => {
    if (!selectedClassId) return [];
    return lessons.filter((lesson) => lesson.classId === selectedClassId);
  }, [lessons, selectedClassId]);

  // Reset pagination when filters/selection change.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, viewFilter]);

  useEffect(() => {
    setLessonsCurrentPage(1);
  }, [selectedClassId]);

  useEffect(() => {
    if (!selectedClassId && classes?.length) {
      setSelectedClassId(classes[0]._id);
      setLessonForm((prev) => ({ ...prev, classId: classes[0]._id }));
    }
  }, [classes, selectedClassId]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
          {t("admin.classes.kicker", "Curriculum & Cohorts")}
        </p>
        <h1 className="text-2xl font-serif text-primary sm:text-3xl md:text-4xl">
          {t("admin.classes.title", "Manage Classes & Lessons")}
        </h1>
        <p className="mt-2 text-xs text-foreground/70 sm:text-sm">
          {t(
            "admin.classes.subtitle",
            "Create classes and attach lessons students will access after enrollment.",
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
          {t("admin.classes.tabs.lessons", "Lessons")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("occupancy")}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === "occupancy"
              ? "border-b-2 border-primary text-primary"
              : "text-foreground/60 hover:text-foreground"
          }`}
        >
          {t("admin.classes.tabs.occupancy", "Occupancy")}
        </button>
      </div>

      {activeTab === "occupancy" && <OccupancyVisualizer />}

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

          {/* Actions */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-foreground/70">
              {t(
                "admin.classes.hint",
                "Use the button on the right to create a new class.",
              )}
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
                setFieldErrors({});
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 self-start rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-md transition hover:brightness-95"
            >
              <Plus className="h-3 w-3" />
              {t("admin.classes.newClass", "New Class")}
            </motion.button>
          </div>

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
              <div className="rounded-3xl bg-surface-elevated p-10 text-center text-sm text-foreground/70 shadow-lg space-y-4">
                <p>
                  {t(
                    "admin.classes.empty",
                    "No classes found.",
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                    setFieldErrors({});
                    setShowForm(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2 text-xs font-semibold text-primary-foreground shadow hover:brightness-95"
                >
                  <Plus className="h-3 w-3" />
                  {t("admin.classes.createFirst", "Create first class")}
                </button>
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
                        {klass.instructorId && (
                          <span>
                            {t("admin.classes.instructor", "Instructor")}:{" "}
                            {klass.instructorId.firstName ?? ""}{" "}
                            {klass.instructorId.lastName ?? ""}
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
                        onClick={() => openConfirmDeleteClass(klass._id)}
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
          {/* Class selector */}
          <div className="rounded-2xl bg-surface-elevated p-4 shadow-lg">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
              {t("admin.lessons.selectClass", "Select Class")}
            </label>
            <select
              value={selectedClassId ?? ""}
              onChange={(e) => {
                const value = e.target.value || null;
                setSelectedClassId(value);
                setLessonForm((prev) => ({ ...prev, classId: value ?? "" }));
              }}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
            >
              <option value="">
                {t("admin.lessons.selectClassPlaceholder", "Choose a class")}
              </option>
              {(classes ?? []).map((klass) => (
                <option key={klass._id} value={klass._id}>
                  {klass.title}
                </option>
              ))}
            </select>
          </div>

          {/* Add Lesson Button */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-serif text-primary">
                {selectedClass
                  ? formatMessage("admin.lessons.titleForClass", "Lessons for {{class}}", {
                      class: selectedClass.title,
                    })
                  : t("admin.lessons.title", "Lessons")}
              </h2>
              <p className="text-xs text-foreground/70 mt-1">
                {selectedClass
                  ? formatMessage(
                      "admin.lessons.subtitleForClass",
                      "Manage lessons for {{class}} students",
                      { class: selectedClass.title },
                    )
                  : t("admin.lessons.subtitle", "Choose a class to manage its lessons")}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (!selectedClass) {
                  pushToast({
                    title: t("admin.lessons.selectClassFirst", "Select a class"),
                    description: t(
                      "admin.lessons.selectClassFirstDesc",
                      "Please choose which class these lessons belong to.",
                    ),
                    variant: "error",
                  });
                  return;
                }
                setEditingLessonId(null);
                setLessonForm({
                  classId: selectedClass._id,
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
              {selectedClass
                ? formatMessage(
                    "admin.lessons.emptyForClass",
                    "No lessons found for {{class}} yet.",
                    { class: selectedClass.title },
                  )
                : t(
                    "admin.lessons.emptyNoClass",
                    "Select a class above to view or create its lessons.",
                  )}
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => {
                  setShowLessonModal(false);
                  setEditingLessonId(null);
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-md rounded-3xl bg-surface-elevated p-6 shadow-2xl"
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
                      {t("admin.lessons.form.class", "Class")} *
                    </label>
                    <select
                      value={lessonForm.classId}
                      onChange={(e) =>
                        setLessonForm((prev) => ({ ...prev, classId: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                      required
                    >
                      <option value="">{t("admin.lessons.selectClassPlaceholder", "Choose a class")}</option>
                      {(classes ?? []).map((klass) => (
                        <option key={klass._id} value={klass._id}>
                          {klass.title}
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

      {/* Course Tracks Tab removed
      {false && (
        <motion.div>
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-foreground/70">
                {t("admin.tracks.count", "Tracks")}:{" "}
                <span className="font-semibold text-primary">
                  {sortedTracks.length}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <label className="text-xs text-foreground/60">
                  {t("pagination.itemsPerPage", "Items per page")}
                </label>
                <select
                  value={tracksItemsPerPage}
                  onChange={(e) => {
                    setTracksItemsPerPage(Number(e.target.value));
                    setTracksCurrentPage(1);
                  }}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {paginatedTracks.map((track) => (
                <div
                  key={track._id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-serif text-primary">
                        {track.title}
                      </h3>
                      <span className="rounded-full bg-secondary/10 px-2 py-1 text-xs font-semibold text-secondary">
                        {track.instrumentType} · {track.level}
                      </span>
                      {!track.isActive && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs font-semibold text-amber-600">
                          {t("admin.tracks.inactive", "Inactive")}
                        </span>
                      )}
                    </div>
                    {track.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-foreground/70">
                        {track.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => startEditTrack(track)}
                      className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-2 text-xs font-semibold text-secondary transition hover:bg-secondary/20"
                    >
                      <Edit className="h-3 w-3" />
                      {t("button.edit", "Edit")}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDeleteTrack(track._id)}
                      className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-500/20"
                    >
                      <Trash2 className="h-3 w-3" />
                      {t("button.delete", "Delete")}
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>

            {tracksTotalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={tracksCurrentPage}
                  totalPages={tracksTotalPages}
                  totalItems={sortedTracks.length}
                  itemsPerPage={tracksItemsPerPage}
                  onPageChange={setTracksCurrentPage}
                />
              </div>
            )}
          </div>

          {showTrackModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowTrackModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-xl rounded-3xl bg-surface-elevated p-6 shadow-2xl"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-serif text-primary">
                    {editingTrackId
                      ? t("admin.tracks.edit", "Edit track")
                      : t("admin.tracks.create", "Create track")}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowTrackModal(false)}
                    className="rounded-full p-2 text-foreground/60 hover:bg-secondary/10 hover:text-foreground"
                    aria-label={t("button.close", "Close")}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleTrackSubmit} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                        {t("admin.tracks.form.instrument", "Instrument")}
                      </label>
                      <select
                        value={trackForm.instrumentType}
                        onChange={(e) =>
                          setTrackForm((prev) => ({
                            ...prev,
                            instrumentType: e.target.value as InstrumentType,
                          }))
                        }
                        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                      >
                        {INSTRUMENTS.map((inst) => (
                          <option key={inst} value={inst}>
                            {inst}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                        {t("admin.tracks.form.level", "Level")}
                      </label>
                      <select
                        value={trackForm.level}
                        onChange={(e) =>
                          setTrackForm((prev) => ({
                            ...prev,
                            level: e.target.value as "beginner" | "advanced",
                          }))
                        }
                        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                      >
                        <option value="beginner">
                          {t("admin.lessons.level.beginner", "Beginner")}
                        </option>
                        <option value="advanced">
                          {t("admin.lessons.level.advanced", "Advanced")}
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                      {t("admin.tracks.form.title", "Title")} *
                    </label>
                    <input
                      type="text"
                      value={trackForm.title}
                      onChange={(e) =>
                        setTrackForm((prev) => ({ ...prev, title: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                      required
                      placeholder={t("admin.tracks.form.titlePlaceholder", "Track title")}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                      {t("admin.tracks.form.description", "Description")}
                    </label>
                    <textarea
                      value={trackForm.description}
                      onChange={(e) =>
                        setTrackForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                      placeholder={t(
                        "admin.tracks.form.descriptionPlaceholder",
                        "Optional description",
                      )}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="trackIsActive"
                      checked={trackForm.isActive}
                      onChange={(e) =>
                        setTrackForm((prev) => ({
                          ...prev,
                          isActive: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-border"
                    />
                    <label htmlFor="trackIsActive" className="text-sm text-foreground/70">
                      {t("admin.tracks.form.active", "Active")}
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      type="submit"
                      whileTap={{ scale: 0.97 }}
                      disabled={creatingCourseTrack || updatingCourseTrack}
                      className="flex-1 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:brightness-95 disabled:opacity-60"
                    >
                      {creatingCourseTrack || updatingCourseTrack ? (
                        <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                      ) : editingTrackId ? (
                        t("admin.tracks.form.update", "Update track")
                      ) : (
                        t("admin.tracks.form.create", "Create track")
                      )}
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setShowTrackModal(false);
                        setEditingTrackId(null);
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
      */}

      {/* Form View */}
      {(showForm || editingId) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:items-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (!creatingClass && !updatingClass) {
                clearForm();
              }
            }}
          />
          <div className="relative z-10 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
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
            <div className="flex items-center gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={clearForm}
                  className="text-xs uppercase tracking-[0.3em] text-secondary hover:underline"
                >
                  {t("button.reset", "Reset")}
                </button>
              )}
              <button
                type="button"
                aria-label={t("button.close", "Close")}
                disabled={creatingClass || updatingClass}
                onClick={clearForm}
                className="rounded-full p-2 text-foreground/70 transition hover:bg-secondary/10 disabled:opacity-60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("admin.classes.form.instrument", "Instrument")}
              </label>
              <select
                value={form.instrumentType}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, instrumentType: e.target.value as InstrumentType }))
                }
                className="w-full rounded-2xl card-elevated70 px-4 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              >
                {INSTRUMENTS.map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("admin.classes.form.level", "Level")}
              </label>
              <select
                value={form.level}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, level: e.target.value as "beginner" | "advanced" }))
                }
                className="w-full rounded-2xl card-elevated70 px-4 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              >
                <option value="beginner">{t("admin.lessons.level.beginner", "Beginner")}</option>
                <option value="advanced">{t("admin.lessons.level.advanced", "Advanced")}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
              {t("admin.classes.form.duration", "Package Duration")} *
            </label>
            <select
              value={form.durationMonths}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  durationMonths: e.target.value as "" | "3" | "6" | "9",
                }))
              }
              className={`w-full rounded-2xl card-elevated70 px-4 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 ${
                fieldErrors.durationMonths ? "border border-red-400" : ""
              }`}
            >
              <option value="">{t("admin.classes.form.durationSelect", "Select duration")}</option>
              <option value="3">{t("admin.classes.form.duration3", "3 months · 5 sessions/week")}</option>
              <option value="6">{t("admin.classes.form.duration6", "6 months · 3 sessions/week")}</option>
              <option value="9">{t("admin.classes.form.duration9", "9 months · 2 sessions/week")}</option>
            </select>
            {fieldErrors.durationMonths && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.durationMonths}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
              {t("admin.classes.form.branch", "Branch")}
            </label>
            <select
              value={form.branchId}
              onChange={(e) => setForm((prev) => ({ ...prev, branchId: e.target.value }))}
              className={`w-full rounded-2xl card-elevated70 px-4 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 ${
                fieldErrors.branchId ? "border border-red-400" : ""
              }`}
            >
              <option value="">
                {t("admin.classes.form.branchOptional", "Select a branch (optional)")}
              </option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
            {fieldErrors.branchId && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.branchId}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
              {t("admin.classes.form.teachers", "Teachers")}
            </label>
            <div className="space-y-1 rounded-2xl card-elevated70 p-3">
              {teachers.length === 0 ? (
                <p className="text-xs text-foreground/50">
                  {t("admin.classes.form.noTeachers", "No teachers available.")}
                </p>
              ) : (
                teachers.map((teacher) => {
                  const tid = (teacher._id ?? teacher.id) as string;
                  const checked = form.teacherIds.includes(tid);
                  // Warn (visually) when this teacher isn't in the class's selected branch.
                  const teacherBranches = (
                    (teacher as { branchIds?: Array<string | { _id?: string }> }).branchIds ?? []
                  ).map((b) => (typeof b === "string" ? b : b?._id ?? ""));
                  const outOfBranch =
                    !!form.branchId && checked && !teacherBranches.includes(form.branchId);
                  return (
                    <div key={tid} className="flex items-center justify-between gap-2 py-1">
                      <label className="flex flex-1 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setForm((prev) => {
                              const nextIds = e.target.checked
                                ? [...prev.teacherIds, tid]
                                : prev.teacherIds.filter((x) => x !== tid);
                              return {
                                ...prev,
                                teacherIds: nextIds,
                                primaryInstructorId: nextIds.includes(prev.primaryInstructorId)
                                  ? prev.primaryInstructorId
                                  : nextIds[0] ?? "",
                              };
                            })
                          }
                          className="h-4 w-4 rounded border-border accent-secondary"
                        />
                        <span>
                          {teacher.firstName} {teacher.lastName}
                        </span>
                        {outOfBranch && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                            {t("admin.classes.form.outOfBranch", "Other branch")}
                          </span>
                        )}
                      </label>
                      {checked && (
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, primaryInstructorId: tid }))
                          }
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                            form.primaryInstructorId === tid
                              ? "bg-secondary text-primary-foreground"
                              : "bg-secondary/10 text-secondary hover:bg-secondary/20"
                          }`}
                        >
                          {form.primaryInstructorId === tid
                            ? t("admin.classes.form.primary", "Primary")
                            : t("admin.classes.form.makePrimary", "Make primary")}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
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
                      onClick={() => openConfirmDeleteClass(klass._id)}
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
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title={
          confirmTarget?.kind === "lesson"
            ? t("admin.lessons.confirmDeleteTitle", "Delete lesson?")
            : t("admin.classes.confirmDeleteTitle", "Delete class?")
        }
        description={
          confirmTarget?.kind === "lesson"
            ? t(
                "admin.lessons.confirmDelete",
                "Are you sure you want to delete this lesson? This action cannot be undone.",
              )
            : t(
                "admin.classes.confirmDelete",
                "Are you sure you want to delete this class? This action cannot be undone.",
              )
        }
        confirmLabel={t("button.delete", "Delete")}
        cancelLabel={t("button.cancel", "Cancel")}
        isLoading={
          confirmTarget?.kind === "lesson" ? deletingLesson : deletingClass
        }
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deletingLesson && !deletingClass) {
            setConfirmOpen(false);
            setConfirmTarget(null);
          }
        }}
      />
    </section>
  );
}

