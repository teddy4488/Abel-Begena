"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  useGetTeacherParticipantsQuery,
  useGetStudentParticipantsQuery,
  useTeacherCheckInMutation,
  useTeacherCheckOutMutation,
  useGetTodayTeacherAttendanceQuery,
  useGetInstrumentLessonsQuery,
  useRecordStudentAttendanceMutation,
} from "@/store/api/attendanceApi";
import { useGetAllUsersQuery } from "@/store/api/userApi";
import { useRegisterTeacherParticipantMutation, useRegisterStudentParticipantMutation } from "@/store/api/attendanceApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { Users, Music2, Clock, UserPlus, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminAttendancePage() {
  const { t } = useI18n();
  const { pushToast } = useToast();

  // Participants
  const { data: users = [] } = useGetAllUsersQuery();
  const { data: teacherParticipants = [] } = useGetTeacherParticipantsQuery();
  const { data: studentParticipants = [] } = useGetStudentParticipantsQuery();
  const [registerTeacher, { isLoading: registeringTeacher }] =
    useRegisterTeacherParticipantMutation();
  const [registerStudent, { isLoading: registeringStudent }] =
    useRegisterStudentParticipantMutation();

  // Teacher attendance
  const { data: todayAttendance = [], refetch: refetchToday } =
    useGetTodayTeacherAttendanceQuery();
  const [checkIn, { isLoading: checkingIn }] = useTeacherCheckInMutation();
  const [checkOut, { isLoading: checkingOut }] = useTeacherCheckOutMutation();

  // Student attendance
  const { data: lessons = [] } = useGetInstrumentLessonsQuery();
  const [recordStudentAttendance, { isLoading: recordingStudent }] =
    useRecordStudentAttendanceMutation();
  const [studentCode, setStudentCode] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [revisedLessonId, setRevisedLessonId] = useState<string>("");
  const [status, setStatus] = useState<"present" | "late" | "excused">("present");

  const [selectedTeacherUserId, setSelectedTeacherUserId] = useState("");
  const [selectedStudentUserId, setSelectedStudentUserId] = useState("");
  const [manualAttendanceNumber, setManualAttendanceNumber] = useState("");

  const teacherUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          (u.role === "Teacher" || u.role === "Admin") &&
          !teacherParticipants.some((p) => p.userId._id === u._id),
      ),
    [users, teacherParticipants],
  );

  const studentUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.role === "User" &&
          !studentParticipants.some((p) => p.userId._id === u._id),
      ),
    [users, studentParticipants],
  );

  const currentTeacherStatus = useMemo(() => {
    const openMap = new Map<string, boolean>();
    todayAttendance.forEach((rec: any) => {
      const pid = rec.participantId?._id ?? rec.participantId;
      if (!pid) return;
      if (!rec.checkOutAt) {
        openMap.set(String(pid), true);
      } else if (!openMap.has(String(pid))) {
        openMap.set(String(pid), false);
      }
    });
    return openMap;
  }, [todayAttendance]);

  const handleRegisterTeacher = async () => {
    if (!selectedTeacherUserId) return;
    try {
      await registerTeacher({ userId: selectedTeacherUserId }).unwrap();
      pushToast({
        title: t("attendance.teacherRegistered", "Teacher added to attendance"),
        variant: "success",
      });
      setSelectedTeacherUserId("");
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("attendance.error", "Unable to register teacher"),
        variant: "error",
      });
    }
  };

  const handleRegisterStudent = async () => {
    if (!selectedStudentUserId) return;
    // For now, default to Begena + 3 months; can be edited later via profile
    try {
      await registerStudent({
        userId: selectedStudentUserId,
        instrumentType: "Begena",
        programDurationMonths: 3,
        attendanceNumber: manualAttendanceNumber || undefined,
      }).unwrap();
      pushToast({
        title: t("attendance.studentRegistered", "Student added to attendance"),
        variant: "success",
      });
      setSelectedStudentUserId("");
      setManualAttendanceNumber("");
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("attendance.error", "Unable to register student"),
        variant: "error",
      });
    }
  };

  const handleTeacherToggle = async (participantId: string) => {
    const isOpen = currentTeacherStatus.get(participantId) === true;
    try {
      if (isOpen) {
        await checkOut({ participantId }).unwrap();
      } else {
        await checkIn({ participantId }).unwrap();
      }
      await refetchToday();
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("attendance.error", "Unable to update teacher attendance"),
        variant: "error",
      });
    }
  };

  const activeStudent = useMemo(
    () =>
      studentParticipants.find(
        (p) => p.attendanceNumber === studentCode.trim(),
      ),
    [studentCode, studentParticipants],
  );

  const eligibleLessons = useMemo(
    () =>
      lessons.filter(
        (lesson) =>
          !activeStudent ||
          lesson.instrumentType === activeStudent.instrumentType,
      ),
    [lessons, activeStudent],
  );

  const handleStudentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeStudent || !selectedLessonId) {
      pushToast({
        title: t("attendance.student.missing", "Missing student or lesson"),
        variant: "error",
      });
      return;
    }
    try {
      await recordStudentAttendance({
        attendanceNumber: activeStudent.attendanceNumber,
        lessonId: selectedLessonId,
        revisedLessonId: revisedLessonId || undefined,
        status,
      }).unwrap();
      pushToast({
        title: t("attendance.student.recorded", "Attendance recorded"),
        description: `${activeStudent.attendanceNumber} • ${status}`,
        variant: "success",
      });
      // reset for next student, keep focus on code field
      setStudentCode("");
      setSelectedLessonId("");
      setRevisedLessonId("");
      setStatus("present");
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("attendance.error", "Unable to record attendance"),
        variant: "error",
      });
    }
  };

  return (
    <section className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          {t("attendance.kicker", "Attendance")}
        </p>
        <h1 className="text-3xl font-serif text-primary">
          {t("attendance.title", "Teacher & Student Attendance")}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {t(
            "attendance.subtitle",
            "Mirror the real-world flow: admins record both teacher presence and student lessons.",
          )}
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* Student attendance - fast entry */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-lg"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {t("attendance.students.kicker", "Students")}
              </p>
              <h2 className="text-xl font-serif text-primary">
                {t("attendance.students.title", "Record lesson attendance")}
              </h2>
              <p className="mt-1 text-xs text-foreground/70">
                {t(
                  "attendance.students.subtitle",
                  "Type the attendance number, pick today’s lesson, and save.",
                )}
              </p>
            </div>
            <Users className="h-6 w-6 text-secondary/60" />
          </div>

          <form onSubmit={handleStudentSubmit} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[160px_1fr]">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {t("attendance.students.code", "Attendance #")}
                </label>
                <input
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value.replace(/\s+/g, ""))}
                  autoFocus
                  className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-lg font-mono tracking-[0.25em] outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
                {activeStudent && (
                  <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-foreground/60">
                    {activeStudent.userId.firstName} {activeStudent.userId.lastName} •{" "}
                    {activeStudent.instrumentType} • {activeStudent.programDurationMonths}{" "}
                    {t("attendance.students.months", "months")}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("attendance.students.lesson", "Today’s lesson")}
                  </label>
                  <select
                    value={selectedLessonId}
                    onChange={(e) => setSelectedLessonId(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                  >
                    <option value="">
                      {t("attendance.students.chooseLesson", "Choose a lesson")}
                    </option>
                    {eligibleLessons.map((lesson) => (
                      <option key={lesson._id} value={lesson._id}>
                        {lesson.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                      {t("attendance.students.revisedLesson", "Revised (optional)")}
                    </label>
                    <select
                      value={revisedLessonId}
                      onChange={(e) => setRevisedLessonId(e.target.value)}
                      className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                    >
                      <option value="">
                        {t(
                          "attendance.students.chooseRevised",
                          "Choose revised lesson (if any)",
                        )}
                      </option>
                      {eligibleLessons.map((lesson) => (
                        <option key={lesson._id} value={lesson._id}>
                          {lesson.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                      {t("attendance.students.status", "Status")}
                    </label>
                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as "present" | "late" | "excused")
                      }
                      className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                    >
                      <option value="present">
                        {t("attendance.status.present", "Present")}
                      </option>
                      <option value="late">
                        {t("attendance.status.late", "Late")}
                      </option>
                      <option value="excused">
                        {t("attendance.status.excused", "Excused")}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="submit"
                disabled={recordingStudent}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg disabled:opacity-60"
              >
                {recordingStudent && (
                  <Clock className="h-4 w-4 animate-spin text-primary-foreground" />
                )}
                {t("attendance.students.save", "Save & next")}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Teacher attendance - check-in/out */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-lg"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {t("attendance.teachers.kicker", "Teachers")}
              </p>
              <h2 className="text-xl font-serif text-primary">
                {t("attendance.teachers.title", "Track working hours")}
              </h2>
            </div>
            <Clock className="h-6 w-6 text-secondary/60" />
          </div>

          <div className="space-y-3">
            {teacherParticipants.map((p) => {
              const open = currentTeacherStatus.get(p._id) === true;
              const name =
                p.displayName ||
                `${p.userId.firstName ?? ""} ${p.userId.lastName ?? ""}`.trim() ||
                p.userId.email;
              return (
                <div
                  key={p._id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-primary">{name}</span>
                    <span className="text-[11px] uppercase tracking-[0.25em] text-foreground/60">
                      {open
                        ? t("attendance.teachers.status.in", "Checked in")
                        : t("attendance.teachers.status.out", "Not checked in")}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={checkingIn || checkingOut}
                    onClick={() => handleTeacherToggle(p._id)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] ${
                      open
                        ? "border border-red-500/60 text-red-600 hover:bg-red-500/10"
                        : "border border-green-500/60 text-green-600 hover:bg-green-500/10"
                    } disabled:opacity-60`}
                  >
                    {open ? t("attendance.teachers.checkout", "Check out") : t("attendance.teachers.checkin", "Check in")}
                  </button>
                </div>
              );
            })}
            {!teacherParticipants.length && (
              <p className="text-sm text-foreground/60">
                {t(
                  "attendance.teachers.none",
                  "No teachers registered for attendance yet.",
                )}
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Participant registry */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
              {t("attendance.registry.kicker", "Participants")}
            </p>
            <h2 className="text-xl font-serif text-primary">
              {t("attendance.registry.title", "Manage attendance participants")}
            </h2>
          </div>
          <UserPlus className="h-6 w-6 text-secondary/60" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary mb-2">
              {t("attendance.registry.teachers", "Teacher attendance list")}
            </p>
            <div className="flex gap-2">
              <select
                value={selectedTeacherUserId}
                onChange={(e) => setSelectedTeacherUserId(e.target.value)}
                className="flex-1 rounded-2xl border border-border bg-background/80 px-3 py-2 text-sm outline-none"
              >
                <option value="">
                  {t("attendance.registry.chooseTeacher", "Choose teacher user")}
                </option>
                {teacherUsers.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={registeringTeacher || !selectedTeacherUserId}
                onClick={handleRegisterTeacher}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {t("attendance.registry.add", "Add")}
              </button>
            </div>
            <p className="text-[11px] text-foreground/60 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {t(
                "attendance.registry.teacherHint",
                "Only users added here can accumulate teacher attendance.",
              )}
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary mb-2">
              {t("attendance.registry.students", "Student attendance list")}
            </p>
            <div className="space-y-2">
              <select
                value={selectedStudentUserId}
                onChange={(e) => setSelectedStudentUserId(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background/80 px-3 py-2 text-sm outline-none"
              >
                <option value="">
                  {t("attendance.registry.chooseStudent", "Choose student user")}
                </option>
                {studentUsers.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </select>
              <input
                value={manualAttendanceNumber}
                onChange={(e) =>
                  setManualAttendanceNumber(e.target.value.replace(/\s+/g, ""))
                }
                placeholder={t(
                  "attendance.registry.manualCode",
                  "Optional custom attendance number",
                )}
                className="w-full rounded-2xl border border-border bg-background/80 px-3 py-2 text-sm outline-none"
              />
            </div>
            <div className="flex justify-between items-center">
              <button
                type="button"
                disabled={registeringStudent || !selectedStudentUserId}
                onClick={handleRegisterStudent}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {t("attendance.registry.add", "Add")}
              </button>
              <p className="text-[11px] text-foreground/60 flex items-center gap-1">
                <Music2 className="h-3 w-3" />
                {t(
                  "attendance.registry.studentHint",
                  "Attendance numbers are spoken IDs used at the office.",
                )}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

