"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetTeacherParticipantsQuery,
  useGetStudentParticipantsQuery,
  useGetStudentDetailsQuery,
  useGetStudentAttendanceReportQuery,
  useTeacherCheckInMutation,
  useTeacherCheckOutMutation,
  useGetTodayTeacherAttendanceQuery,
  useGetInstrumentLessonsQuery,
  useRecordStudentAttendanceMutation,
  useUpdateAttendanceRecordMutation,
  useDeleteAttendanceRecordMutation,
  useRegisterTeacherParticipantMutation,
  useRegisterStudentParticipantMutation,
  useRevertStudentToUserMutation,
  useGetPastStudentsQuery,
  useGetGraduationEligibilityQuery,
  attendanceApi,
  type DayOfWeek,
  type LearningType,
  type AttendanceStatus,
  type TeachingTimeRange,
  type GraduationEligibilityItem,
  type StudentParticipant,
} from "@/store/api/attendanceApi";
import { useGetBranchesAdminQuery } from "@/store/api/branchApi";
import { useAppDispatch } from "@/store/hooks";
import { useToast } from "@/components/providers/ToastProvider";
import { extractErrorMessage } from "@/lib/errors";
import { useI18n } from "@/components/providers/I18nProvider";
import Pagination from "@/components/ui/Pagination";
import {
  Users,
  Clock,
  ClipboardCheck,
  UserPlus,
  CheckCircle2,
  X,
  Search,
  GraduationCap,
  UserCheck,
  Loader2,
} from "lucide-react";
import type { InstrumentType } from "@/store/api/storeApi";
import NoShowReview from "@/components/admin/NoShowReview";

type AttendanceMode = "student" | "teacher" | "eligibility";

