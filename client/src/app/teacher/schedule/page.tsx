"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import {
  useCreateScheduleItemMutation,
  useDeleteScheduleItemMutation,
  useGetClassScheduleQuery,
  useGetClassesQuery,
  useUpdateScheduleItemMutation,
  type ClassScheduleItem,
} from "@/store/api/classApi";
import { Clock, Pencil, Trash2, Calendar, MapPin, FileText, AlertTriangle, X } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";

const formatDateInputValue = (iso?: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getConflictSet = (schedule: ClassScheduleItem[] | undefined) => {
  if (!schedule || schedule.length < 2) return new Set<string>();
  const normalized = schedule
    .map((item) => {
      const start = item.startTime ? new Date(item.startTime).getTime() : 0;
      const end = item.endTime
        ? new Date(item.endTime).getTime()
        : start + 60 * 60 * 1000;
      return { ...item, start, end };
    })
    .sort((a, b) => a.start - b.start);

  const conflicts = new Set<string>();
  for (let i = 1; i < normalized.length; i += 1) {
    if (normalized[i].start < normalized[i - 1].end) {
      conflicts.add(normalized[i]._id);
      conflicts.add(normalized[i - 1]._id);
    }
  }
  return conflicts;
};

export default function TeacherSchedulePage() {
  const { user } = useAppSelector((state) => state.auth);
  const { pushToast } = useToast();
  const { t } = useI18n();
  const { data: classes, isLoading } = useGetClassesQuery();
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [form, setForm] = useState({
    title: "",
    startTime: "",
    endTime: "",
    location: "",
    notes: "",
  });
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  const teacherClasses = useMemo(
    () =>
      (classes ?? []).filter(
        (klass) => klass.instructorId === user?._id || klass.instructorId === user?.id,
      ),
    [classes, user?._id, user?.id],
  );

  const hasSelection = Boolean(selectedClassId);

  const {
    data: schedule,
    isFetching: scheduleLoading,
    isError: scheduleError,
  } = useGetClassScheduleQuery(selectedClassId, {
    skip: !hasSelection,
  });

  const [createScheduleItem, { isLoading: isCreating }] =
    useCreateScheduleItemMutation();
  const [updateScheduleItem, { isLoading: isUpdating }] =
    useUpdateScheduleItemMutation();
  const [deleteScheduleItem, { isLoading: isDeleting }] =
    useDeleteScheduleItemMutation();

  const conflictingSessions = useMemo(
    () => getConflictSet(schedule),
    [schedule],
  );

  const [viewRange, setViewRange] = useState<"all" | "week" | "month">("all");

  const now = useMemo(() => new Date(), []);

  const upcomingThisWeek = useMemo(() => {
    if (!schedule) return 0;
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return schedule.filter((session) => {
      if (!session.startTime) return false;
      const start = new Date(session.startTime);
      return start >= now && start <= weekFromNow;
    }).length;
  }, [now, schedule]);

  const filteredSchedule = useMemo(() => {
    if (!schedule) return [];
    if (viewRange === "all") return schedule;

    const target = new Date();
    if (viewRange === "week") {
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return schedule.filter((session) => {
        if (!session.startTime) return false;
        const start = new Date(session.startTime);
        return start >= target && start <= weekFromNow;
      });
    }

    // month
    const currentMonth = target.getMonth();
    const currentYear = target.getFullYear();
    return schedule.filter((session) => {
      if (!session.startTime) return false;
      const start = new Date(session.startTime);
      return (
        start.getMonth() === currentMonth && start.getFullYear() === currentYear
      );
    });
  }, [schedule, viewRange]);

  const isBusy = isCreating || isUpdating || isDeleting;

  const resetForm = () => {
    setForm({
      title: "",
      startTime: "",
      endTime: "",
      location: "",
      notes: "",
    });
    setEditingSessionId(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasSelection) {
      pushToast({
        title: t("teacher.schedule.selectClass", "Select a class"),
        description: t("teacher.schedule.selectClassDesc", "Choose a class before saving a schedule entry."),
        variant: "error",
      });
      return;
    }
    if (!form.title.trim() || !form.startTime) {
      pushToast({
        title: t("teacher.schedule.missingDetails", "Missing details"),
        description: t("teacher.schedule.missingDetailsDesc", "A title and start time are required."),
        variant: "error",
      });
      return;
    }

    const payload = {
      title: form.title.trim(),
      startTime: new Date(form.startTime).toISOString(),
      endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
      location: form.location.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (editingSessionId) {
        await updateScheduleItem({
          classId: selectedClassId,
          sessionId: editingSessionId,
          payload,
        }).unwrap();
        pushToast({
          title: t("teacher.schedule.updated", "Schedule updated"),
          variant: "success",
        });
      } else {
        await createScheduleItem({
          classId: selectedClassId,
          payload,
        }).unwrap();
        pushToast({
          title: t("teacher.schedule.scheduled", "Session scheduled"),
          variant: "success",
        });
      }
      resetForm();
    } catch (err: any) {
      const serverMessage =
        err?.data?.message ??
        err?.error ??
        t("teacher.schedule.saveErrorDesc", "Please try again.");
      pushToast({
        title: t("teacher.schedule.saveError", "Unable to save schedule"),
        description: serverMessage,
        variant: "error",
      });
    }
  };

  const handleEdit = (session: ClassScheduleItem) => {
    setEditingSessionId(session._id);
    setForm({
      title: session.title ?? "",
      startTime: formatDateInputValue(session.startTime),
      endTime: formatDateInputValue(session.endTime),
      location: session.location ?? "",
      notes: session.notes ?? "",
    });
  };

  const handleDelete = async (sessionId: string) => {
    if (!selectedClassId) return;
    if (
      !confirm(
        t("teacher.schedule.confirmDelete", "Are you sure you want to delete this session?")
      )
    ) {
      return;
    }
    try {
      await deleteScheduleItem({ classId: selectedClassId, sessionId }).unwrap();
      pushToast({
        title: t("teacher.schedule.removed", "Session removed"),
        variant: "success",
      });
      if (editingSessionId === sessionId) {
        resetForm();
      }
    } catch {
      pushToast({
        title: t("teacher.schedule.removeError", "Unable to remove session"),
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          {t("teacher.schedule.kicker", "Class Scheduling")}
        </p>
        <h1 className="text-3xl font-serif text-primary">
          {t("teacher.schedule.title", "Schedule Classes")}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {t(
            "teacher.schedule.subtitle",
            "Create lesson plans, detect conflicts, and keep every rehearsal on time.",
          )}
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4 rounded-2xl bg-[var(--color-surface-elevated)] p-6 shadow-lg lg:col-span-1 dark:bg-[var(--color-surface-elevated)]"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-serif text-primary">
              {editingSessionId
                ? t("teacher.schedule.editSession", "Edit Session")
                : t("teacher.schedule.newSession", "New Session")}
            </h2>
            {editingSessionId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full p-1 hover:bg-background/50 transition"
                aria-label={t("teacher.schedule.cancel", "Cancel")}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2 block">
                {t("teacher.schedule.class", "Class")}
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  resetForm();
                }}
                className="w-full rounded-2xl bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)] px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              >
                <option value="">{t("teacher.schedule.chooseClass", "Choose a class...")}</option>
                {teacherClasses.map((klass) => (
                  <option key={klass._id} value={klass._id}>
                    {klass.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2 block">
                {t("teacher.schedule.titleLabel", "Title")}
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={t("teacher.schedule.titlePlaceholder", "e.g., Beginners rehearsal")}
                className="w-full rounded-2xl bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)] px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2 block">
                  {t("teacher.schedule.starts", "Starts")}
                </label>
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                  className="w-full rounded-2xl bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)] px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2 block">
                  {t("teacher.schedule.ends", "Ends")}
                </label>
                <input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                  className="w-full rounded-2xl bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)] px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2 block">
                {t("teacher.schedule.location", "Location / Link")}
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                placeholder={t("teacher.schedule.locationPlaceholder", "Studio, Zoom, etc.")}
                className="w-full rounded-2xl bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)] px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2 block">
                {t("teacher.schedule.notes", "Notes")}
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder={t("teacher.schedule.notesPlaceholder", "Reminders, expected materials, dress code...")}
                className="w-full rounded-2xl bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)] px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <motion.button
                type="submit"
                disabled={isBusy}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60 shadow-lg hover:shadow-xl transition"
              >
                {editingSessionId
                  ? isUpdating
                    ? t("teacher.schedule.updating", "Updating...")
                    : t("teacher.schedule.updateSession", "Update Session")
                  : isCreating
                    ? t("teacher.schedule.scheduling", "Scheduling...")
                    : t("teacher.schedule.saveSession", "Save Session")}
              </motion.button>
            </div>
          </form>
        </motion.div>

        {/* Schedule List */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4 rounded-2xl bg-[var(--color-surface-elevated)] p-6 shadow-lg lg:col-span-2 dark:bg-[var(--color-surface-elevated)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {t("teacher.schedule.schedule", "Schedule")}
              </p>
              <h2 className="text-xl font-serif text-primary">
                {hasSelection
                  ? t("teacher.schedule.upcomingSessions", "Upcoming sessions")
                  : t("teacher.schedule.selectClass", "Select a class")}
              </h2>
            </div>
            {hasSelection && (
              <div className="flex items-center gap-2 rounded-full bg-[var(--color-card-bg)] p-1 text-xs dark:bg-[var(--color-card-bg)]">
                {(["all", "week", "month"] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setViewRange(range)}
                    className={`rounded-full px-3 py-1 font-semibold uppercase tracking-wide transition ${
                      viewRange === range
                        ? "bg-secondary text-secondary-foreground shadow-sm"
                        : "text-foreground/70 hover:text-secondary"
                    }`}
                  >
                    {range === "all"
                      ? t("teacher.schedule.filters.all", "All")
                      : range === "week"
                        ? t("teacher.schedule.filters.week", "Next 7 days")
                        : t("teacher.schedule.filters.month", "This month")}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!hasSelection && (
            <div className="rounded-xl border border-dashed border-border bg-background/50 p-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
              <p className="text-sm text-foreground/70">
                {t("teacher.schedule.selectClassPrompt", "Choose a class to view and manage its schedule.")}
              </p>
            </div>
          )}

          {hasSelection && scheduleLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-secondary mb-3"></div>
                <p className="text-sm text-foreground/70">
                  {t("teacher.schedule.loading", "Loading schedule...")}
                </p>
              </div>
            </div>
          )}

          {hasSelection && scheduleError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
              {t("teacher.schedule.loadError", "Unable to load the schedule. Please try again later.")}
            </div>
          )}

          {hasSelection &&
            !scheduleLoading &&
            !scheduleError &&
            (schedule?.length ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-[var(--color-card-bg)] p-4 dark:bg-[var(--color-card-bg)]">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-secondary/70">
                      {t("teacher.schedule.stats.total", "Total sessions")}
                    </p>
                    <p className="mt-1 text-2xl font-serif text-primary">
                      {schedule.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[var(--color-card-bg)] p-4 dark:bg-[var(--color-card-bg)]">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-secondary/70">
                      {t("teacher.schedule.stats.week", "Next 7 days")}
                    </p>
                    <p className="mt-1 text-2xl font-serif text-primary">
                      {upcomingThisWeek}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[var(--color-card-bg)] p-4 dark:bg-[var(--color-card-bg)]">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-secondary/70">
                      {t("teacher.schedule.stats.conflicts", "Conflicts")}
                    </p>
                    <p className="mt-1 text-2xl font-serif text-primary">
                      {conflictingSessions.size}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                <AnimatePresence>
                    {filteredSchedule.length ? (
                      filteredSchedule.map((session, index) => {
                    const start = session.startTime
                      ? new Date(session.startTime)
                      : null;
                    const end = session.endTime ? new Date(session.endTime) : null;
                    const hasConflict = conflictingSessions.has(session._id);
                    return (
                      <motion.div
                        key={session._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex flex-col gap-3 rounded-xl border p-4 transition-all hover:shadow-md ${
                          hasConflict
                            ? "border-yellow-500/60 bg-yellow-500/5"
                            : "border-border bg-background/50"
                        }`}
                      >
                        <div className="flex flex-1 items-start gap-4">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                            hasConflict ? "bg-yellow-500/20" : "bg-secondary/10"
                          }`}>
                            {hasConflict ? (
                              <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            ) : (
                              <Clock className="h-5 w-5 text-secondary" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-primary">{session.title}</p>
                              {hasConflict && (
                                <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-yellow-600">
                                  {t("teacher.schedule.conflict", "Conflict")}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 space-y-1 text-sm text-foreground/70">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {start
                                    ? start.toLocaleString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "TBD"}
                                  {end
                                    ? ` → ${end.toLocaleTimeString(undefined, {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}`
                                    : ""}
                                </span>
                              </div>
                              {session.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>{session.location}</span>
                                </div>
                              )}
                              {session.notes && (
                                <div className="flex items-start gap-2">
                                  <FileText className="w-4 h-4 mt-0.5" />
                                  <span className="text-xs">{session.notes}</span>
                                </div>
                              )}
                            </div>
                            {hasConflict && (
                              <p className="mt-2 text-xs font-semibold text-yellow-600">
                                {t("teacher.schedule.conflictWarning", "Conflicts with another session. Consider adjusting times.")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-16">
                          <motion.button
                            type="button"
                            onClick={() => handleEdit(session)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-card-bg)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--color-card-hover)] transition dark:bg-[var(--color-card-bg)] dark:hover:bg-[var(--color-card-hover)]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {t("teacher.schedule.edit", "Edit")}
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={() => handleDelete(session._id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500/20 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t("teacher.schedule.remove", "Remove")}
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                      })
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-dashed border-border bg-background/40 p-10 text-center"
                      >
                        <p className="text-sm text-foreground/70">
                          {t(
                            "teacher.schedule.filters.empty",
                            "No sessions match this view. Try switching filters.",
                          )}
                        </p>
                      </motion.div>
                    )}
                </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-background/50 p-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
                <p className="text-sm text-foreground/70">
                  {t("teacher.schedule.noSessions", "No sessions scheduled yet. Use the form on the left to add your first entry.")}
                </p>
              </div>
            ))}
        </motion.div>
      </div>

      {/* My Classes Quick Select */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-[var(--color-surface-elevated)] p-6 shadow-lg dark:bg-[var(--color-surface-elevated)]"
      >
        <h2 className="mb-4 text-xl font-serif text-primary">
          {t("teacher.schedule.myClasses", "My Classes")}
        </h2>
        {isLoading ? (
          <p className="text-sm text-foreground/70">
            {t("teacher.schedule.loading", "Loading...")}
          </p>
        ) : teacherClasses.length === 0 ? (
          <p className="text-sm text-foreground/70">
            {t("teacher.schedule.noClasses", "No classes assigned.")}
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {teacherClasses.map((klass) => (
              <motion.button
                key={klass._id}
                type="button"
                onClick={() => {
                  setSelectedClassId(klass._id);
                  resetForm();
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  selectedClassId === klass._id
                    ? "border-secondary bg-secondary/10 text-secondary shadow-md"
                    : "border-border bg-background/50 text-primary hover:border-secondary/60 hover:shadow-sm"
                }`}
              >
                {klass.title}
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
