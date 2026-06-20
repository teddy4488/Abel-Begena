"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Clock, Search, Loader2, Users, GraduationCap, X } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { extractErrorMessage } from "@/lib/errors";
import {
  useGetMyTeachingStudentsQuery,
  useGetInstrumentLessonsQuery,
  useRecordStudentAttendanceMutation,
  useUpdateAttendanceRecordMutation,
  useDeleteAttendanceRecordMutation,
  useGetStudentAttendanceReportQuery,
  type AttendanceStatus,
} from "@/store/api/attendanceApi";

type AttendanceHistoryRecord = {
  _id: string;
  date: string;
  lesson?: { _id?: string; title?: string; code?: string } | null;
  revisedLesson?: { _id?: string; title?: string; code?: string } | null;
  status: AttendanceStatus;
  note?: string | null;
};

export default function TeacherAttendancePage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const { user } = useAppSelector((state) => state.auth);

  const { data: students = [], isLoading: studentsLoading } = useGetMyTeachingStudentsQuery();
  const [recordAttendance, { isLoading: isSaving }] = useRecordStudentAttendanceMutation();
  const [updateAttendance, { isLoading: isUpdating }] = useUpdateAttendanceRecordMutation();
  const [deleteAttendance, { isLoading: isDeleting }] = useDeleteAttendanceRecordMutation();

  // Search filter for the roster
  const [search, setSearch] = useState("");
  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.attendanceNumber.toLowerCase().includes(q),
    );
  }, [students, search]);

  // Record modal state
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const selectedStudent = useMemo(
    () => students.find((s) => s._id === selectedStudentId) ?? null,
    [students, selectedStudentId],
  );
  const [sessionDate, setSessionDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  });
  const [lessonId, setLessonId] = useState<string>("");
  const [revisedLessonId, setRevisedLessonId] = useState<string>("");
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [note, setNote] = useState<string>("");

  // Lessons dropdown — filtered by the selected student's instrument
  const { data: lessons = [] } = useGetInstrumentLessonsQuery(undefined, {
    skip: !selectedStudent,
  });
  const instrumentLessons = useMemo(() => {
    if (!selectedStudent) return [];
    return lessons.filter((l) => l.instrumentType === selectedStudent.instrumentType);
  }, [lessons, selectedStudent]);

  const closeRecordModal = () => {
    setSelectedStudentId(null);
    setLessonId("");
    setRevisedLessonId("");
    setStatus("present");
    setNote("");
  };

  const handleSubmitRecord = async () => {
    if (!selectedStudent) return;
    if ((status === "present" || status === "late") && !lessonId) {
      pushToast({
        title: t("teacher.attendance.lessonRequired", "Pick a lesson"),
        description: t(
          "teacher.attendance.lessonRequiredDesc",
          "Present and Late require a lesson to be selected.",
        ),
        variant: "error",
      });
      return;
    }
    try {
      await recordAttendance({
        participantId: selectedStudent._id,
        sessionDate,
        lessonId: lessonId || undefined,
        revisedLessonId: revisedLessonId || undefined,
        status,
        note: note || undefined,
      }).unwrap();
      pushToast({
        title: t("teacher.attendance.recorded", "Attendance recorded"),
        variant: "success",
      });
      closeRecordModal();
    } catch (err) {
      pushToast({
        title: t("teacher.attendance.recordError", "Could not record attendance"),
        description: extractErrorMessage(err, ""),
        variant: "error",
      });
    }
  };

  // History modal state (view + edit + delete)
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);
  const { data: historyRes, isLoading: historyLoading } = useGetStudentAttendanceReportQuery(
    historyStudentId || "",
    { skip: !historyStudentId },
  );
  const historyStudent = students.find((s) => s._id === historyStudentId);
  const history: AttendanceHistoryRecord[] = historyRes?.attendanceRecords ?? [];

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>("present");
  const [editNote, setEditNote] = useState<string>("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const startEdit = (rec: AttendanceHistoryRecord) => {
    setEditingRecordId(rec._id);
    setEditStatus(rec.status);
    setEditNote(rec.note ?? "");
  };
  const saveEdit = async (recordId: string) => {
    try {
      await updateAttendance({
        id: recordId,
        status: editStatus,
        note: editNote || undefined,
      }).unwrap();
      pushToast({ title: t("teacher.attendance.updated", "Attendance updated"), variant: "success" });
      setEditingRecordId(null);
    } catch (err) {
      pushToast({
        title: t("teacher.attendance.updateError", "Could not update attendance"),
        description: extractErrorMessage(err, ""),
        variant: "error",
      });
    }
  };
  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteAttendance(confirmDeleteId).unwrap();
      pushToast({ title: t("teacher.attendance.deleted", "Attendance deleted"), variant: "success" });
      setConfirmDeleteId(null);
    } catch (err) {
      pushToast({
        title: t("teacher.attendance.deleteError", "Could not delete attendance"),
        description: extractErrorMessage(err, ""),
        variant: "error",
      });
    }
  };

  if (!user || user.userType !== "teacher") {
    return (
      <section className="container py-12">
        <p className="text-center text-foreground/70">
          {t("teacher.attendance.notTeacher", "This page is for teachers only.")}
        </p>
      </section>
    );
  }

  return (
    <section className="container space-y-6 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl surface-elevated p-6 shadow-lg sm:p-8"
      >
        <p className="text-xs uppercase tracking-[0.35em] text-secondary">
          {t("teacher.attendance.kicker", "Attendance")}
        </p>
        <h1 className="mt-1 text-3xl font-serif text-primary">
          {t("teacher.attendance.title", "Take attendance for your students")}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {t(
            "teacher.attendance.subtitle",
            "Record each session as you teach it. Lesson progress and billing update automatically.",
          )}
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl surface-elevated p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-secondary/70">
                {t("teacher.attendance.stats.students", "Students you teach")}
              </p>
              <p className="mt-1 text-2xl font-bold text-primary">{students.length}</p>
            </div>
            <Users className="h-8 w-8 text-secondary/40" />
          </div>
        </div>
        <div className="rounded-2xl surface-elevated p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-secondary/70">
                {t("teacher.attendance.stats.classes", "Active classes")}
              </p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {new Set(students.map((s) => s.classTitle).filter(Boolean)).size}
              </p>
            </div>
            <GraduationCap className="h-8 w-8 text-secondary/40" />
          </div>
        </div>
      </div>

      {/* Roster */}
      <div className="rounded-2xl surface-elevated p-4 shadow-lg sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-secondary">
              {t("teacher.attendance.roster.kicker", "Roster")}
            </p>
            <h2 className="text-xl font-serif text-primary">
              {t("teacher.attendance.roster.title", "Your students")}
            </h2>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("teacher.attendance.search", "Search by name or number…")}
              className="w-full rounded-xl card-elevated pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
            />
          </div>
        </div>

        {studentsLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-foreground/60">
            <Loader2 className="h-5 w-5 animate-spin text-secondary" />
            {t("teacher.attendance.loading", "Loading your students…")}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-foreground/70">
              {students.length === 0
                ? t(
                    "teacher.attendance.emptyRoster",
                    "You don't have any active students. The admin assigns you to classes.",
                  )
                : t("teacher.attendance.noMatch", "No students match your search.")}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {filteredStudents.map((s) => (
              <li
                key={s._id}
                className="interactive-row flex flex-wrap items-center justify-between gap-3 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-primary">{s.fullName}</p>
                  <p className="text-xs text-foreground/60">
                    {s.attendanceNumber} · {s.instrumentType}
                    {s.classTitle ? ` · ${s.classTitle}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentId(s._id)}
                    className="btn-primary-strong inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    {t("teacher.attendance.record", "Record")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryStudentId(s._id)}
                    className="btn-ghost-strong inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs"
                    title={t("teacher.attendance.history", "View history")}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {t("teacher.attendance.history", "History")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Record Attendance Modal */}
      {selectedStudent && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeRecordModal}
        >
          <div
            className="w-full max-w-md rounded-2xl surface-elevated p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                  {t("teacher.attendance.recordTitle", "Record attendance")}
                </p>
                <h3 className="mt-1 text-lg font-serif text-primary">{selectedStudent.fullName}</h3>
                <p className="text-xs text-foreground/60">
                  {selectedStudent.attendanceNumber} · {selectedStudent.instrumentType}
                </p>
              </div>
              <button
                type="button"
                onClick={closeRecordModal}
                className="rounded-full p-2 text-foreground/70 hover:bg-secondary/10"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {t("teacher.attendance.field.date", "Date")}
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full rounded-xl card-elevated px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {t("teacher.attendance.field.status", "Status")}
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                  className="w-full rounded-xl card-elevated px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                >
                  <option value="present">{t("attendance.status.present", "Present")}</option>
                  <option value="late">{t("attendance.status.late", "Late")}</option>
                  <option value="excused">{t("attendance.status.excused", "Excused")}</option>
                  <option value="absent">{t("attendance.status.absent", "Absent")}</option>
                </select>
              </div>

              {(status === "present" || status === "late") && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                      {t("teacher.attendance.field.lesson", "Lesson taught")}
                    </label>
                    <select
                      value={lessonId}
                      onChange={(e) => setLessonId(e.target.value)}
                      className="w-full rounded-xl card-elevated px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                    >
                      <option value="">{t("teacher.attendance.selectLesson", "— select a lesson —")}</option>
                      {instrumentLessons.map((l) => (
                        <option key={l._id} value={l._id}>
                          {l.title}
                          {l.code ? ` (${l.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                      {t("teacher.attendance.field.revised", "Revised lesson (optional)")}
                    </label>
                    <select
                      value={revisedLessonId}
                      onChange={(e) => setRevisedLessonId(e.target.value)}
                      className="w-full rounded-xl card-elevated px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                    >
                      <option value="">{t("teacher.attendance.noRevision", "— none —")}</option>
                      {instrumentLessons
                        .filter((l) => l._id !== lessonId)
                        .map((l) => (
                          <option key={l._id} value={l._id}>
                            {l.title}
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {t("teacher.attendance.field.note", "Note (optional)")}
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl card-elevated px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  placeholder={t("teacher.attendance.notePlaceholder", "Anything noteworthy about this session?")}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeRecordModal}
                className="btn-ghost-strong rounded-full px-5 py-2 text-sm"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                onClick={handleSubmitRecord}
                disabled={isSaving}
                className="btn-primary-strong inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("teacher.attendance.save", "Save attendance")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyStudentId && historyStudent && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setHistoryStudentId(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl surface-elevated shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                  {t("teacher.attendance.historyTitle", "Attendance history")}
                </p>
                <h3 className="text-lg font-serif text-primary">{historyStudent.fullName}</h3>
                <p className="text-xs text-foreground/60">{historyStudent.attendanceNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryStudentId(null)}
                className="rounded-full p-2 text-foreground/70 hover:bg-secondary/10"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {historyLoading ? (
                <div className="flex items-center gap-2 py-6 text-sm text-foreground/60">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("teacher.attendance.historyLoading", "Loading records…")}
                </div>
              ) : history.length === 0 ? (
                <p className="py-6 text-center text-sm text-foreground/60">
                  {t("teacher.attendance.historyEmpty", "No attendance records yet.")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-[0.25em] text-secondary/70">
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">{t("attendance.history.table.date", "Date")}</th>
                        <th className="px-3 py-2 text-left">{t("attendance.history.table.lesson", "Lesson")}</th>
                        <th className="px-3 py-2 text-left">{t("attendance.history.table.status", "Status")}</th>
                        <th className="px-3 py-2 text-left">{t("attendance.history.table.actions", "Actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {history.map((rec, idx) => {
                        const isEditing = editingRecordId === rec._id;
                        const dt = new Date(rec.date);
                        return (
                          <tr key={rec._id} className="interactive-row">
                            <td className="px-3 py-3 text-xs text-foreground/70">{idx + 1}</td>
                            <td className="px-3 py-3">{dt.toLocaleDateString()}</td>
                            <td className="px-3 py-3 text-xs text-foreground/70">{rec.lesson?.title ?? "—"}</td>
                            <td className="px-3 py-3">
                              {isEditing ? (
                                <select
                                  value={editStatus}
                                  onChange={(e) => setEditStatus(e.target.value as AttendanceStatus)}
                                  className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                                >
                                  <option value="present">{t("attendance.status.present", "Present")}</option>
                                  <option value="late">{t("attendance.status.late", "Late")}</option>
                                  <option value="excused">{t("attendance.status.excused", "Excused")}</option>
                                  <option value="absent">{t("attendance.status.absent", "Absent")}</option>
                                </select>
                              ) : (
                                <span className="rounded-full bg-foreground/5 px-2 py-1 text-xs font-semibold text-foreground/80">
                                  {rec.status}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              {isEditing ? (
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                                  <input
                                    type="text"
                                    value={editNote}
                                    onChange={(e) => setEditNote(e.target.value)}
                                    placeholder={t("teacher.attendance.notePlaceholder", "Note")}
                                    className="rounded-lg border border-border bg-background px-2 py-1 text-xs sm:max-w-[140px]"
                                  />
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={isUpdating}
                                      onClick={() => saveEdit(rec._id)}
                                      className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary disabled:opacity-60"
                                    >
                                      {t("common.save", "Save")}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingRecordId(null)}
                                      className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70"
                                    >
                                      {t("common.cancel", "Cancel")}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(rec)}
                                    className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 hover:bg-secondary/10"
                                  >
                                    {t("common.edit", "Edit")}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(rec._id)}
                                    className="rounded-full border border-rose-500/30 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-500/10"
                                  >
                                    {t("common.delete", "Delete")}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="border-t border-border p-4 text-right">
              <button
                type="button"
                onClick={() => setHistoryStudentId(null)}
                className="btn-ghost-strong rounded-full px-5 py-2 text-sm"
              >
                {t("common.close", "Close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl surface-elevated p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-serif text-primary">
              {t("teacher.attendance.deleteTitle", "Delete attendance record?")}
            </h3>
            <p className="mt-2 text-sm text-foreground/70">
              {t(
                "teacher.attendance.deleteDesc",
                "This permanently removes the record. The student's lesson progress and billing will recalculate.",
              )}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="btn-ghost-strong rounded-full px-5 py-2 text-sm"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="btn-danger-strong rounded-full px-5 py-2 text-sm"
              >
                {t("common.delete", "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