type AttendanceHistoryRecord = {
  _id: string;
  date: string;
  lesson?: { _id?: string; title?: string; code?: string } | null;
  revisedLesson?: { _id?: string; title?: string; code?: string } | null;
  status: AttendanceStatus;
  note?: string | null;
};

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
  const [showRecordAttendanceModal, setShowRecordAttendanceModal] = useState(false);
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsItemsPerPage, setStudentsItemsPerPage] = useState(10);
  const [teachersPage, setTeachersPage] = useState(1);
  const [teachersItemsPerPage, setTeachersItemsPerPage] = useState(10);
  const [todayPage, setTodayPage] = useState(1);
  const [todayItemsPerPage, setTodayItemsPerPage] = useState(10);
  const [eligibilityPage, setEligibilityPage] = useState(1);
  const [eligibilityItemsPerPage, setEligibilityItemsPerPage] = useState(10);

  // Data queries
  const { data: branches = [] } = useGetBranchesAdminQuery();
  const { data: teacherParticipants = [] } = useGetTeacherParticipantsQuery();
  const { data: studentParticipants = [] } = useGetStudentParticipantsQuery();
  const { data: todayAttendance = [], refetch: refetchToday } =
    useGetTodayTeacherAttendanceQuery();
  const { data: eligibility = [], isLoading: eligibilityLoading } =
    useGetGraduationEligibilityQuery();

  // Note: avoid setState-in-effect (eslint). Page resets are handled in the
  // mode-switch click handlers and list-size change effects below.
  const [recordStudentAttendance, { isLoading: recordingStudent }] =
    useRecordStudentAttendanceMutation();
  const [registerTeacher, { isLoading: registeringTeacher }] =
    useRegisterTeacherParticipantMutation();
  const [registerStudent, { isLoading: registeringStudent }] =
    useRegisterStudentParticipantMutation();
  const [revertStudent, { isLoading: revertingStudent }] =
    useRevertStudentToUserMutation();
  const [showPastStudents, setShowPastStudents] = useState(false);
  const { data: pastStudents = [] } = useGetPastStudentsQuery(undefined, {
    skip: !showPastStudents,
  });
  const [revertTarget, setRevertTarget] = useState<{ userId: string; name: string } | null>(null);
  const [revertReason, setRevertReason] = useState<"completed" | "withdrawn" | "dropped">("completed");

  const handleRevertStudent = async () => {
    if (!revertTarget) return;
    try {
      await revertStudent({ userId: revertTarget.userId, reason: revertReason }).unwrap();
      pushToast({
        title: t("attendance.students.reverted", "Student reverted to user"),
        variant: "success",
      });
      setRevertTarget(null);
      setRevertReason("completed");
    } catch {
      pushToast({
        title: t("attendance.students.revertError", "Unable to revert student"),
        variant: "error",
      });
    }
  };
  const [checkIn, { isLoading: checkingIn }] = useTeacherCheckInMutation();
  const [checkOut, { isLoading: checkingOut }] = useTeacherCheckOutMutation();

  // Student attendance recording state
  const [studentCode, setStudentCode] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedStudentSnapshot, setSelectedStudentSnapshot] =
    useState<StudentParticipant | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [revisedLessonId, setRevisedLessonId] = useState<string>("");
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [recordDate, setRecordDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  });
  const [recordNote, setRecordNote] = useState<string>("");
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<string | null>(null);

  // Attendance history modal state
  const [showAttendanceHistoryModal, setShowAttendanceHistoryModal] = useState(false);
  const [attendanceHistoryStudentId, setAttendanceHistoryStudentId] = useState<string | null>(null);
  const {
    data: attendanceHistoryRes,
    isLoading: loadingAttendanceHistory,
  } = useGetStudentAttendanceReportQuery(attendanceHistoryStudentId || "", {
    skip: !attendanceHistoryStudentId,
  });
  const attendanceHistory = attendanceHistoryRes?.attendanceRecords ?? [];

  // Edit / Delete attendance state
  const [updateAttendance, { isLoading: isUpdatingAttendance }] = useUpdateAttendanceRecordMutation();
  const [deleteAttendance, { isLoading: isDeletingAttendance }] = useDeleteAttendanceRecordMutation();
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>("present");
  const [editNote, setEditNote] = useState<string>("");
  const [confirmDeleteRecordId, setConfirmDeleteRecordId] = useState<string | null>(null);

  const handleStartEditRecord = (rec: AttendanceHistoryRecord) => {
    setEditingRecordId(rec._id);
    setEditStatus(rec.status);
    setEditNote(rec.note ?? "");
  };
  const handleCancelEditRecord = () => {
    setEditingRecordId(null);
    setEditNote("");
  };
  const handleSaveEditRecord = async (recordId: string) => {
    try {
      await updateAttendance({ id: recordId, status: editStatus, note: editNote || undefined }).unwrap();
      pushToast({ title: t("attendance.history.updated", "Attendance updated"), variant: "success" });
      setEditingRecordId(null);
    } catch (err) {
      pushToast({
        title: t("attendance.history.updateError", "Could not update attendance"),
        description: extractErrorMessage(err, ""),
        variant: "error",
      });
    }
  };
  const handleConfirmDeleteRecord = async () => {
    if (!confirmDeleteRecordId) return;
    try {
      await deleteAttendance(confirmDeleteRecordId).unwrap();
      pushToast({ title: t("attendance.history.deleted", "Attendance deleted"), variant: "success" });
      setConfirmDeleteRecordId(null);
    } catch (err) {
      pushToast({
        title: t("attendance.history.deleteError", "Could not delete attendance"),
        description: extractErrorMessage(err, ""),
        variant: "error",
      });
    }
  };
  const attendanceHistoryStudent = attendanceHistoryRes?.student ?? null;


  // Student search - performed only when the user clicks the search button
  const dispatch = useAppDispatch();
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [lookingUpStudentByNumber, setLookingUpStudentByNumber] = useState(false);

  const [searchResults, setSearchResults] = useState<StudentParticipant[]>([]);
  const [searchExecuted, setSearchExecuted] = useState(false);

  // Get student details when one is selected
  const {
    data: studentDetails,
  } = useGetStudentDetailsQuery(selectedStudentForDetails || "", {
    skip: !selectedStudentForDetails,
  });

  const lookingUpStudent = searchingStudents || lookingUpStudentByNumber;

  const handleSearchClick = async () => {
    const query = studentCode.trim();
    if (!query) return;

    // Reset prior selection/flags
    setSearchExecuted(true);
    setSelectedStudentId("");
    setSelectedStudentSnapshot(null);
    setSelectedStudentForDetails(null);
    setSelectedLessonId("");
    setRevisedLessonId("");
    setStatus("present");
    setShowRecordAttendanceModal(false);
    setSearchResults([]);
    try {
      // Prefer text search for queries >= 2 characters
      if (query.length >= 2) {
        setSearchingStudents(true);
        const res = (await dispatch(
          attendanceApi.endpoints.searchStudents.initiate(query),
        )) as unknown;
        setSearchingStudents(false);
        const data =
          (res as { data?: unknown }).data !== undefined
            ? (res as { data?: unknown }).data
            : res;
        if (Array.isArray(data) && data.length > 0) {
          setSearchResults(data as typeof searchResults);
          return;
        }
      }

      // Fallback to exact attendance number lookup (useful for single-digit codes)
      setLookingUpStudentByNumber(true);
      const lookupRes = (await dispatch(
        attendanceApi.endpoints.getStudentByAttendanceNumber.initiate(query),
      )) as unknown;
      setLookingUpStudentByNumber(false);
      const lookup =
        (lookupRes as { data?: unknown }).data !== undefined
          ? (lookupRes as { data?: unknown }).data
          : lookupRes;
      if (lookup) setSearchResults([lookup] as typeof searchResults);
      else setSearchResults([]);
    } catch {
      setSearchingStudents(false);
      setLookingUpStudentByNumber(false);
      setSearchResults([]);
    }
  };

  // Selected student (works for multi-result selection too)
  const selectedStudent = useMemo(() => {
    if (selectedStudentSnapshot) return selectedStudentSnapshot;
    if (!selectedStudentId) return null;
    return (
      searchResults.find((s) => s._id === selectedStudentId) ||
      studentParticipants.find((s) => s._id === selectedStudentId) ||
      null
    );
  }, [selectedStudentSnapshot, selectedStudentId, searchResults, studentParticipants]);

  // Get lessons filtered by instrument
  const { data: allLessons = [] } = useGetInstrumentLessonsQuery(undefined);
  const eligibleLessons = useMemo(() => {
    if (!selectedStudent) return [];
    return allLessons.filter(
      (lesson) =>
        lesson.instrumentType === selectedStudent.instrumentType && lesson.isActive,
    );
  }, [allLessons, selectedStudent]);

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
    slotTimes: {} as Record<string, string>,
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
    // Reset selection while typing; selection happens via dropdown or auto-resolve effect
    setSelectedStudentId("");
    setSelectedStudentSnapshot(null);
    setSelectedStudentForDetails(null);
    setSelectedLessonId("");
    setRevisedLessonId("");
    setStatus("present");
    setShowRecordAttendanceModal(false);
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setSelectedStudentForDetails(studentId);
    setSelectedLessonId("");
    setRevisedLessonId("");
    setStatus("present");
    setShowRecordAttendanceModal(true);
    // Find the student in search results or participants to set the code
    const student = searchResults.find(s => s._id === studentId) ||
      studentParticipants.find(s => s._id === studentId);
    if (student) {
      setSelectedStudentSnapshot(student);
      setStudentCode(student.attendanceNumber);
    }
  };

  const handleShowAttendanceHistory = (studentId: string) => {
    setAttendanceHistoryStudentId(studentId);
    setShowAttendanceHistoryModal(true);
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Lesson required only for present/late.
    const lessonRequired = status === "present" || status === "late";
    if (!selectedStudentId || (lessonRequired && !selectedLessonId)) {
      pushToast({
        title: t("attendance.student.missing", "Missing student or lesson"),
        variant: "error",
      });
      return;
    }

    try {
      await recordStudentAttendance({
        participantId: selectedStudentId,
        lessonId: selectedLessonId || undefined,
        revisedLessonId: revisedLessonId || undefined,
        status,
        sessionDate: recordDate || undefined,
        note: recordNote || undefined,
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
      setRecordNote("");
      setSelectedStudentForDetails(null);
      setShowRecordAttendanceModal(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err && err.data
          ? (err.data as { message?: unknown }).message
          : undefined;
      pushToast({
        title: t("attendance.error", "Unable to record attendance"),
        description:
          typeof message === "string" && message.length > 0
            ? message
            : "Please try again",
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

    // Each chosen day needs a valid in-hours session time (08:00–18:00 start).
    const timeOk = (hhmm: string) => {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) return false;
      const [h, m] = hhmm.split(":").map(Number);
      const mins = h * 60 + m;
      return mins >= 8 * 60 && mins <= 18 * 60;
    };
    if (
      studentForm.preferredLearningDays.some(
        (d) => !studentForm.slotTimes[d] || !timeOk(studentForm.slotTimes[d]),
      )
    ) {
      pushToast({
        title: t("attendance.error", "Invalid selection"),
        description: t("attendance.students.timesRequired", "Choose a time (08:00–18:00) for each selected day."),
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
        timeSlots: studentForm.preferredLearningDays.map((day) => ({
          day,
          startTime: studentForm.slotTimes[day],
        })),
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
        slotTimes: {},
        registrationStartDate: new Date().toISOString().split("T")[0],
        attendanceNumber: "",
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err && err.data
          ? (err.data as { message?: unknown }).message
          : undefined;
      pushToast({
        title: t("attendance.error", "Unable to register student"),
        description:
          typeof message === "string" && message.length > 0
            ? message
            : "Please try again",
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
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err && err.data
          ? (err.data as { message?: unknown }).message
          : undefined;
      pushToast({
        title: t("attendance.error", "Unable to register teacher"),
        description:
          typeof message === "string" && message.length > 0
            ? message
            : "Please try again",
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
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err && err.data
          ? (err.data as { message?: unknown }).message
          : undefined;
      pushToast({
        title: t("attendance.error", "Unable to update teacher attendance"),
        description:
          typeof message === "string" && message.length > 0
            ? message
            : "Please try again",
        variant: "error",
      });
    }
  };


  // Update student snapshot based on search results; do NOT auto-open the modal
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (searchResults.length === 1) {
      // Populate snapshot so it appears in results; selection/modal should only occur on explicit click
      setSelectedStudentSnapshot(searchResults[0]);
      // Do not auto-select or auto-open modal here—let the user click the result to open
    } else {
      setSelectedStudentId("");
      setSelectedStudentSnapshot(null);
    }
  }, [searchResults]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPastStudents((v) => !v)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      showPastStudents
                        ? "bg-secondary/20 text-secondary"
                        : "bg-background/60 text-foreground/70 hover:bg-background/80"
                    }`}
                  >
                    {showPastStudents
                      ? t("attendance.students.showActive", "Active students")
                      : t("attendance.students.showPast", "Past students")}
                  </button>
                  {!showPastStudents && (
                    <button
                      type="button"
                      onClick={() => setShowAddStudentModal(true)}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg hover:opacity-90"
                    >
                      <UserPlus className="h-4 w-4" />
                      {t("attendance.addStudent", "Add Student")}
                    </button>
                  )}
                </div>
              </div>

              {/* Past (reverted) students — read-only history */}
              {showPastStudents && (
                <div className="space-y-3">
                  {pastStudents.length === 0 ? (
                    <p className="rounded-xl card-elevated px-4 py-6 text-center text-sm text-foreground/60">
                      {t("attendance.students.noPast", "No past students yet.")}
                    </p>
                  ) : (
                    pastStudents.map((p) => {
                      const branchName =
                        typeof p.branchId === "object" && p.branchId !== null
                          ? p.branchId.name
                          : "—";
                      return (
                        <div
                          key={p._id}
                          className="flex items-center justify-between rounded-xl card-elevated px-4 py-3 opacity-80"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-primary">{p.fullName}</span>
                            <span className="text-xs text-foreground/60">
                              {p.attendanceNumber} • {p.instrumentType} • {branchName}
                            </span>
                          </div>
                          <span className="rounded-full bg-secondary/10 px-3 py-1 text-[10px] font-semibold uppercase text-secondary">
                            {p.completionStatus ?? "completed"}
                            {p.completedAt ? ` · ${new Date(p.completedAt).toLocaleDateString()}` : ""}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {!showPastStudents && (
              <div className="space-y-3">
                {studentParticipants.length > 0 ? (
                  <>
                    {studentParticipants
                      .slice(
                        (studentsPage - 1) * studentsItemsPerPage,
                        (studentsPage - 1) * studentsItemsPerPage + studentsItemsPerPage,
                      )
                      .map((p) => {
                    const branchName =
                      typeof p.branchId === "object" && p.branchId !== null
                        ? p.branchId.name
                        : "Unknown";
                    return (
                      <div
                        key={p._id}
                        className="flex items-center justify-between rounded-xl card-elevated px-4 py-3 transition-all hover:shadow-md"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex flex-col">
                            <span className="font-semibold text-primary">{p.fullName}</span>
                            <span className="text-xs text-foreground/60">
                              {p.attendanceNumber} • {p.instrumentType} • {branchName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectStudent(p._id)}
                              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold bg-secondary/15 text-secondary hover:bg-secondary/25"
                              aria-label={t("attendance.students.record", "Record attendance")}
                              title={t("attendance.students.record", "Record attendance")}
                            >
                              <ClipboardCheck className="h-4 w-4" />
                              <span className="hidden sm:inline">
                                {t("attendance.students.recordShort", "Record")}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleShowAttendanceHistory(p._id)}
                              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold bg-background/60 hover:bg-background/80"
                              aria-label={t("attendance.history.view", "View history")}
                              title={t("attendance.history.view", "View history")}
                            >
                              <Clock className="h-4 w-4" />
                            </button>
                            {p.userId && (
                              <button
                                type="button"
                                onClick={() =>
                                  setRevertTarget({ userId: p.userId as string, name: p.fullName })
                                }
                                className="inline-flex items-center rounded-full px-3 py-2 text-xs font-semibold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                              >
                                {t("attendance.students.revert", "Revert to user")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                      })}
                    {studentParticipants.length > 0 && (
                      <div className="border-t border-border/70 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                              {t("pagination.itemsPerPage", "Items per page")}:
                            </label>
                            <select
                              value={studentsItemsPerPage}
                              onChange={(e) => {
                                setStudentsItemsPerPage(Number(e.target.value));
                                setStudentsPage(1);
                              }}
                              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                            >
                              <option value={5}>5</option>
                              <option value={10}>10</option>
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                          </div>
                          <Pagination
                            currentPage={studentsPage}
                            totalPages={Math.ceil(
                              studentParticipants.length / studentsItemsPerPage,
                            )}
                            totalItems={studentParticipants.length}
                            itemsPerPage={studentsItemsPerPage}
                            onPageChange={setStudentsPage}
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="py-8 text-center text-sm text-foreground/60">
                    {t(
                      "attendance.students.none",
                      "No students registered for attendance yet.",
                    )}
                  </p>
                )}
              </div>
              )}
            </div>

            {/* No-show review */}
            <NoShowReview />

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

              <div className="space-y-6">
                {/* Attendance number input */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("attendance.students.search", "Search by Name or Attendance Number")}
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleSearchClick}
                      aria-label="Search"
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-foreground/60 hover:text-foreground/80 z-20"
                    >
                      <Search className="h-5 w-5" />
                    </button>
                    <input
                      type="text"
                      value={studentCode}
                      onChange={(e) => handleStudentCodeChange(e.target.value)}
                      autoFocus
                      placeholder={t("attendance.students.searchPlaceholder", "Enter name or attendance number")}
                      className="w-full rounded-2xl card-elevated pl-14 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                    />
                  </div>
                  {lookingUpStudent && (
                    <p className="mt-2 text-xs text-foreground/60">
                      {t("attendance.students.lookingUp", "Looking up student...")}
                    </p>
                  )}
                  
                  {/* Search results dropdown (show single or multiple matches) */}
                  {studentCode.trim().length >= 1 && searchExecuted && searchResults.length > 0 && (
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

                <p className="text-xs text-foreground/60">
                  {t(
                    "attendance.students.searchHint",
                    "Select a student from the results to record attendance.",
                  )}
                </p>
              </div>

              {/* Record attendance modal */}
              <AnimatePresence>
                {showRecordAttendanceModal && selectedStudent && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
                    onClick={() => setShowRecordAttendanceModal(false)}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="relative flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-2xl surface-elevated shadow-[0_20px_60px_var(--color-primary-glow)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-start justify-between border-b border-border p-5">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                            {t("attendance.students.record", "Record Student Attendance")}
                          </p>
                          <h3 className="text-xl font-serif text-primary">
                            {selectedStudent.fullName}
                          </h3>
                          <p className="mt-1 text-xs text-foreground/60">
                            {t("attendance.students.code", "Attendance #")}:{" "}
                            {selectedStudent.attendanceNumber} •{" "}
                            {selectedStudent.instrumentType}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowRecordAttendanceModal(false)}
                          className="rounded-full p-2 text-foreground/70 hover:bg-secondary/10 transition"
                          aria-label="Close"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                        {studentDetails && (
                          <div className="rounded-xl card-elevated p-4">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-foreground/60">
                                  {t("attendance.students.totalAttendance", "Total Sessions")}
                                </p>
                                <p className="font-semibold text-primary">
                                  {studentDetails.totalAttendance}
                                </p>
                              </div>
                              <div>
                                <p className="text-foreground/60">
                                  {t("attendance.students.lastAttendance", "Last Attendance")}
                                </p>
                                <p className="font-semibold text-primary">
                                  {studentDetails.lastAttendance &&
                                  studentDetails.lastAttendance.sessionDate
                                    ? new Date(
                                        studentDetails.lastAttendance.sessionDate,
                                      ).toLocaleDateString()
                                    : t("attendance.students.none", "—")}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <form onSubmit={handleStudentSubmit} className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                                {t("attendance.students.date", "Session Date")}
                              </label>
                              <input
                                type="date"
                                value={recordDate}
                                max={recordDate > new Date().toISOString().slice(0, 10) ? recordDate : new Date().toISOString().slice(0, 10)}
                                onChange={(e) => setRecordDate(e.target.value)}
                                className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                                {t("attendance.students.lesson", "Lesson")}
                                {status === "present" || status === "late" ? " *" : ""}
                              </label>
                              <select
                                value={selectedLessonId}
                                onChange={(e) => setSelectedLessonId(e.target.value)}
                                className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                                required={status === "present" || status === "late"}
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
                                <option value="late">
                                  {t("attendance.status.late", "Late")}
                                </option>
                                <option value="excused">
                                  {t("attendance.status.excused", "Excused")}
                                </option>
                                <option value="absent">
                                  {t("attendance.status.absent", "Absent")}
                                </option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                              {t("attendance.students.note", "Note (optional)")}
                            </label>
                            <input
                              type="text"
                              value={recordNote}
                              onChange={(e) => setRecordNote(e.target.value)}
                              placeholder={t("attendance.students.notePlaceholder", "e.g. reason for excused/absent")}
                              className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                            />
                          </div>

                          <div className="flex justify-end gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setShowRecordAttendanceModal(false)}
                              className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-background/60"
                            >
                              {t("common.cancel", "Cancel")}
                            </button>
                            <button
                              type="submit"
                              disabled={
                                recordingStudent ||
                                ((status === "present" || status === "late") && !selectedLessonId)
                              }
                              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg disabled:opacity-60"
                            >
                              {recordingStudent && (
                                <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                              )}
                              {t("attendance.students.save", "Register attendance")}
                            </button>
                          </div>
                        </form>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Attendance History Modal */}
              <AnimatePresence>
                {showAttendanceHistoryModal && attendanceHistoryStudentId && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
                    onClick={() => {
                      setShowAttendanceHistoryModal(false);
                      setAttendanceHistoryStudentId(null);
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="relative flex w-full max-w-3xl max-h-[80vh] flex-col overflow-hidden rounded-2xl surface-elevated shadow-[0_20px_60px_var(--color-primary-glow)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-start justify-between border-b border-border p-5">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-secondary">{t("attendance.history.title", "Attendance History")}</p>
                          <h3 className="text-xl font-serif text-primary">{attendanceHistoryStudent?.fullName ?? t("attendance.history.unknown", "Student")}</h3>
                          <p className="mt-1 text-xs text-foreground/60">{t("attendance.students.code", "Attendance #")}: {attendanceHistoryStudent?.attendanceNumber ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => { setShowAttendanceHistoryModal(false); setAttendanceHistoryStudentId(null); }} className="rounded-full p-2 text-foreground/70 hover:bg-secondary/10 transition" aria-label="Close">
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 min-h-0 overflow-y-auto p-5">
                        {/* Attendance list */}
                        {loadingAttendanceHistory ? (
                          <p className="py-6 text-sm text-foreground/60 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t("attendance.history.loading", "Loading records...")}</p>
                        ) : attendanceHistory.length === 0 ? (
                          <p className="py-6 text-sm text-foreground/60">{t("attendance.history.empty", "No attendance records found.")}</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                              <thead>
                                <tr className="text-xs uppercase tracking-[0.25em] text-secondary/70">
                                  <th className="px-3 py-2">#</th>
                                  <th className="px-3 py-2">{t("attendance.history.table.date", "Date")}</th>
                                  <th className="px-3 py-2">{t("attendance.history.table.time", "Time")}</th>
                                  <th className="px-3 py-2">{t("attendance.history.table.day", "Day")}</th>
                                  <th className="px-3 py-2">{t("attendance.history.table.lesson", "Lesson")}</th>
                                  <th className="px-3 py-2">{t("attendance.history.table.revised", "Revised")}</th>
                                  <th className="px-3 py-2">{t("attendance.history.table.status", "Status")}</th>
                                  <th className="px-3 py-2">{t("attendance.history.table.actions", "Actions")}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/60">
                                {attendanceHistory.map(
                                  (rec: AttendanceHistoryRecord, idx: number) => {
                                  const dt = new Date(rec.date);
                                  const isEditing = editingRecordId === rec._id;
                                  return (
                                    <tr key={rec._id || `${rec.date}-${rec.status}`} className="interactive-row">
                                      <td className="px-3 py-3 align-top text-xs text-foreground/70">{idx + 1}</td>
                                      <td className="px-3 py-3 align-top">{dt.toLocaleDateString()}</td>
                                      <td className="px-3 py-3 align-top">{dt.toLocaleTimeString()}</td>
                                      <td className="px-3 py-3 align-top text-xs text-foreground/70">{dt.toLocaleDateString(undefined, { weekday: 'long' })}</td>
                                      <td className="px-3 py-3 align-top text-xs text-foreground/70">{rec.lesson?.title ?? '—'}</td>
                                      <td className="px-3 py-3 align-top text-xs text-foreground/70">{rec.revisedLesson?.title ?? '—'}</td>
                                      <td className="px-3 py-3 align-top">
                                        {isEditing ? (
                                          <select
                                            value={editStatus}
                                            onChange={(e) => setEditStatus(e.target.value as AttendanceStatus)}
                                            className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-secondary/30"
                                          >
                                            <option value="present">{t("attendance.status.present", "Present")}</option>
                                            <option value="late">{t("attendance.status.late", "Late")}</option>
                                            <option value="excused">{t("attendance.status.excused", "Excused")}</option>
                                            <option value="absent">{t("attendance.status.absent", "Absent")}</option>
                                          </select>
                                        ) : (
                                          <span className="inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold bg-foreground/5 text-foreground/80">{rec.status}</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-3 align-top">
                                        {isEditing ? (
                                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                                            <input
                                              type="text"
                                              value={editNote}
                                              onChange={(e) => setEditNote(e.target.value)}
                                              placeholder={t("attendance.history.notePlaceholder", "Note (optional)")}
                                              className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-secondary/30 sm:max-w-[140px]"
                                            />
                                            <div className="flex items-center gap-1">
                                              <button
                                                type="button"
                                                disabled={isUpdatingAttendance}
                                                onClick={() => handleSaveEditRecord(rec._id)}
                                                className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary disabled:opacity-60"
                                              >
                                                {t("common.save", "Save")}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={handleCancelEditRecord}
                                                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 hover:bg-background/60"
                                              >
                                                {t("common.cancel", "Cancel")}
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => handleStartEditRecord(rec)}
                                              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 hover:bg-secondary/10"
                                            >
                                              {t("common.edit", "Edit")}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setConfirmDeleteRecordId(rec._id)}
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

                      <div className="flex items-center justify-end gap-3 border-t border-border p-4">
                        <button type="button" onClick={() => { setShowAttendanceHistoryModal(false); setAttendanceHistoryStudentId(null); }} className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-background/60">{t("common.close", "Close")}</button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
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
                  <>
                    {teacherParticipants
                      .slice(
                        (teachersPage - 1) * teachersItemsPerPage,
                        (teachersPage - 1) * teachersItemsPerPage + teachersItemsPerPage,
                      )
                      .map((p) => {
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
                      })}
                    {teacherParticipants.length > 0 && (
                      <div className="border-t border-border/70 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                              {t("pagination.itemsPerPage", "Items per page")}:
                            </label>
                            <select
                              value={teachersItemsPerPage}
                              onChange={(e) => {
                                setTeachersItemsPerPage(Number(e.target.value));
                                setTeachersPage(1);
                              }}
                              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                            >
                              <option value={5}>5</option>
                              <option value={10}>10</option>
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                          </div>
                          <Pagination
                            currentPage={teachersPage}
                            totalPages={Math.ceil(
                              teacherParticipants.length / teachersItemsPerPage,
                            )}
                            totalItems={teacherParticipants.length}
                            itemsPerPage={teachersItemsPerPage}
                            onPageChange={setTeachersPage}
                          />
                        </div>
                      </div>
                    )}
                  </>
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
                  {todayAttendance
                    .slice(
                      (todayPage - 1) * todayItemsPerPage,
                      (todayPage - 1) * todayItemsPerPage + todayItemsPerPage,
                    )
                    .map((rec) => {
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
                  {todayAttendance.length > 0 && (
                    <div className="border-t border-border/70 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                            {t("pagination.itemsPerPage", "Items per page")}:
                          </label>
                          <select
                            value={todayItemsPerPage}
                            onChange={(e) => {
                              setTodayItemsPerPage(Number(e.target.value));
                              setTodayPage(1);
                            }}
                            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                        <Pagination
                          currentPage={todayPage}
                          totalPages={Math.ceil(
                            todayAttendance.length / todayItemsPerPage,
                          )}
                          totalItems={todayAttendance.length}
                          itemsPerPage={todayItemsPerPage}
                          onPageChange={setTodayPage}
                        />
                      </div>
                    </div>
                  )}
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
                      {eligibility
                        .slice(
                          (eligibilityPage - 1) * eligibilityItemsPerPage,
                          (eligibilityPage - 1) * eligibilityItemsPerPage +
                            eligibilityItemsPerPage,
                        )
                        .map((item: GraduationEligibilityItem) => {
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
                          <tr key={item.participantId} className="interactive-row">
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
                  {eligibility.length > 0 && (
                    <div className="border-t border-border/70 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                            {t("pagination.itemsPerPage", "Items per page")}:
                          </label>
                          <select
                            value={eligibilityItemsPerPage}
                            onChange={(e) => {
                              setEligibilityItemsPerPage(Number(e.target.value));
                              setEligibilityPage(1);
                            }}
                            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                        <Pagination
                          currentPage={eligibilityPage}
                          totalPages={Math.ceil(
                            eligibility.length / eligibilityItemsPerPage,
                          )}
                          totalItems={eligibility.length}
                          itemsPerPage={eligibilityItemsPerPage}
                          onPageChange={setEligibilityPage}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Attendance Record */}
      {confirmDeleteRecordId && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setConfirmDeleteRecordId(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl surface-elevated p-6 shadow-[0_20px_60px_var(--color-primary-glow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-serif text-primary">
              {t("attendance.history.deleteTitle", "Delete attendance record?")}
            </h3>
            <p className="mt-2 text-sm text-foreground/70">
              {t(
                "attendance.history.deleteConfirm",
                "This permanently removes the attendance record. Lesson progress and billing for this student will recalculate.",
              )}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteRecordId(null)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-background/60"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                disabled={isDeletingAttendance}
                onClick={handleConfirmDeleteRecord}
                className="btn-danger-strong rounded-full px-5 py-2 text-sm"
              >
                {t("common.delete", "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {revertTarget && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setRevertTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl surface-elevated p-6 shadow-[0_20px_60px_var(--color-primary-glow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-serif text-primary">
              {t("attendance.students.revertTitle", "Revert student to user")}
            </h3>
            <p className="mt-2 text-sm text-foreground/70">
              {t(
                "attendance.students.revertConfirm",
                "This moves the student back to a regular user. Their record is soft-deleted, but all attendance and payment history is preserved.",
              )}{" "}
              <span className="font-semibold text-foreground">{revertTarget.name}</span>
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
              {t("attendance.students.revertReason", "Reason")}
            </label>
            <select
              value={revertReason}
              onChange={(e) =>
                setRevertReason(e.target.value as "completed" | "withdrawn" | "dropped")
              }
              className="mt-1 w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
            >
              <option value="completed">{t("attendance.students.reasonCompleted", "Completed package")}</option>
              <option value="withdrawn">{t("attendance.students.reasonWithdrawn", "Withdrawn")}</option>
              <option value="dropped">{t("attendance.students.reasonDropped", "Dropped")}</option>
            </select>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setRevertTarget(null)}
                className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground/80 hover:bg-background/60"
              >
                {t("button.cancel", "Cancel")}
              </button>
              <button
                type="button"
                onClick={handleRevertStudent}
                disabled={revertingStudent}
                className="flex-1 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {revertingStudent
                  ? t("attendance.students.reverting", "Reverting...")
                  : t("attendance.students.revert", "Revert to user")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddStudentModal && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
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
                        setStudentForm((prev) => {
                          const current = prev.preferredLearningDays;
                          const isOn = current.includes(day);
                          const newDays = isOn
                            ? current.filter((d) => d !== day)
                            : current.length < expectedDaysPerWeek
                              ? [...current, day]
                              : current;
                          const nextTimes = { ...prev.slotTimes };
                          if (isOn) {
                            delete nextTimes[day];
                          } else if (newDays.includes(day)) {
                            nextTimes[day] = nextTimes[day] ?? "12:00";
                          }
                          return { ...prev, preferredLearningDays: newDays, slotTimes: nextTimes };
                        });
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

              {studentForm.preferredLearningDays.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("attendance.students.sessionTimes", "Session Time per Day")} *
                  </label>
                  <p className="mb-2 text-xs text-foreground/60">
                    {t("attendance.students.sessionTimesHint", "1.5-hour sessions. Start time between 08:00 and 18:00.")}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {DAYS_OF_WEEK.filter((d) =>
                      studentForm.preferredLearningDays.includes(d),
                    ).map((d) => (
                      <div
                        key={d}
                        className="flex items-center justify-between gap-3 rounded-xl card-elevated px-3 py-2"
                      >
                        <span className="text-sm font-medium text-foreground">{DAY_LABELS[d]}</span>
                        <input
                          type="time"
                          min="08:00"
                          max="18:00"
                          step={1800}
                          value={studentForm.slotTimes[d] ?? ""}
                          onChange={(e) =>
                            setStudentForm((prev) => ({
                              ...prev,
                              slotTimes: { ...prev.slotTimes, [d]: e.target.value },
                            }))
                          }
                          className="rounded-lg bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
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
