"use client";

import { useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  useCreateScheduleItemMutation,
  useDeleteScheduleItemMutation,
  useGetClassScheduleQuery,
  useGetClassesQuery,
  useUpdateScheduleItemMutation,
  type ClassScheduleItem,
} from "@/store/api/classApi";
import { Clock, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

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
        title: "Select a class",
        description: "Choose a class before saving a schedule entry.",
        variant: "error",
      });
      return;
    }
    if (!form.title.trim() || !form.startTime) {
      pushToast({
        title: "Missing details",
        description: "A title and start time are required.",
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
        pushToast({ title: "Schedule updated", variant: "success" });
      } else {
        await createScheduleItem({
          classId: selectedClassId,
          payload,
        }).unwrap();
        pushToast({ title: "Session scheduled", variant: "success" });
      }
      resetForm();
    } catch {
      pushToast({
        title: "Unable to save schedule",
        description: "Please try again.",
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
    try {
      await deleteScheduleItem({ classId: selectedClassId, sessionId }).unwrap();
      pushToast({ title: "Session removed", variant: "success" });
      if (editingSessionId === sessionId) {
        resetForm();
      }
    } catch {
      pushToast({
        title: "Unable to remove session",
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          Class Scheduling
        </p>
        <h1 className="text-3xl font-serif text-primary">Schedule Classes</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Create lesson plans, detect conflicts, and keep every rehearsal on time.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 lg:col-span-1">
          <h2 className="text-xl font-serif text-primary">
            {editingSessionId ? "Edit Session" : "New Session"}
          </h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  resetForm();
                }}
                className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
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
              <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Beginners rehearsal"
                className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  Starts
                </label>
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  Ends
                </label>
                <input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                Location / Link
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Studio, Zoom, etc."
                className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="Reminders, expected materials, dress code..."
                className="mt-2 w-full rounded-2xl border border-border bg-background/80 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isBusy}
                className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {editingSessionId
                  ? isUpdating
                    ? "Updating..."
                    : "Update Session"
                  : isCreating
                    ? "Scheduling..."
                    : "Save Session"}
              </button>
              {editingSessionId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                Schedule
              </p>
              <h2 className="text-xl font-serif text-primary">
                {hasSelection ? "Upcoming sessions" : "Select a class"}
              </h2>
            </div>
          </div>

          {!hasSelection && (
            <div className="rounded-xl border border-border bg-background/50 p-8 text-center text-sm text-foreground/70">
              Choose a class to view and manage its schedule.
            </div>
          )}

          {hasSelection && scheduleLoading && (
            <p className="text-sm text-foreground/70">Loading schedule...</p>
          )}

          {hasSelection && scheduleError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
              Unable to load the schedule. Please try again later.
            </div>
          )}

          {hasSelection &&
            !scheduleLoading &&
            !scheduleError &&
            (schedule?.length ? (
              <div className="space-y-3">
                {schedule.map((session) => {
                  const start = session.startTime
                    ? new Date(session.startTime).toLocaleString()
                    : "TBD";
                  const end = session.endTime
                    ? new Date(session.endTime).toLocaleString()
                    : null;
                  const hasConflict = conflictingSessions.has(session._id);
                  return (
                    <div
                      key={session._id}
                      className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                        hasConflict ? "border-yellow-500/60" : "border-border"
                      }`}
                    >
                      <div className="flex flex-1 items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                          <Clock className="h-5 w-5 text-secondary" />
                        </div>
                        <div>
                          <p className="font-semibold text-primary">{session.title}</p>
                          <p className="text-sm text-foreground/70">
                            {start}
                            {end ? ` → ${end}` : ""}
                          </p>
                          {session.location && (
                            <p className="text-xs text-foreground/60">
                              Location: {session.location}
                            </p>
                          )}
                          {session.notes && (
                            <p className="text-xs text-foreground/60">
                              {session.notes}
                            </p>
                          )}
                          {hasConflict && (
                            <p className="mt-1 text-xs font-semibold text-yellow-600">
                              Conflicts with another session. Consider adjusting times.
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(session)}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(session._id)}
                          className="inline-flex items-center gap-1 rounded-full border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-background/50 p-8 text-center text-sm text-foreground/70">
                No sessions scheduled yet. Use the form on the left to add your first entry.
              </div>
            ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-xl font-serif text-primary">My Classes</h2>
        {isLoading ? (
          <p className="text-sm text-foreground/70">Loading...</p>
        ) : teacherClasses.length === 0 ? (
          <p className="text-sm text-foreground/70">No classes assigned.</p>
        ) : (
          <div className="space-y-2">
            {teacherClasses.map((klass) => (
              <button
                key={klass._id}
                type="button"
                onClick={() => {
                  setSelectedClassId(klass._id);
                  resetForm();
                }}
                className={`w-full rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                  selectedClassId === klass._id
                    ? "border-secondary bg-secondary/10 text-secondary"
                    : "border-border bg-background/50 text-primary hover:border-secondary/60"
                }`}
              >
                {klass.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

