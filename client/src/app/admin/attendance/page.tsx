"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetTeacherParticipantsQuery,
  useGetStudentParticipantsQuery,
  useGetStudentByAttendanceNumberQuery,
  useTeacherCheckInMutation,
  useTeacherCheckOutMutation,
  useGetTodayTeacherAttendanceQuery,
  useGetInstrumentLessonsQuery,
  useRecordStudentAttendanceMutation,
  useRegisterTeacherParticipantMutation,
  useRegisterStudentParticipantMutation,
  useGetGraduationEligibilityQuery,
  type DayOfWeek,
  type LearningType,
  type AttendanceStatus,
  type TeachingTimeRange,
  type GraduationEligibilityItem,
} from "@/store/api/attendanceApi";
import { useGetBranchesAdminQuery } from "@/store/api/branchApi";
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
  Loader2,
} from "lucide-react";
import type { InstrumentType } from "@/store/api/storeApi";

type AttendanceMode = "student" | "teacher" | "eligibility";

const DAYS_OF_WEEK: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const INSTRUMENTS: InstrumentType[] = ["Begena", "Kirar", "Masinko", "Washint", "Kebero", "Other"];

export default function AdminAttendancePage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const [mode, setMode] = useState<AttendanceMode>("student");
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);

  // Data queries
  const { data: branches = [] } = useGetBranchesAdminQuery();
  const { data: teacherParticipants = [] } = useGetTeacherParticipantsQuery();
  const { data: studentParticipants = [] } = useGetStudentParticipantsQuery();
  const { data: todayAttendance = [], refetch: refetchToday } =
    useGetTodayTeacherAttendanceQuery();
  const { data: eligibility = [], isLoading: eligibilityLoading } =
    useGetGraduationEligibilityQuery();
  const [recordStudentAttendance, { isLoading: recordingStudent }] =
    useRecordStudentAttendanceMutation();
  const [registerTeacher, { isLoading: registeringTeacher }] =
    useRegisterTeacherParticipantMutation();
  const [registerStudent, { isLoading: registeringStudent }] =
    useRegisterStudentParticipantMutation();
  const [checkIn, { isLoading: checkingIn }] = useTeacherCheckInMutation();
  const [checkOut, { isLoading: checkingOut }] = useTeacherCheckOutMutation();

  // Student attendance recording state
  const [studentCode, setStudentCode] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [revisedLessonId, setRevisedLessonId] = useState<string>("");
  const [status, setStatus] = useState<AttendanceStatus>("present");

  // Student lookup
  const {
    data: lookedUpStudent,
    isLoading: lookingUpStudent,
    refetch: refetchStudentLookup,
  } = useGetStudentByAttendanceNumberQuery(studentCode.trim(), {
    skip: !studentCode.trim() || studentCode.trim().length < 3,
  });

  // Get lessons filtered by instrument
  const { data: allLessons = [] } = useGetInstrumentLessonsQuery(undefined);
  const eligibleLessons = useMemo(() => {
    if (!lookedUpStudent) return [];
    return allLessons.filter(
      (lesson) =>
        lesson.instrumentType === lookedUpStudent.instrumentType && lesson.isActive,
    );
  }, [allLessons, lookedUpStudent]);

  // Student registration form state
  const [studentForm, setStudentForm] = useState({
    fullName: "",
    email: "",
    branchId: "",
    learningType: "physical" as LearningType,
    instrumentType: "Begena" as InstrumentType,
    programDurationMonths: 3 as 3 | 6 | 9,
    preferredLearningDays: [] as DayOfWeek[],
    registrationStartDate: new Date().toISOString().split("T")[0],
    attendanceNumber: "",
  });

  // Teacher registration form state
  const [teacherForm, setTeacherForm] = useState({
    fullName: "",
    instruments: [] as InstrumentType[],
    teachingDays: [] as DayOfWeek[],
    timeRanges: [] as TeachingTimeRange[],
  });


  // Calculate expected days per week based on program duration
  const expectedDaysPerWeek = useMemo(() => {
    return studentForm.programDurationMonths === 3
      ? 5
      : studentForm.programDurationMonths === 6
        ? 3
        : 2;
  }, [studentForm.programDurationMonths]);

  // Teacher status tracking
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

  // Overview / analytics (client-side; attendance tables only)
  const totalStudents = studentParticipants.length;
  const totalTeachers = teacherParticipants.length;
  const totalLessons = allLessons.filter((l) => l.isActive).length;
  const totalBranches = branches.length;
  const teachersCheckedInNow = useMemo(() => {
    let count = 0;
    teacherParticipants.forEach((p) => {
      if (currentTeacherStatus.get(p._id) === true) count += 1;
    });
    return count;
  }, [teacherParticipants, currentTeacherStatus]);
  const teacherSessionsToday = todayAttendance.length;

  const eligibilitySummary = useMemo(() => {
    let eligible = 0;
    let nearly = 0;
    let notEligible = 0;
    eligibility.forEach((item) => {
      if (item.status === "eligible") eligible += 1;
      else if (item.status === "nearlyEligible") nearly += 1;
      else notEligible += 1;
    });
    return { eligible, nearly, notEligible };
  }, [eligibility]);

  // Handlers
  const handleStudentCodeChange = (value: string) => {
    const cleaned = value.replace(/\s+/g, "");
    setStudentCode(cleaned);
    if (cleaned && lookedUpStudent?._id) {
      setSelectedStudentId(lookedUpStudent._id);
    } else {
      setSelectedStudentId("");
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedLessonId) {
      pushToast({
        title: t("attendance.student.missing", "Missing student or lesson"),
        variant: "error",
      });
      return;
    }

    try {
      await recordStudentAttendance({
        participantId: selectedStudentId,
        lessonId: selectedLessonId,
        revisedLessonId: revisedLessonId || undefined,
        status,
      }).unwrap();

      pushToast({
        title: t("attendance.student.recorded", "Attendance recorded"),
        variant: "success",
      });

      // Reset for next student
      setStudentCode("");
      setSelectedStudentId("");
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

  const handleRegisterStudent = async () => {
    if (studentForm.preferredLearningDays.length !== expectedDaysPerWeek) {
      pushToast({
        title: t("attendance.error", "Invalid selection"),
        description: `Please select exactly ${expectedDaysPerWeek} learning days`,
        variant: "error",
      });
      return;
    }

    try {
      await registerStudent({
        fullName: studentForm.fullName.trim(),
        email: studentForm.email.trim(),
        branchId: studentForm.branchId,
        learningType: studentForm.learningType,
        instrumentType: studentForm.instrumentType,
        programDurationMonths: studentForm.programDurationMonths,
        preferredLearningDays: studentForm.preferredLearningDays,
        registrationStartDate: studentForm.registrationStartDate,
        attendanceNumber: studentForm.attendanceNumber.trim() || undefined,
      }).unwrap();

      pushToast({
        title: t("attendance.studentRegistered", "Student registered"),
        variant: "success",
      });

      setShowAddStudentModal(false);
      setStudentForm({
        fullName: "",
        email: "",
        branchId: "",
        learningType: "physical",
        instrumentType: "Begena",
        programDurationMonths: 3,
        preferredLearningDays: [],
        registrationStartDate: new Date().toISOString().split("T")[0],
        attendanceNumber: "",
      });
    } catch (error: any) {
      pushToast({
        title: t("attendance.error", "Unable to register student"),
        description: error?.data?.message || "Please try again",
        variant: "error",
      });
    }
  };

  const handleRegisterTeacher = async () => {
    if (
      teacherForm.teachingDays.length === 0 ||
      teacherForm.instruments.length === 0 ||
      teacherForm.timeRanges.length !== teacherForm.teachingDays.length
    ) {
      pushToast({
        title: t("attendance.error", "Invalid selection"),
        description: "Please complete all required fields",
        variant: "error",
      });
      return;
    }

    try {
      await registerTeacher({
        fullName: teacherForm.fullName.trim(),
        instruments: teacherForm.instruments,
        teachingDays: teacherForm.teachingDays,
        timeRanges: teacherForm.timeRanges,
      }).unwrap();

      pushToast({
        title: t("attendance.teacherRegistered", "Teacher registered"),
        variant: "success",
      });

      setShowAddTeacherModal(false);
      setTeacherForm({
        fullName: "",
        instruments: [],
        teachingDays: [],
        timeRanges: [],
      });
    } catch (error: any) {
      pushToast({
        title: t("attendance.error", "Unable to register teacher"),
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


  // Update student selection when lookup resolves
  useEffect(() => {
    if (lookedUpStudent) {
      setSelectedStudentId(lookedUpStudent._id);
    } else {
      setSelectedStudentId("");
    }
  }, [lookedUpStudent]);

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

        {/* Overview cards */}
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-3xl card-elevated p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary/80">
                {t("attendance.overview.students", "Students")}
              </p>
              <Users className="h-4 w-4 text-secondary/50" />
            </div>
            <p className="mt-2 text-3xl font-bold text-primary">
              {totalStudents}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-foreground/60">
              {t("attendance.overview.registry", "attendance registry")}
            </p>
          </div>
          <div className="rounded-3xl card-elevated p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary/80">
                {t("attendance.overview.teachers", "Teachers")}
              </p>
              <UserCheck className="h-4 w-4 text-secondary/50" />
            </div>
            <p className="mt-2 text-3xl font-bold text-primary">{totalTeachers}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-foreground/60">
              {t("attendance.overview.registry", "attendance registry")}
            </p>
          </div>
          <div className="rounded-3xl card-elevated p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary/80">
                {t("attendance.overview.checkedInNow", "Checked-in now")}
              </p>
              <Clock className="h-4 w-4 text-secondary/50" />
            </div>
            <p className="mt-2 text-3xl font-bold text-primary">{teachersCheckedInNow}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-foreground/60">
              {t("attendance.overview.sessionsToday", "sessions today")}: {teacherSessionsToday}
            </p>
          </div>
          <div className="rounded-3xl card-elevated p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary/80">
                {t("attendance.overview.eligibility", "Eligibility")}
              </p>
              <GraduationCap className="h-4 w-4 text-secondary/50" />
            </div>
            <p className="mt-2 text-3xl font-bold text-primary">
              {eligibilitySummary.eligible}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-foreground/60">
              {t("attendance.overview.eligibleForGraduation", "eligible for graduation")}
            </p>
          </div>
        </div>

        {/* Mode switcher */}
        <div className="flex flex-wrap gap-2">
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
          <button
            type="button"
            onClick={() => setMode("eligibility")}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition ${
              mode === "eligibility"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-background/60 text-foreground/70 hover:bg-background/80"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            {t("attendance.mode.eligibility", "Graduation Eligibility")}
          </button>
        </div>
      </motion.div>

      {/* Content based on mode */}
      <AnimatePresence mode="wait">
        {mode === "student" && (
          <motion.div
            key="student"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Student list section */}
            <div className="rounded-2xl surface-elevated p-6">
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
                  onClick={() => setShowAddStudentModal(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg hover:opacity-90"
                >
                  <UserPlus className="h-4 w-4" />
                  {t("attendance.addStudent", "Add Student")}
                </button>
              </div>

              <div className="space-y-3">
                {studentParticipants.length > 0 ? (
                  studentParticipants.map((p) => {
                    const branchName =
                      typeof p.branchId === "object" && p.branchId !== null
                        ? p.branchId.name
                        : "Unknown";
                    return (
                      <div
                        key={p._id}
                        className="flex items-center justify-between rounded-xl card-elevated px-4 py-3 transition-all hover:shadow-md"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-primary">{p.fullName}</span>
                          <span className="text-xs text-foreground/60">
                            {p.attendanceNumber} • {p.instrumentType} • {branchName}
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

            {/* Student attendance recording form */}
            <div className="rounded-2xl surface-elevated p-6">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                  {t("attendance.students.record", "Record Student Attendance")}
                </p>
                <h2 className="text-xl font-serif text-primary">
                  {t("attendance.students.recordTitle", "Mark Attendance")}
                </h2>
              </div>

              <form onSubmit={handleStudentSubmit} className="space-y-6">
                {/* Attendance number input */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("attendance.students.code", "Attendance Number")}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/30" />
                    <input
                      type="text"
                      value={studentCode}
                      onChange={(e) => handleStudentCodeChange(e.target.value)}
                      autoFocus
                      placeholder={t("attendance.students.codePlaceholder", "Enter attendance number")}
                      className="w-full rounded-2xl card-elevated pl-10 pr-4 py-3 text-lg font-mono tracking-[0.25em] outline-none focus:ring-2 focus:ring-secondary/30"
                    />
                  </div>
                  {lookingUpStudent && (
                    <p className="mt-2 text-xs text-foreground/60">
                      {t("attendance.students.lookingUp", "Looking up student...")}
                    </p>
                  )}
                </div>

                {/* Student confirmation */}
                {lookedUpStudent && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl card-elevated p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-primary">{lookedUpStudent.fullName}</p>
                        <p className="text-xs text-foreground/60">
                          {lookedUpStudent.instrumentType} • {lookedUpStudent.attendanceNumber}
                        </p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                  </motion.div>
                )}

                {/* Lesson selection */}
                {lookedUpStudent && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                        {t("attendance.students.lesson", "Today's Lesson")}
                      </label>
                      <select
                        value={selectedLessonId}
                        onChange={(e) => setSelectedLessonId(e.target.value)}
                        className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                        required
                      >
                        <option value="">
                          {t("attendance.students.chooseLesson", "Select lesson")}
                        </option>
                        {eligibleLessons.map((lesson) => (
                          <option key={lesson._id} value={lesson._id}>
                            {lesson.title} {lesson.code ? `(${lesson.code})` : ""}
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
                          className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                        >
                          <option value="">
                            {t("attendance.students.chooseRevised", "None")}
                          </option>
                          {eligibleLessons.map((lesson) => (
                            <option key={lesson._id} value={lesson._id}>
                              {lesson.title} {lesson.code ? `(${lesson.code})` : ""}
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
                          onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                          className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
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
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="submit"
                    disabled={recordingStudent || !selectedStudentId || !selectedLessonId}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg disabled:opacity-60"
                  >
                    {recordingStudent && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                    )}
                    {t("attendance.students.save", "Save & Next")}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {mode === "teacher" && (
          <motion.div
            key="teacher"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Teacher list section */}
            <div className="rounded-2xl surface-elevated p-6">
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
                  onClick={() => setShowAddTeacherModal(true)}
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
                    return (
                      <div
                        key={p._id}
                        className="flex items-center justify-between rounded-xl card-elevated px-4 py-3 transition-all hover:shadow-md"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-primary">{p.fullName}</span>
                          <span className="text-xs text-foreground/60">
                            {p.instruments.join(", ")} • {p.teachingDays.length} days/week
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

            {/* Today's attendance records */}
            {todayAttendance.length > 0 && (
              <div className="rounded-2xl surface-elevated p-6">
                <h3 className="mb-4 text-lg font-serif text-primary">
                  {t("attendance.teachers.today", "Today's Attendance")}
                </h3>
                <div className="space-y-3">
                  {todayAttendance.map((rec) => {
                    const participant =
                      typeof rec.participantId === "object" && rec.participantId !== null
                        ? rec.participantId
                        : null;
                    if (!participant) return null;
                    return (
                      <div
                        key={rec._id}
                        className="flex items-center justify-between rounded-xl card-elevated px-4 py-3"
                      >
                        <div>
                          <p className="font-semibold text-primary">{participant.fullName}</p>
                          <p className="text-xs text-foreground/60">
                            {new Date(rec.checkInAt).toLocaleTimeString()}
                            {rec.checkOutAt && ` - ${new Date(rec.checkOutAt).toLocaleTimeString()}`}
                            {rec.durationMinutes &&
                              ` • ${Math.floor(rec.durationMinutes / 60)}h ${rec.durationMinutes % 60}m`}
                          </p>
                        </div>
                        <div
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            rec.checkOutAt
                              ? "bg-green-500/10 text-green-600"
                              : "bg-yellow-500/10 text-yellow-600"
                          }`}
                        >
                          {rec.checkOutAt ? "Completed" : "In Progress"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {mode === "eligibility" && (
          <motion.div
            key="eligibility"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="rounded-2xl surface-elevated p-6">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                    {t("attendance.eligibility.title", "Graduation & Certification")}
                  </p>
                  <h2 className="text-xl font-serif text-primary sm:text-2xl">
                    {t(
                      "attendance.eligibility.subtitle",
                      "Eligibility overview by attendance & payments",
                    )}
                  </h2>
                  <p className="mt-1 text-xs text-foreground/60 sm:text-sm">
                    {t(
                      "attendance.eligibility.description",
                      "Uses attendance sessions and tuition months paid to highlight who is ready, nearly ready, or not yet eligible for graduation.",
                    )}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3 mb-4">
                <div className="rounded-2xl card-elevated p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary/80">
                    {t("attendance.eligibility.stats.eligible", "Eligible")}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-primary">
                    {eligibilitySummary.eligible}
                  </p>
                </div>
                <div className="rounded-2xl card-elevated p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary/80">
                    {t("attendance.eligibility.stats.nearly", "Nearly eligible")}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-amber-600">
                    {eligibilitySummary.nearly}
                  </p>
                </div>
                <div className="rounded-2xl card-elevated p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary/80">
                    {t("attendance.eligibility.stats.not", "Not yet eligible")}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {eligibilitySummary.notEligible}
                  </p>
                </div>
              </div>

              {eligibilityLoading ? (
                <p className="py-6 text-sm text-foreground/70">
                  {t("attendance.eligibility.loading", "Calculating eligibility...")}
                </p>
              ) : eligibility.length === 0 ? (
                <p className="py-6 text-sm text-foreground/70">
                  {t(
                    "attendance.eligibility.empty",
                    "No active students found in the attendance registry.",
                  )}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl card-elevated p-4">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-[0.25em] text-secondary/70">
                        <th className="px-3 py-2">
                          {t("attendance.eligibility.table.student", "Student")}
                        </th>
                        <th className="px-3 py-2">
                          {t("attendance.eligibility.table.instrument", "Instrument")}
                        </th>
                        <th className="px-3 py-2">
                          {t("attendance.eligibility.table.program", "Program")}
                        </th>
                        <th className="px-3 py-2">
                          {t("attendance.eligibility.table.attendance", "Attendance")}
                        </th>
                        <th className="px-3 py-2">
                          {t("attendance.eligibility.table.payments", "Payments")}
                        </th>
                        <th className="px-3 py-2">
                          {t("attendance.eligibility.table.status", "Status")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {eligibility.map((item: GraduationEligibilityItem) => {
                        const branchName =
                          typeof item.branchId === "object" && item.branchId !== null
                            ? item.branchId.name
                            : "";
                        const statusLabel =
                          item.status === "eligible"
                            ? t("attendance.eligibility.status.eligible", "Eligible")
                            : item.status === "nearlyEligible"
                              ? t(
                                  "attendance.eligibility.status.nearly",
                                  "Nearly eligible",
                                )
                              : t(
                                  "attendance.eligibility.status.not",
                                  "Not yet eligible",
                                );
                        const statusClass =
                          item.status === "eligible"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : item.status === "nearlyEligible"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-foreground/10 text-foreground/70";

                        return (
                          <tr key={item.participantId}>
                            <td className="px-3 py-3 align-top">
                              <div className="flex flex-col">
                                <span className="font-semibold text-primary">
                                  {item.fullName}
                                </span>
                                <span className="text-xs text-foreground/60">
                                  {item.attendanceNumber}
                                  {branchName ? ` • ${branchName}` : ""}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top text-xs text-foreground/70">
                              {item.instrumentType}
                            </td>
                            <td className="px-3 py-3 align-top text-xs text-foreground/70">
                              <div>
                                <p>
                                  {item.programDurationMonths}{" "}
                                  {t("attendance.students.months", "months")}
                                </p>
                                <p>
                                  {t(
                                    "attendance.eligibility.expectedMonths",
                                    "Expected months",
                                  )}
                                  : {item.expectedMonths}
                                </p>
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top text-xs text-foreground/70">
                              <div>
                                <p>
                                  {t(
                                    "attendance.eligibility.sessions",
                                    "Sessions",
                                  )}:{" "}
                                  {item.totalSessions} / {item.requiredSessions}
                                </p>
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top text-xs text-foreground/70">
                              <div>
                                <p>
                                  {t(
                                    "attendance.eligibility.monthsPaid",
                                    "Months paid",
                                  )}:{" "}
                                  {item.monthsPaid} / {item.expectedMonths}
                                </p>
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="flex flex-col gap-1">
                                <span
                                  className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                                >
                                  {statusLabel}
                                </span>
                                {item.reasons.length > 0 && (
                                  <ul className="list-disc pl-4 text-[10px] text-foreground/60">
                                    {item.reasons.slice(0, 3).map((reason) => (
                                      <li key={reason}>{reason}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
    </section>
