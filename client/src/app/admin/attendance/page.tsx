"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetTeacherParticipantsQuery,
  useGetStudentParticipantsQuery,
  useGetStudentByAttendanceNumberQuery,
  useSearchStudentsQuery,
  useGetStudentDetailsQuery,
  useGetStudentAttendanceReportQuery,
  useGetStudentPaymentReportQuery,
  useTeacherCheckInMutation,
  useTeacherCheckOutMutation,
  useGetTodayTeacherAttendanceQuery,
  useGetInstrumentLessonsQuery,
  useRecordStudentAttendanceMutation,
  useRegisterTeacherParticipantMutation,
  useRegisterStudentParticipantMutation,
  useGetGraduationEligibilityQuery,
  attendanceApi,
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
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<string | null>(null);

  // Student search - works with name or attendance number
  const {
    data: searchResults = [],
    isLoading: searchingStudents,
  } = useSearchStudentsQuery(studentCode.trim(), {
    skip: !studentCode.trim() || studentCode.trim().length < 2,
  });

  // Get student details when one is selected
  const {
    data: studentDetails,
    isLoading: loadingDetails,
  } = useGetStudentDetailsQuery(selectedStudentForDetails || "", {
    skip: !selectedStudentForDetails,
  });

  // For backward compatibility, also try exact attendance number lookup
  const {
    data: lookedUpStudentByNumber,
    isLoading: lookingUpStudentByNumber,
  } = useGetStudentByAttendanceNumberQuery(studentCode.trim(), {
    skip: !studentCode.trim() || studentCode.trim().length < 2 || searchResults.length > 0,
  });

  // Use search results if available, otherwise use exact lookup
  const lookedUpStudent = searchResults.length === 1 ? searchResults[0] : 
    (searchResults.length === 0 && lookedUpStudentByNumber ? lookedUpStudentByNumber : null);
  const lookingUpStudent = searchingStudents || lookingUpStudentByNumber;

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
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    occupation: "",
    city: "",
    address: "",
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
    email: "",
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
    // Auto-select if only one result
    if (cleaned && searchResults.length === 1) {
      setSelectedStudentId(searchResults[0]._id);
    } else if (cleaned && lookedUpStudent?._id) {
      setSelectedStudentId(lookedUpStudent._id);
    } else {
      setSelectedStudentId("");
    }
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setSelectedStudentForDetails(studentId);
    // Find the student in search results or participants to set the code
    const student = searchResults.find(s => s._id === studentId) ||
      studentParticipants.find(s => s._id === studentId);
    if (student) {
      setStudentCode(student.attendanceNumber);
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
        phone: studentForm.phone.trim(),
        emergencyContactName: studentForm.emergencyContactName.trim() || undefined,
        emergencyContactPhone: studentForm.emergencyContactPhone.trim() || undefined,
        occupation: studentForm.occupation.trim() || undefined,
        city: studentForm.city.trim() || undefined,
        address: studentForm.address.trim() || undefined,
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
        phone: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        occupation: "",
        city: "",
        address: "",
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
        email: teacherForm.email.trim(),
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
        email: "",
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
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg hover:opacity-90"
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
                    {t("attendance.students.search", "Search by Name or Attendance Number")}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/30" />
                    <input
                      type="text"
                      value={studentCode}
                      onChange={(e) => handleStudentCodeChange(e.target.value)}
                      autoFocus
                      placeholder={t("attendance.students.searchPlaceholder", "Enter name or attendance number")}
                      className="w-full rounded-2xl card-elevated pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                    />
                  </div>
                  {lookingUpStudent && (
                    <p className="mt-2 text-xs text-foreground/60">
                      {t("attendance.students.lookingUp", "Looking up student...")}
                    </p>
                  )}
                  
                  {/* Search results dropdown */}
                  {studentCode.trim().length >= 2 && searchResults.length > 1 && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-border bg-background">
                      {searchResults.map((student) => {
                        const branchName =
                          typeof student.branchId === "object" && student.branchId !== null
                            ? student.branchId.name
                            : "";
                        return (
                          <button
                            key={student._id}
                            type="button"
                            onClick={() => handleSelectStudent(student._id)}
                            className="w-full px-4 py-3 text-left hover:bg-secondary/5 transition"
                          >
                            <p className="font-semibold text-primary">{student.fullName}</p>
                            <p className="text-xs text-foreground/60">
                              {t("attendance.students.code", "Attendance #")}: {student.attendanceNumber} • {student.instrumentType}
                              {branchName ? ` • ${branchName}` : ""}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Student confirmation and details */}
                {lookedUpStudent && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl card-elevated p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-primary">{lookedUpStudent.fullName}</p>
                        <p className="text-xs text-foreground/60">
                          {t("attendance.students.code", "Attendance #")}: {lookedUpStudent.attendanceNumber} • {lookedUpStudent.instrumentType}
                        </p>
                        {lookedUpStudent.registrationStartDate && (
                          <p className="text-xs text-foreground/50 mt-1">
                            {t("attendance.students.registeredOn", "Registered")}: {new Date(lookedUpStudent.registrationStartDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    </div>
                    {studentDetails && (
                      <div className="pt-3 border-t border-border/50 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-foreground/60">{t("attendance.students.totalAttendance", "Total Sessions")}</p>
                            <p className="font-semibold text-primary">{studentDetails.totalAttendance}</p>
                          </div>
                          {studentDetails.lastAttendance && (
                            <div>
                              <p className="text-foreground/60">{t("attendance.students.lastAttendance", "Last Attendance")}</p>
                              <p className="font-semibold text-primary">
                                {new Date(studentDetails.lastAttendance.sessionDate).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const result = await attendanceApi.endpoints.getStudentAttendanceReport.initiate(lookedUpStudent._id);
                                if ('data' in result) {
                                  const report = result.data;
                                  // Create downloadable JSON file
                                  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `attendance-report-${lookedUpStudent.attendanceNumber}-${new Date().toISOString().split('T')[0]}.json`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                  pushToast({
                                    title: t("attendance.students.downloadSuccess", "Report Downloaded"),
                                    variant: "success",
                                  });
                                }
                              } catch (error) {
                                pushToast({
                                  title: t("attendance.students.downloadError", "Download Error"),
                                  description: t("attendance.students.downloadErrorDesc", "Failed to download report"),
                                  variant: "error",
                                });
                              }
                            }}
                            className="flex-1 rounded-full bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary/20 transition"
                          >
                            {t("attendance.students.downloadAttendance", "Download Attendance Report")}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const result = await attendanceApi.endpoints.getStudentPaymentReport.initiate(lookedUpStudent._id);
                                if ('data' in result) {
                                  const report = result.data;
                                  // Create downloadable JSON file
                                  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `payment-report-${lookedUpStudent.attendanceNumber}-${new Date().toISOString().split('T')[0]}.json`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                  pushToast({
                                    title: t("attendance.students.downloadSuccess", "Report Downloaded"),
                                    variant: "success",
                                  });
                                }
                              } catch (error) {
                                pushToast({
                                  title: t("attendance.students.downloadError", "Download Error"),
                                  description: t("attendance.students.downloadErrorDesc", "Failed to download report"),
                                  variant: "error",
                                });
                              }
                            }}
                            className="flex-1 rounded-full bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary/20 transition"
                          >
                            {t("attendance.students.downloadPayments", "Download Payment Report")}
                          </button>
                        </div>
                      </div>
                    )}
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
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg hover:opacity-90"
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
      </AnimatePresence>

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4 backdrop-blur"
          onClick={() => setShowAddStudentModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl surface-elevated p-6 shadow-[0_20px_60px_var(--color-primary-glow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-serif text-primary">
                {t("attendance.addStudent", "Add Student")}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddStudentModal(false)}
                className="cursor-pointer rounded-full p-1 hover:bg-background/60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleRegisterStudent(); }} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("attendance.students.phone", "Phone Number")} *
                  </label>
                  <input
                    type="tel"
                    value={studentForm.phone ?? ""}
                    onChange={(e) =>
                      setStudentForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t(
                      "attendance.students.city",
                      "City",
                    )}
                  </label>
                  <input
                    type="text"
                    value={studentForm.city ?? ""}
                    onChange={(e) =>
                      setStudentForm((prev) => ({ ...prev, city: e.target.value }))
                    }
                    className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {t(
                    "attendance.students.address",
                    "Address / location",
                  )}
                </label>
                <input
                  type="text"
                  value={studentForm.address ?? ""}
                  onChange={(e) =>
                    setStudentForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t(
                      "attendance.students.emergencyContactName",
                      "Emergency contact name",
                    )}
                  </label>
                  <input
                    type="text"
                    value={studentForm.emergencyContactName ?? ""}
                    onChange={(e) =>
                      setStudentForm((prev) => ({
                        ...prev,
                        emergencyContactName: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t(
                      "attendance.students.emergencyContactPhone",
                      "Emergency phone",
                    )}
                  </label>
                  <input
                    type="tel"
                    value={studentForm.emergencyContactPhone ?? ""}
                    onChange={(e) =>
                      setStudentForm((prev) => ({
                        ...prev,
                        emergencyContactPhone: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {t("attendance.students.occupation", "Occupation")}
                </label>
                <input
                  type="text"
                  value={studentForm.occupation ?? ""}
                  onChange={(e) =>
                    setStudentForm((prev) => ({ ...prev, occupation: e.target.value }))
                  }
                  className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {t("attendance.students.fullName", "Full Name")} *
                </label>
                <input
                  type="text"
                  value={studentForm.fullName}
                  onChange={(e) => setStudentForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {t("attendance.students.email", "Email")} *
                </label>
                <input
                  type="email"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("attendance.instrumentType", "Instrument")} *
                  </label>
                  <select
                    value={studentForm.instrumentType}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, instrumentType: e.target.value as InstrumentType }))}
                    className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                    required
                  >
                    {INSTRUMENTS.map((inst) => (
                      <option key={inst} value={inst}>{inst}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("attendance.learningType", "Learning Type")} *
                  </label>
                  <select
                    value={studentForm.learningType}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, learningType: e.target.value as LearningType }))}
                    className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                    required
                  >
                    <option value="physical">{t("attendance.learningType.physical", "Physical")}</option>
                    <option value="online">{t("attendance.learningType.online", "Online")}</option>
                  </select>
                </div>
              </div>

              {studentForm.learningType === "physical" && (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("attendance.branch", "Branch")} *
                  </label>
                  <select
                    value={studentForm.branchId}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, branchId: e.target.value }))}
                    className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                    required
                  >
                    <option value="">{t("attendance.selectBranch", "Select branch")}</option>
                    {branches.map((branch) => (
                      <option key={branch._id} value={branch._id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {t("attendance.programDuration", "Program Duration")} *
                </label>
                <select
                  value={studentForm.programDurationMonths}
                  onChange={(e) => setStudentForm((prev) => ({ ...prev, programDurationMonths: Number(e.target.value) as 3 | 6 | 9 }))}
                  className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  required
                >
                  <option value={3}>3 {t("attendance.students.months", "months")}</option>
                  <option value={6}>6 {t("attendance.students.months", "months")}</option>
                  <option value={9}>9 {t("attendance.students.months", "months")}</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {t("attendance.students.preferredDays", "Preferred Learning Days")} * ({expectedDaysPerWeek} {t("attendance.students.daysRequired", "days required")})
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const current = studentForm.preferredLearningDays;
                        const newDays = current.includes(day)
                          ? current.filter((d) => d !== day)
                          : current.length < expectedDaysPerWeek
                            ? [...current, day]
                            : current;
                        setStudentForm((prev) => ({ ...prev, preferredLearningDays: newDays }));
                      }}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        studentForm.preferredLearningDays.includes(day)
                          ? "bg-primary text-primary-foreground ring-2 ring-offset-2 ring-offset-background ring-primary/70"
                          : "bg-background/60 text-foreground/70 hover:bg-background/80"
                      }`}
                    >
                      {studentForm.preferredLearningDays.includes(day) && (
                        <span className="inline-block h-3 w-3 rounded-full bg-primary-foreground" />
                      )}
                      <span>{DAY_LABELS[day]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {t("attendance.attendanceNumber", "Attendance Number (optional)")}
                </label>
                <input
                  type="text"
                  value={studentForm.attendanceNumber}
                  onChange={(e) => setStudentForm((prev) => ({ ...prev, attendanceNumber: e.target.value }))}
                  placeholder={t("attendance.registry.manualCode", "Leave empty for auto-generation")}
                  className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {t("attendance.students.registrationDate", "Registration Start Date")} *
                </label>
                <input
                  type="date"
                  value={studentForm.registrationStartDate}
                  onChange={(e) => setStudentForm((prev) => ({ ...prev, registrationStartDate: e.target.value }))}
                  className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  required
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-background/60"
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={registeringStudent}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {registeringStudent && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("attendance.add", "Register")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddTeacherModal && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4 backdrop-blur"
          onClick={() => setShowAddTeacherModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl surface-elevated p-6 shadow-[0_20px_60px_var(--color-primary-glow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-serif text-primary">
                {t("attendance.addTeacher", "Add Teacher")}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTeacherModal(false)}
                className="cursor-pointer rounded-full p-1 hover:bg-background/60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleRegisterTeacher(); }} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {t("attendance.teachers.fullName", "Full Name")} *
                </label>
                <input
                  type="text"
                  value={teacherForm.fullName}
                  onChange={(e) => setTeacherForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {t("attendance.teachers.email", "Email")} *
                </label>
                <input
                  type="email"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  required
                />
                <p className="mt-1 text-xs text-foreground/60">
                  {t("attendance.teachers.emailHint", "An account will be created and credentials will be sent to this email")}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {t("attendance.teachers.instruments", "Instruments")} *
                </label>
                <div className="flex flex-wrap gap-2">
                  {INSTRUMENTS.map((instrument) => (
                    <button
                      key={instrument}
                      type="button"
                      onClick={() => {
                        const current = teacherForm.instruments;
                        const newInstruments = current.includes(instrument)
                          ? current.filter((i) => i !== instrument)
                          : [...current, instrument];
                        setTeacherForm((prev) => ({ ...prev, instruments: newInstruments }));
                      }}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        teacherForm.instruments.includes(instrument)
                          ? "bg-primary text-primary-foreground ring-2 ring-offset-2 ring-offset-background ring-primary/70"
                          : "bg-background/60 text-foreground/70 hover:bg-background/80"
                      }`}
                    >
                      {teacherForm.instruments.includes(instrument) && (
                        <span className="inline-block h-3 w-3 rounded-full bg-primary-foreground" />
                      )}
                      <span>{instrument}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {t("attendance.teachers.teachingDays", "Teaching Days")} *
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const current = teacherForm.teachingDays;
                        const newDays = current.includes(day)
                          ? current.filter((d) => d !== day)
                          : [...current, day];
                        setTeacherForm((prev) => {
                          const newRanges = prev.timeRanges.filter((tr) => newDays.includes(tr.day));
                          return { ...prev, teachingDays: newDays, timeRanges: newRanges };
                        });
                      }}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        teacherForm.teachingDays.includes(day)
                          ? "bg-primary text-primary-foreground ring-2 ring-offset-2 ring-offset-background ring-primary/70"
                          : "bg-background/60 text-foreground/70 hover:bg-background/80"
                      }`}
                    >
                      {teacherForm.teachingDays.includes(day) && (
                        <span className="inline-block h-3 w-3 rounded-full bg-primary-foreground" />
                      )}
                      <span>{DAY_LABELS[day]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {teacherForm.teachingDays.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("attendance.teachers.timeRanges", "Time Ranges")} *
                  </label>
                  <div className="space-y-3">
                    {teacherForm.teachingDays.map((day) => {
                      const range = teacherForm.timeRanges.find((r) => r.day === day);
                      if (!range) {
                        const newRange = { day, startTime: "09:00", endTime: "17:00" };
                        setTeacherForm((prev) => ({
                          ...prev,
                          timeRanges: [...prev.timeRanges, newRange],
                        }));
                        return null;
                      }
                      return (
                        <div key={day} className="rounded-xl card-elevated p-3">
                          <p className="mb-2 text-xs font-semibold text-secondary">{DAY_LABELS[day]}</p>
                          <div className="grid gap-2 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs text-foreground/70">
                                {t("attendance.teachers.startTime", "Start Time")}
                              </label>
                              <input
                                type="time"
                                value={range.startTime}
                                onChange={(e) => {
                                  const newRanges = teacherForm.timeRanges.map((r) =>
                                    r.day === day ? { ...r, startTime: e.target.value } : r,
                                  );
                                  setTeacherForm((prev) => ({ ...prev, timeRanges: newRanges }));
                                }}
                                className="w-full rounded-xl bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-foreground/70">
                                {t("attendance.teachers.endTime", "End Time")}
                              </label>
                              <input
                                type="time"
                                value={range.endTime}
                                onChange={(e) => {
                                  const newRanges = teacherForm.timeRanges.map((r) =>
                                    r.day === day ? { ...r, endTime: e.target.value } : r,
                                  );
                                  setTeacherForm((prev) => ({ ...prev, timeRanges: newRanges }));
                                }}
                                className="w-full rounded-xl bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-background/60"
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={registeringTeacher}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {registeringTeacher && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("attendance.add", "Register")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </section>
    );
  }
