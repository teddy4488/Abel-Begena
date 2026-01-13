"use client";

import { useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  useGetClassesQuery,
  useGetClassStudentsQuery,
  useUpdateEnrollmentStatusMutation,
} from "@/store/api/classApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";

export default function TeacherStudentsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { data: classes, isLoading: classesLoading } = useGetClassesQuery();
  const { pushToast } = useToast();
  const { t } = useI18n();
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
  const [updateEnrollmentStatus, { isLoading: isUpdatingStatus }] =
    useUpdateEnrollmentStatusMutation();

  const students = roster?.students ?? [];
  const statusOptions: Array<"active" | "pending" | "withdrawn"> = [
    "active",
    "pending",
    "withdrawn",
  ];

  const handleStatusChange = async (
    studentId: string,
    status: "active" | "pending" | "withdrawn",
  ) => {
    if (!selectedClassId) {
      return;
    }
    try {
      await updateEnrollmentStatus({
        classId: selectedClassId,
        studentId,
        status,
      }).unwrap();
      pushToast({
        title: t("teacher.students.statusUpdated", "Enrollment updated"),
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      pushToast({
        title: t(
          "teacher.students.statusError",
          "Unable to update student status",
        ),
        variant: "error",
      });
    }
  };

  const statusStyles: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600",
    pending: "bg-amber-500/10 text-amber-600",
    withdrawn: "bg-rose-500/10 text-rose-500",
  };

  const formatAmount = (amount?: number | null, currency?: string | null) => {
    if (typeof amount !== "number" || Number.isNaN(amount)) {
      return null;
    }
    const labelCurrency = currency ?? "ETB";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: labelCurrency,
      }).format(amount);
    } catch {
      return `${amount.toLocaleString()} ${labelCurrency}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          {t("teacher.students.kicker", "Student Management")}
        </p>
        <h1 className="text-3xl font-serif text-primary">
          {t("teacher.students.title", "Enrolled Students")}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {t(
            "teacher.students.subtitle",
            "View class rosters, monitor enrollment status, and coordinate with the admin team for adjustments.",
          )}
        </p>
      </div>

      <div className="rounded-2xl  bg-[var(--color-surface-elevated)] dark:bg-[var(--color-surface-elevated)] p-6">
        <div className="mb-6">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
            {t("teacher.students.filter", "Filter by Class")}
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full rounded-2xl  bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)]80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
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
          <p className="text-sm text-foreground/70">
            {t("teacher.students.loadingClasses", "Loading your classes...")}
          </p>
        )}

        {!classesLoading && !teacherClasses.length && (
          <div className="rounded-xl  bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)]50 p-8 text-center">
            <p className="text-sm text-foreground/70">
              {t(
                "teacher.students.noClasses",
                "No classes have been assigned to you yet. Reach out to the admin team to be onboarded as an instructor.",
              )}
            </p>
          </div>
        )}

        {!classesLoading && teacherClasses.length > 0 && !hasSelection && (
          <div className="rounded-xl  bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)]50 p-8 text-center">
            <p className="text-sm text-foreground/70">
              {t(
                "teacher.students.selectPrompt",
                "Select a class to view enrolled students.",
              )}
            </p>
          </div>
        )}

        {hasSelection && (
          <div className="space-y-3">
            {rosterLoading && (
              <p className="text-sm text-foreground/70">
                {t(
                  "teacher.students.loadingRoster",
                  "Loading student roster...",
                )}
              </p>
            )}

            {rosterError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
                {t(
                  "teacher.students.error",
                  "Unable to load students for this class. Please try again.",
                )}
              </div>
            )}

            {!rosterLoading && !rosterError && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl /70 bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)]60 px-4 py-3">
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
                  <div className="rounded-xl  bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)]50 p-8 text-center text-sm text-foreground/70">
                    {t(
                      "teacher.students.empty",
                      "No students enrolled yet. Share the enrollment link or coordinate with Admin to invite learners.",
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {students.map((student) => (
                      <div
                        key={student._id}
                        className="flex flex-col gap-3 rounded-xl  bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)]50 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-primary">
                            {[student.firstName, student.lastName].filter(Boolean).join(" ") ||
                              student.email}
                          </p>
                          <p className="text-xs text-foreground/70">{student.email}</p>
                          {student.enrolledAt && (
                            <p className="text-xs text-foreground/50">
                              {t("teacher.students.enrolledAt", "Enrolled:")}{" "}
                              {new Date(student.enrolledAt).toLocaleDateString()}
                            </p>
                          )}
                          {(() => {
                            const amountLabel = formatAmount(
                              student.amountPaid,
                              student.currency,
                            );
                            if (!amountLabel) {
                              return null;
                            }
                            return (
                            <p className="text-xs text-foreground/60">
                              {t("teacher.students.amountPaid", "Amount paid")}:{" "}
                                {amountLabel}
                            </p>
                            );
                          })()}
                          {student.paymentMethod && (
                            <p className="text-xs text-foreground/60">
                              {t("teacher.students.paymentMethod", "Method")}:{" "}
                              {student.paymentMethod}
                            </p>
                          )}
                          {student.paymentReference && (
                            <p className="text-xs text-foreground/60">
                              {t("teacher.students.reference", "Reference")}:{" "}
                              {student.paymentReference}
                            </p>
                          )}
                          {student.note && (
                            <p className="text-xs text-foreground/60">
                              {t("teacher.students.note", "Note")}: {student.note}
                            </p>
                          )}
                          {student.fullName && (
                            <p className="text-xs text-foreground/60">
                              {t("teacher.students.fullName", "Intake name")}:{" "}
                              {student.fullName}
                            </p>
                          )}
                          {student.phone && (
                            <p className="text-xs text-foreground/60">
                              {t("teacher.students.phone", "Phone")}: {student.phone}
                            </p>
                          )}
                          {student.emergencyContactName && (
                            <p className="text-xs text-foreground/60">
                              {t(
                                "teacher.students.emergencyContactName",
                                "Emergency contact",
                              )}
                              : {student.emergencyContactName}
                            </p>
                          )}
                          {student.emergencyContactPhone && (
                            <p className="text-xs text-foreground/60">
                              {t(
                                "teacher.students.emergencyContactPhone",
                                "Emergency phone",
                              )}
                              : {student.emergencyContactPhone}
                            </p>
                          )}
                          {student.occupation && (
                            <p className="text-xs text-foreground/60">
                              {t("teacher.students.occupation", "Occupation")}:{" "}
                              {student.occupation}
                            </p>
                          )}
                          {(student.city || student.address) && (
                            <p className="text-xs text-foreground/60">
                              {t("teacher.students.location", "Location")}:{" "}
                              {[student.city, student.address]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          )}
                          {(student.preferredDaysPerWeek ||
                            student.preferredSchedule) && (
                            <p className="text-xs text-foreground/60">
                              {t(
                                "teacher.students.schedulePrefs",
                                "Preferred schedule",
                              )}
                              :{" "}
                              {[
                                student.preferredDaysPerWeek
                                  ? `${student.preferredDaysPerWeek} days/week`
                                  : null,
                                student.preferredSchedule,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                          {student.learningGoals && (
                            <p className="text-xs text-foreground/60">
                              {t(
                                "teacher.students.learningGoals",
                                "Learning goals",
                              )}
                              : {student.learningGoals}
                            </p>
                          )}
                          {student.notesForTeacher && (
                            <p className="text-xs text-foreground/60">
                              {t(
                                "teacher.students.notesForTeacher",
                                "Notes for teacher",
                              )}
                              : {student.notesForTeacher}
                            </p>
                          )}
                          {student.receiptUrl && (
                            <p className="text-xs text-foreground/60">
                              <a
                                href={student.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-secondary underline underline-offset-2"
                              >
                                {t(
                                  "teacher.students.receipt",
                                  "View payment receipt",
                                )}
                              </a>
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-start gap-2 text-xs md:items-end">
                          <span
                            className={`rounded-full px-3 py-1 font-semibold ${statusStyles[student.status] ?? "bg-secondary/20 text-secondary"}`}
                          >
                            {t(`classes.status.${student.status}`, student.status)}
                          </span>
                          <select
                            value={student.status}
                            onChange={(e) =>
                              handleStatusChange(
                                student._id,
                                e.target.value as "active" | "pending" | "withdrawn",
                              )
                            }
                            disabled={isUpdatingStatus}
                            className="rounded-full  bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)]80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide outline-none transition focus:border-secondary"
                          >
                            {statusOptions.map((option) => (
                              <option key={option} value={option}>
                                {t(`classes.status.${option}`, option)}
                              </option>
                            ))}
                          </select>
                        </div>
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

