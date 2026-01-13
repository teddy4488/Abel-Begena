"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetTeacherParticipantsQuery,
  useGetStudentParticipantsQuery,
  useTeacherCheckInMutation,
  useTeacherCheckOutMutation,
  useGetTodayTeacherAttendanceQuery,
  useGetInstrumentLessonsQuery,
  useRecordStudentAttendanceMutation,
  useRegisterTeacherParticipantMutation,
  useRegisterStudentParticipantMutation,
} from "@/store/api/attendanceApi";
import { useGetAllUsersQuery } from "@/store/api/userApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import {
  Users,
  Clock,
  UserPlus,
  CheckCircle2,
  X,
  Search,
  GraduationCap,
  UserCheck,
} from "lucide-react";
import type { InstrumentType } from "@/store/api/storeApi";

type AttendanceMode = "student" | "teacher";

export default function AdminAttendancePage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const [mode, setMode] = useState<AttendanceMode>("student");
  const [showAddModal, setShowAddModal] = useState(false);

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

  // Add modal state
  const [selectedTeacherUserId, setSelectedTeacherUserId] = useState("");
  const [selectedStudentUserId, setSelectedStudentUserId] = useState("");
  const [manualAttendanceNumber, setManualAttendanceNumber] = useState("");
  const [studentInstrumentType, setStudentInstrumentType] = useState<InstrumentType>("Begena");
  const [studentProgramDuration, setStudentProgramDuration] = useState<3 | 6 | 9>(3);

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
    todayAttendance.forEach((rec) => {
      const pid =
        typeof rec.participantId === "object" && rec.participantId !== null
          ? rec.participantId._id
          : rec.participantId;
      if (!pid) return;
      if (!rec.checkOutAt) {
        openMap.set(String(pid), true);
      } else if (!openMap.has(String(pid))) {
        openMap.set(String(pid), false);
      }
    });
    return openMap;
  }, [todayAttendance]);

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

  const handleRegisterTeacher = async () => {
    if (!selectedTeacherUserId) return;
    try {
      await registerTeacher({ userId: selectedTeacherUserId }).unwrap();
      pushToast({
        title: t("attendance.teacherRegistered", "Teacher added to attendance"),
        variant: "success",
      });
      setSelectedTeacherUserId("");
      setShowAddModal(false);
    } catch (error: any) {
      pushToast({
        title: t("attendance.error", "Unable to register teacher"),
        description: error?.data?.message || "Please try again",
        variant: "error",
      });
    }
  };

  const handleRegisterStudent = async () => {
    if (!selectedStudentUserId) return;
    try {
      await registerStudent({
        userId: selectedStudentUserId,
        instrumentType: studentInstrumentType,
        programDurationMonths: studentProgramDuration,
        attendanceNumber: manualAttendanceNumber || undefined,
      }).unwrap();
      pushToast({
        title: t("attendance.studentRegistered", "Student added to attendance"),
        variant: "success",
      });
      setSelectedStudentUserId("");
      setManualAttendanceNumber("");
      setShowAddModal(false);
    } catch (error: any) {
      pushToast({
        title: t("attendance.error", "Unable to register student"),
        description: error?.data?.message || "Please try again",
        variant: "error",
      });
    }
  };

  const handleTeacherToggle = async (participantId: string) => {
    const isOpen = currentTeacherStatus.get(participantId) === true;
    try {
      if (isOpen) {
        await checkOut({ participantId }).unwrap();
        pushToast({
          title: t("attendance.teachers.checkedOut", "Checked out"),
          variant: "success",
        });
      } else {
        await checkIn({ participantId }).unwrap();
        pushToast({
          title: t("attendance.teachers.checkedIn", "Checked in"),
          variant: "success",
        });
      }
      await refetchToday();
    } catch (error: any) {
      pushToast({
        title: t("attendance.error", "Unable to update teacher attendance"),
        description: error?.data?.message || "Please try again",
        variant: "error",
      });
    }
  };

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
      // Reset for next student
      setStudentCode("");
      setSelectedLessonId("");
      setRevisedLessonId("");
      setStatus("present");
    } catch (error: any) {
      pushToast({
        title: t("attendance.error", "Unable to record attendance"),
        description: error?.data?.message || "Please try again",
        variant: "error",
      });
    }
  };

  return (
    <section className="space-y-6">
      {/* Header with tabs */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            {t("attendance.kicker", "Attendance")}
          </p>
          <h1 className="text-3xl font-serif text-primary">
            {t("attendance.title", "Attendance Management")}
          </h1>
        </div>

        {/* Mode switcher */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("student")}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition ${
              mode === "student"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-background/60 text-foreground/70 hover:bg-background/80"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            {t("attendance.mode.student", "Student Attendance")}
          </button>
          <button
            type="button"
            onClick={() => setMode("teacher")}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition ${
              mode === "teacher"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-background/60 text-foreground/70 hover:bg-background/80"
            }`}
          >
            <UserCheck className="h-4 w-4" />
            {t("attendance.mode.teacher", "Teacher Attendance")}
          </button>
        </div>
      </motion.div>

      {/* Content based on mode */}
      <AnimatePresence mode="wait">
        {mode === "student" ? (
          <motion.div
            key="student"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Student list section */}
            <div className="rounded-2xl bg-[var(--color-surface-elevated)] p-6 shadow-lg dark:bg-[var(--color-surface-elevated)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                    {t("attendance.students.list", "Student Attendance List")}
                  </p>
                  <h2 className="text-xl font-serif text-primary">
                    {t("attendance.students.registered", "Registered Students")}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg hover:opacity-90"
                >
                  <UserPlus className="h-4 w-4" />
                  {t("attendance.add", "Add Student")}
                </button>
              </div>

              <div className="space-y-2">
                {studentParticipants.length > 0 ? (
                  studentParticipants.map((p) => {
                    const name =
                      `${p.userId.firstName ?? ""} ${p.userId.lastName ?? ""}`.trim() ||
                      p.userId.email;
                    return (
                      <div
                        key={p._id}
                        className="flex items-center justify-between rounded-xl bg-[var(--color-card-bg)] px-4 py-3 dark:bg-[var(--color-card-bg)]"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-primary">{name}</span>
                          <span className="text-xs text-foreground/60">
                            {p.attendanceNumber} • {p.instrumentType} • {p.programDurationMonths}{" "}
                            {t("attendance.students.months", "months")}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-8 text-center text-sm text-foreground/60">
                    {t(
                      "attendance.students.none",
                      "No students registered for attendance yet.",
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Student attendance form */}
            <div className="rounded-2xl bg-[var(--color-surface-elevated)] p-6 shadow-lg dark:bg-[var(--color-surface-elevated)]">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                  {t("attendance.students.record", "Record Attendance")}
                </p>
                <h2 className="text-xl font-serif text-primary">
                  {t("attendance.students.title", "Record lesson attendance")}
                </h2>
                <p className="mt-1 text-xs text-foreground/70">
                  {t(
                    "attendance.students.subtitle",
                    "Type the attendance number, pick today's lesson, and save.",
                  )}
                </p>
              </div>

              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                      {t("attendance.students.code", "Attendance #")}
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                      <input
                        value={studentCode}
                        onChange={(e) => setStudentCode(e.target.value.replace(/\s+/g, ""))}
                        autoFocus
                        placeholder={t("attendance.students.codePlaceholder", "Enter number")}
                        className="w-full rounded-2xl bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)] pl-10 pr-4 py-3 text-lg font-mono tracking-[0.25em] outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                      />
                    </div>
                    {activeStudent && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 rounded-lg bg-green-500/10 px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-green-600">
                          {activeStudent.userId.firstName} {activeStudent.userId.lastName}
                        </p>
                        <p className="text-xs text-foreground/60">
                          {activeStudent.instrumentType} • {activeStudent.programDurationMonths}{" "}
                          {t("attendance.students.months", "months")}
                        </p>
                      </motion.div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                        {t("attendance.students.lesson", "Today's lesson")}
                      </label>
                      <select
                        value={selectedLessonId}
                        onChange={(e) => setSelectedLessonId(e.target.value)}
                        className="w-full rounded-2xl bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)] px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
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
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                          {t("attendance.students.revisedLesson", "Revised (optional)")}
                        </label>
                        <select
                          value={revisedLessonId}
                          onChange={(e) => setRevisedLessonId(e.target.value)}
                          className="w-full rounded-2xl bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)] px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
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
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                          {t("attendance.students.status", "Status")}
                        </label>
                        <select
                          value={status}
                          onChange={(e) =>
                            setStatus(e.target.value as "present" | "late" | "excused")
                          }
                          className="w-full rounded-2xl bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)] px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                        >
                          <option value="present">
                            {t("attendance.status.present", "Present")}
                          </option>
                          <option value="late">{t("attendance.status.late", "Late")}</option>
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
                    disabled={recordingStudent || !activeStudent || !selectedLessonId}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg disabled:opacity-60"
                  >
                    {recordingStudent && (
                      <Clock className="h-4 w-4 animate-spin text-primary-foreground" />
                    )}
                    {t("attendance.students.save", "Save & Next")}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="teacher"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Teacher list section */}
            <div className="rounded-2xl bg-[var(--color-surface-elevated)] p-6 shadow-lg dark:bg-[var(--color-surface-elevated)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                    {t("attendance.teachers.list", "Teacher Attendance List")}
                  </p>
                  <h2 className="text-xl font-serif text-primary">
                    {t("attendance.teachers.registered", "Registered Teachers")}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg hover:opacity-90"
                >
                  <UserPlus className="h-4 w-4" />
                  {t("attendance.addTeacher", "Add Teacher")}
                </button>
              </div>

              <div className="space-y-3">
                {teacherParticipants.length > 0 ? (
                  teacherParticipants.map((p) => {
                    const open = currentTeacherStatus.get(p._id) === true;
                    const name =
                      p.displayName ||
                      `${p.userId.firstName ?? ""} ${p.userId.lastName ?? ""}`.trim() ||
                      p.userId.email;
                    return (
                      <div
                        key={p._id}
                        className="flex items-center justify-between rounded-xl bg-[var(--color-card-bg)] px-4 py-3 dark:bg-[var(--color-card-bg)]"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-primary">{name}</span>
                          <span className="text-xs text-foreground/60">
                            {open
                              ? t("attendance.teachers.status.in", "Checked in")
                              : t("attendance.teachers.status.out", "Not checked in")}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={checkingIn || checkingOut}
                          onClick={() => handleTeacherToggle(p._id)}
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                            open
                              ? "border border-red-500/60 bg-red-500/10 text-red-600 hover:bg-red-500/20"
                              : "border border-green-500/60 bg-green-500/10 text-green-600 hover:bg-green-500/20"
                          } disabled:opacity-60`}
                        >
                          {open ? (
                            <>
                              <X className="h-3 w-3" />
                              {t("attendance.teachers.checkout", "Check out")}
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              {t("attendance.teachers.checkin", "Check in")}
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-8 text-center text-sm text-foreground/60">
                    {t(
                      "attendance.teachers.none",
                      "No teachers registered for attendance yet.",
                    )}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-[var(--color-surface-elevated)] p-6 shadow-2xl dark:bg-[var(--color-surface-elevated)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-serif text-primary">
                {mode === "student"
                  ? t("attendance.addStudent", "Add Student")
                  : t("attendance.addTeacher", "Add Teacher")}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedTeacherUserId("");
                  setSelectedStudentUserId("");
                  setManualAttendanceNumber("");
                }}
                className="rounded-full p-1 hover:bg-background/60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {mode === "student" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("attendance.selectStudent", "Select Student")}
                  </label>
                  <select
                    value={selectedStudentUserId}
                    onChange={(e) => setSelectedStudentUserId(e.target.value)}
                    className="w-full rounded-2xl bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)] px-4 py-3 text-sm outline-none"
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
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("attendance.instrumentType", "Instrument Type")}
                  </label>
                  <select
                    value={studentInstrumentType}
                    onChange={(e) =>
                      setStudentInstrumentType(e.target.value as InstrumentType)
                    }
                    className="w-full rounded-2xl bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)] px-4 py-3 text-sm outline-none"
                  >
                    {["Begena", "Kirar", "Masinko", "Washint", "Kebero", "Other"].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("attendance.programDuration", "Program Duration (months)")}
                  </label>
                  <select
                    value={studentProgramDuration}
                    onChange={(e) =>
                      setStudentProgramDuration(Number(e.target.value) as 3 | 6 | 9)
                    }
                    className="w-full rounded-2xl bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)] px-4 py-3 text-sm outline-none"
                  >
                    <option value="3">3 {t("attendance.students.months", "months")}</option>
                    <option value="6">6 {t("attendance.students.months", "months")}</option>
                    <option value="9">9 {t("attendance.students.months", "months")}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("attendance.attendanceNumber", "Attendance Number (optional)")}
                  </label>
                  <input
                    value={manualAttendanceNumber}
                    onChange={(e) =>
                      setManualAttendanceNumber(e.target.value.replace(/\s+/g, ""))
                    }
                    placeholder={t(
                      "attendance.registry.manualCode",
                      "Leave empty for auto-generation",
                    )}
                    className="w-full rounded-2xl bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)] px-4 py-3 text-sm outline-none"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedStudentUserId("");
                      setManualAttendanceNumber("");
                    }}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-background/60"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={registeringStudent || !selectedStudentUserId}
                    onClick={handleRegisterStudent}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {registeringStudent && (
                      <Clock className="h-4 w-4 animate-spin text-primary-foreground" />
                    )}
                    {t("attendance.add", "Add")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("attendance.selectTeacher", "Select Teacher")}
                  </label>
                  <select
                    value={selectedTeacherUserId}
                    onChange={(e) => setSelectedTeacherUserId(e.target.value)}
                    className="w-full rounded-2xl bg-[var(--color-card-bg)] dark:bg-[var(--color-card-bg)] px-4 py-3 text-sm outline-none"
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
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedTeacherUserId("");
                    }}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-background/60"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={registeringTeacher || !selectedTeacherUserId}
                    onClick={handleRegisterTeacher}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {registeringTeacher && (
                      <Clock className="h-4 w-4 animate-spin text-primary-foreground" />
                    )}
                    {t("attendance.add", "Add")}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </section>
  );
}
