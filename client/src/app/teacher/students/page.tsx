"use client";

import { useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  useGetClassesQuery,
  useGetClassStudentsQuery,
} from "@/store/api/classApi";

export default function TeacherStudentsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { data: classes, isLoading: classesLoading } = useGetClassesQuery();
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const teacherClasses = useMemo(
    () =>
      (classes ?? []).filter(
        (klass) => klass.instructorId === user?._id || klass.instructorId === user?.id,
      ),
    [classes, user?._id, user?.id],
  );

  const hasSelection = Boolean(selectedClassId);

  const {
    data: roster,
    isFetching: rosterLoading,
    isError: rosterError,
  } = useGetClassStudentsQuery(selectedClassId, {
    skip: !hasSelection,
  });

  const students = roster?.students ?? [];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          Student Management
        </p>
        <h1 className="text-3xl font-serif text-primary">Enrolled Students</h1>
        <p className="mt-2 text-sm text-foreground/70">
          View class rosters, monitor enrollment status, and coordinate with the admin team for adjustments.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-6">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
            Filter by Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
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

        {classesLoading && (
          <p className="text-sm text-foreground/70">Loading your classes...</p>
        )}

        {!classesLoading && !teacherClasses.length && (
          <div className="rounded-xl border border-border bg-background/50 p-8 text-center">
            <p className="text-sm text-foreground/70">
              No classes have been assigned to you yet. Reach out to the admin team to be onboarded as an instructor.
            </p>
          </div>
        )}

        {!classesLoading && teacherClasses.length > 0 && !hasSelection && (
          <div className="rounded-xl border border-border bg-background/50 p-8 text-center">
            <p className="text-sm text-foreground/70">
              Select a class to view enrolled students.
            </p>
          </div>
        )}

        {hasSelection && (
          <div className="space-y-3">
            {rosterLoading && (
              <p className="text-sm text-foreground/70">
                Loading student roster...
              </p>
            )}

            {rosterError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
                Unable to load students for this class. Please try again.
              </div>
            )}

            {!rosterLoading && !rosterError && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                      {roster?.title ?? "Class"}
                    </p>
                    <p className="text-sm font-semibold text-primary">
                      {students.length} student{students.length === 1 ? "" : "s"} enrolled
                    </p>
                  </div>
                </div>

                {students.length === 0 ? (
                  <div className="rounded-xl border border-border bg-background/50 p-8 text-center text-sm text-foreground/70">
                    No students enrolled yet. Share the enrollment link or coordinate with Admin to invite learners.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {students.map((student) => (
                      <div
                        key={student._id}
                        className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-4"
                      >
                        <div>
                          <p className="font-semibold text-primary">
                            {[student.firstName, student.lastName].filter(Boolean).join(" ") ||
                              student.email}
                          </p>
                          <p className="text-xs text-foreground/70">{student.email}</p>
                          {student.enrolledAt && (
                            <p className="text-xs text-foreground/50">
                              Enrolled: {new Date(student.enrolledAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            student.status === "active"
                              ? "bg-green-500/10 text-green-600"
                              : student.status === "pending"
                                ? "bg-yellow-500/10 text-yellow-600"
                                : "bg-red-500/10 text-red-600"
                          }`}
                        >
                          {student.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

