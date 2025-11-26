"use client";

import { useMemo, useState } from "react";
import {
  useAssignClassInstructorMutation,
  useCreateManagedClassMutation,
  useDeleteManagedClassMutation,
  useGetManagedClassesQuery,
  useUpdateManagedClassMutation,
} from "@/store/api/adminApi";
import { useGetAllUsersQuery } from "@/store/api/userApi";
import { useToast } from "@/components/providers/ToastProvider";

const emptyForm = {
  title: "",
  description: "",
  instructorId: "",
  startDate: "",
  endDate: "",
  capacity: "",
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

  const teachers =
    users?.filter((user) => user.role === "Teacher" || user.role === "Admin") ?? [];

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) {
      next.title = "Class title is required.";
    }
    if (form.capacity && Number(form.capacity) < 0) {
      next.capacity = "Capacity must be zero or higher.";
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
    };
    try {
      if (editingId) {
        await updateClass({ id: editingId, data: payload }).unwrap();
        pushToast({ title: "Class updated", variant: "success" });
      } else {
        await createClass(payload).unwrap();
        pushToast({ title: "Class created", variant: "success" });
      }
      setForm(emptyForm);
      setEditingId(null);
      setFieldErrors({});
    } catch (error) {
      console.error(error);
      pushToast({
        title: "Unable to save class",
        description: "Please verify the form and try again.",
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
      pushToast({ title: "Instructor updated", variant: "success" });
    } catch (error) {
      console.error(error);
      pushToast({
        title: "Unable to assign instructor",
        variant: "error",
      });
    }
  };

  const handleDelete = async (classId: string) => {
    try {
      await deleteClass(classId).unwrap();
      pushToast({ title: "Class removed", variant: "success" });
    } catch (error) {
      console.error(error);
      pushToast({ title: "Unable to delete class", variant: "error" });
    }
  };

  const sortedClasses = useMemo(
    () => [...(classes ?? [])].sort((a, b) => a.title.localeCompare(b.title)),
    [classes],
  );

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-3xl border border-border bg-surface p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">
                {editingId ? "Edit Class" : "Create Class"}
              </p>
              <h2 className="text-xl font-serif text-primary">
                {editingId ? "Update details" : "New cohort"}
              </h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={clearForm}
                className="text-xs uppercase tracking-[0.3em] text-secondary"
              >
                Reset
              </button>
            )}
          </div>
          <div>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Title"
              className={`w-full rounded-2xl border px-4 py-2 text-sm outline-none focus:border-secondary ${
                fieldErrors.title ? "border-red-400" : "border-border"
              } bg-background/70`}
            />
            {fieldErrors.title && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.title}</p>
            )}
          </div>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Description"
            rows={3}
            className="w-full rounded-2xl border border-border bg-background/70 px-4 py-2 text-sm outline-none focus:border-secondary"
          />
          <select
            value={form.instructorId}
            onChange={(e) => setForm((prev) => ({ ...prev, instructorId: e.target.value }))}
            className="w-full rounded-2xl border border-border bg-background/70 px-4 py-2 text-sm outline-none focus:border-secondary"
          >
            <option value="">Assign instructor</option>
            {teachers.map((teacher) => (
              <option key={teacher._id ?? teacher.id} value={teacher._id ?? teacher.id}>
                {teacher.firstName} {teacher.lastName}
              </option>
            ))}
          </select>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
              className="rounded-2xl border border-border bg-background/70 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
              className="rounded-2xl border border-border bg-background/70 px-3 py-2 text-sm"
            />
            <div>
              <input
                type="number"
                min={0}
                value={form.capacity}
                onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}
                placeholder="Capacity"
                className={`w-full rounded-2xl border border-border bg-background/70 px-3 py-2 text-sm ${
                  fieldErrors.capacity ? "border-red-400" : ""
                }`}
              />
              {fieldErrors.capacity && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.capacity}</p>
              )}
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
          >
            {editingId ? "Save class" : "Create class"}
          </button>
        </form>
        <div className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="text-xl font-serif text-primary">Classes</h2>
          {isLoading ? (
            <p className="mt-4 text-sm text-foreground/60">Loading classes...</p>
          ) : sortedClasses.length ? (
            <div className="mt-4 space-y-3">
              {sortedClasses.map((klass) => (
              <div
                key={klass._id}
                className="rounded-2xl border border-border/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-primary">{klass.title}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                      {klass.instructorId
                        ? `${klass.instructorId.firstName ?? ""} ${klass.instructorId.lastName ?? ""}`
                        : "Unassigned"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => startEdit(klass)}
                      className="rounded-full border border-border px-3 py-1"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(klass._id)}
                      className="rounded-full border border-border px-3 py-1 text-red-500"
                    >
                      Delete
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
              </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-border bg-background/70 p-6 text-center text-sm text-foreground/70">
              No classes created yet. Use the form to create your first cohort.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

