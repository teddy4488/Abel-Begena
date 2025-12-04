"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Edit, Loader2, Trash2 } from "lucide-react";
import {
  useAssignClassInstructorMutation,
  useCreateManagedClassMutation,
  useDeleteManagedClassMutation,
  useGetManagedClassesQuery,
  useUpdateManagedClassMutation,
} from "@/store/api/adminApi";
import { useGetAllUsersQuery } from "@/store/api/userApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";

const emptyForm = {
  title: "",
  description: "",
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
  const { data: users } = useGetAllUsersQuery();
  const [createClass] = useCreateManagedClassMutation();
  const [updateClass] = useUpdateManagedClassMutation();
  const [deleteClass] = useDeleteManagedClassMutation();
  const [assignInstructor] = useAssignClassInstructorMutation();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { pushToast } = useToast();
  const { t } = useI18n();

  const teachers =
    users?.filter((user) => user.role === "Teacher" || user.role === "Admin") ?? [];

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
    setForm({
      title: klass.title ?? "",
      description: klass.description ?? "",
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
            "Create, edit, and manage all classes and courses.",
          )}
        </p>
      </motion.div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <motion.form
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-lg sm:rounded-3xl sm:p-6"
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
              } bg-background/70`}
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
              className="w-full rounded-2xl border border-border bg-background/70 px-4 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
          />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">
              {t("admin.classes.form.instructor", "Instructor")}
            </label>
          <select
            value={form.instructorId}
            onChange={(e) => setForm((prev) => ({ ...prev, instructorId: e.target.value }))}
              className="w-full rounded-2xl border border-border bg-background/70 px-4 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
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
                className="w-full rounded-2xl border border-border bg-background/70 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
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
                className="w-full rounded-2xl border border-border bg-background/70 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
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
                className="w-full rounded-2xl border border-border bg-background/70 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
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
                className={`w-full rounded-2xl border border-border bg-background/70 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 ${
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
                className={`w-full rounded-2xl border border-border bg-background/70 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30 ${
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
                className="w-full rounded-2xl border border-border bg-background/70 px-3 py-2 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
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
        </motion.form>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl border border-border bg-surface p-4 shadow-lg sm:rounded-3xl sm:p-6"
        >
          <h2 className="text-lg font-serif text-primary sm:text-xl">
            {t("admin.classes.classesList", "Classes")}
          </h2>
          {isLoading ? (
            <div className="mt-4 flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-secondary" />
            </div>
          ) : sortedClasses.length ? (
            <div className="mt-4 space-y-3">
              {sortedClasses.map((klass, index) => (
              <motion.div
                key={klass._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-border/70 bg-background/50 p-4 transition hover:bg-background/80 hover:shadow-sm"
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
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 transition hover:bg-secondary/10"
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
                  className="mt-3 w-full rounded-2xl border border-border bg-background/70 px-3 py-2 text-xs"
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
          ) : (
            <div className="mt-6 rounded-3xl border border-border bg-background/70 p-6 text-center text-sm text-foreground/70">
              No classes created yet. Use the form to create your first cohort.
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

