import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery, baseUrl } from "./baseQuery";
import type { InstrumentType } from "./storeApi";

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type LearningType = 'physical' | 'online';
export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

/** URL for the admin attendance CSV export (cookie-authed download). */
export function getAttendanceExportUrl(filters: { from?: string; to?: string; participantId?: string }): string {
  const p = new URLSearchParams();
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  if (filters.participantId) p.set("participantId", filters.participantId);
  const qs = p.toString();
  return `${baseUrl}/attendance/export${qs ? `?${qs}` : ""}`;
}

export type TeachingTimeRange = {
  day: DayOfWeek;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
};

export type TeacherParticipant = {
  _id: string;
  fullName: string;
  instruments: InstrumentType[];
  teachingDays: DayOfWeek[];
  timeRanges: TeachingTimeRange[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TimeSlot = { day: DayOfWeek; startTime: string };

export type StudentParticipant = {
  _id: string;
  userId?: string;
  fullName: string;
  attendanceNumber: string;
  branchId: {
    _id: string;
    name: string;
    slug: string;
  } | string;
  learningType: LearningType;
  instrumentType: InstrumentType;
  programDurationMonths: 3 | 6 | 9;
  preferredLearningDays: DayOfWeek[];
  timeSlots?: TimeSlot[];
  registrationStartDate: string;
  learningDaysPerWeek: number;
  isActive: boolean;
  completionStatus?: "active" | "completed" | "withdrawn" | "dropped";
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type InstrumentLesson = {
  _id: string;
  classId: string;
  instrumentType?: InstrumentType;
  level?: "beginner" | "advanced";
  title: string;
  code?: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TeacherAttendanceRecord = {
  _id: string;
  participantId: {
    _id: string;
    fullName: string;
    instruments: InstrumentType[];
    teachingDays: DayOfWeek[];
  } | string;
  checkInAt: string;
  checkOutAt?: string;
  durationMinutes?: number;
  recordedBy?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

export type RegisterTeacherParticipantBody = {
  fullName: string;
  email: string;
  instruments: InstrumentType[];
  teachingDays: DayOfWeek[];
  timeRanges: TeachingTimeRange[];
};

export type RegisterStudentParticipantBody = {
  fullName: string;
  email: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  occupation?: string;
  city?: string;
  address?: string;
  branchId?: string;
  learningType: LearningType;
  instrumentType: InstrumentType;
  programDurationMonths: 3 | 6 | 9;
  preferredLearningDays: DayOfWeek[];
  timeSlots?: TimeSlot[];
  registrationStartDate: string;
  attendanceNumber?: string;
};

export type RecordStudentAttendanceBody = {
  participantId: string;
  lessonId?: string;
  revisedLessonId?: string;
  status?: AttendanceStatus;
  sessionDate?: string;
  note?: string;
};

export type NoShow = {
  participantId: string;
  userId: string | null;
  fullName: string;
  attendanceNumber: string;
  instrumentType: InstrumentType;
};

export type NoShowResponse = {
  date: string;
  closed: boolean;
  noShows: NoShow[];
};

export type ClosedDay = {
  _id: string;
  date: string;
  branchId?: { _id: string; name: string } | string | null;
  reason?: string;
};

export type AttendanceSummary = {
  total: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  attendanceRate: number;
};

export type BillingSummary = {
  year: number;
  month: number;
  totalActiveStudents: number;
  paidCount: number; // up-to-date students
  unpaidCount: number; // students with an outstanding (suggested) balance
  items: {
    participantId: string;
    fullName: string;
    attendanceNumber: string;
    instrumentType: InstrumentType;
    monthlyFee?: number;
    periodsConsumed: number;
    periodsSettled: number;
    suggestedOwed: number;
    nextDuePeriod: number;
    windowExceeded: boolean;
    status: "paid" | "unpaid";
  }[];
};

/** Consumption-based billing state for a student (advisory). */
export type StudentBillingState = {
  periodsConsumed: number;
  periodsSettled: number;
  suggestedOwed: number;
  overdue: boolean;
  nextDuePeriod: number;
  monthlyFee?: number;
  maxBillable: number;
  windowExceeded: boolean;
  expectedSessionsPerPeriod: number;
  currentWindowAttended: number;
  /** ISO date — when the current ~30-day billing window opened. */
  currentWindowStart: string;
  /** ISO date — when the current window closes (next attended session after this opens a new period). */
  currentWindowEnd: string;
  /** Days until currentWindowEnd (may be negative if the window already passed). */
  daysUntilWindowEnd: number;
  programDurationMonths?: number;
};

export type RecordStudentPaymentBody = {
  participantId: string;
  amount: number;
  status: "paid" | "unpaid" | "waived";
  // Optional: billing period to settle (defaults to next unsettled period server-side).
  period?: number;
  // Optional: number of consecutive periods this payment covers (advance payment).
  coversPeriods?: number;
  // Optional metadata (server derives from the period window when omitted).
  month?: number;
  year?: number;
  note?: string;
  receiptUrl?: string;
};

export type GraduationEligibilityStatus =
  | "eligible"
  | "nearlyEligible"
  | "notEligible";

export type GraduationEligibilityItem = {
  participantId: string;
  fullName: string;
  attendanceNumber: string;
  instrumentType: InstrumentType;
  branchId: string | {
    _id: string;
    name: string;
    slug?: string;
  };
  programDurationMonths: 3 | 6 | 9;
  registrationStartDate: string;
  programEndDate: string;
  totalSessions: number;
  monthsPaid: number;
  expectedMonths: number;
  requiredSessions: number;
  status: GraduationEligibilityStatus;
  reasons: string[];
};

export type OverduePaymentAdmin = {
  participantId: string;
  fullName: string;
  attendanceNumber: string;
  instrumentType: string;
  email?: string;
  year: number;
  month: number;
  dueDate: string;
  period?: number;
  nextDuePeriod?: number;
  periodsOwed?: number;
  windowExceeded?: boolean;
  autoReminders?: boolean;
  daysOverdue: number;
  amount?: number;
  /** Amount already received toward the next due period from a partial payment. */
  paidToDate?: number;
  /** Remaining balance for the next due period = amount - paidToDate. */
  remainingAmount?: number;
  status?: "paid" | "unpaid";
};

export const attendanceApi = createApi({
  reducerPath: "attendanceApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: [
    "TeacherParticipants",
    "StudentParticipants",
    "TeacherToday",
    "TeacherAttendance",
    "Lessons",
    "Billing",
    "Eligibility",
    "StudentAttendance",
    "StudentPayments",
  ],
  endpoints: (builder) => ({
    getTeacherParticipants: builder.query<TeacherParticipant[], void>({
      query: () => "/attendance/teachers/participants",
      providesTags: ["TeacherParticipants"],
    }),
    getStudentParticipants: builder.query<StudentParticipant[], void>({
      query: () => "/attendance/students/participants",
      providesTags: ["StudentParticipants"],
    }),
    /** Teacher-only: the students enrolled in classes this teacher teaches. */
    getMyTeachingStudents: builder.query<(StudentParticipant & { classTitle?: string })[], void>({
      query: () => "/attendance/teachers/my-students",
      providesTags: ["StudentParticipants"],
    }),
    getStudentByAttendanceNumber: builder.query<StudentParticipant, string>({
      query: (attendanceNumber) => `/attendance/students/lookup/${attendanceNumber}`,
    }),
    searchStudents: builder.query<StudentParticipant[], string>({
      query: (query) => ({
        url: "/attendance/students/search",
        params: { q: query },
      }),
      providesTags: ["StudentParticipants"],
    }),
    getStudentDetails: builder.query<
      StudentParticipant & {
        lastAttendance?: {
          sessionDate?: string | null;
          status?: "present" | "late" | "excused" | "absent";
        } | null;
        totalAttendance: number;
        paidMonths: number;
        unpaidMonths: number;
        totalPayments: number;
      },
      string
    >({
      query: (id) => ({
        url: `/attendance/students/${id}/details`,
      }),
      providesTags: ["StudentParticipants"],
    }),
    registerTeacherParticipant: builder.mutation<
      TeacherParticipant,
      RegisterTeacherParticipantBody
    >({
      query: (body) => ({
        url: "/attendance/teachers/register",
        method: "POST",
        body,
      }),
      invalidatesTags: ["TeacherParticipants"],
    }),
    registerStudentParticipant: builder.mutation<
      StudentParticipant,
      RegisterStudentParticipantBody
    >({
      query: (body) => ({
        url: "/attendance/students/register",
        method: "POST",
        body,
      }),
      invalidatesTags: ["StudentParticipants"],
    }),
    teacherCheckIn: builder.mutation<
      TeacherAttendanceRecord,
      { participantId: string }
    >({
      query: (body) => ({
        url: "/attendance/teachers/check-in",
        method: "POST",
        body,
      }),
      invalidatesTags: ["TeacherToday"],
    }),
    teacherCheckOut: builder.mutation<
      TeacherAttendanceRecord,
      { participantId: string }
    >({
      query: (body) => ({
        url: "/attendance/teachers/check-out",
        method: "POST",
        body,
      }),
      invalidatesTags: ["TeacherToday"],
    }),
    getTodayTeacherAttendance: builder.query<TeacherAttendanceRecord[], void>({
      query: () => "/attendance/teachers/today",
      providesTags: ["TeacherToday"],
    }),
    recordStudentAttendance: builder.mutation<unknown, RecordStudentAttendanceBody>({
      query: (body) => ({
        url: "/attendance/students/record",
        method: "POST",
        body,
      }),
      invalidatesTags: ["StudentParticipants", "StudentAttendance"],
    }),
    updateAttendanceRecord: builder.mutation<
      unknown,
      { id: string; status?: AttendanceStatus; lessonId?: string; note?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/attendance/students/record/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["StudentAttendance"],
    }),
    deleteAttendanceRecord: builder.mutation<unknown, string>({
      query: (id) => ({ url: `/attendance/students/record/${id}`, method: "DELETE" }),
      invalidatesTags: ["StudentAttendance"],
    }),
    getNoShows: builder.query<NoShowResponse, string>({
      query: (date) => `/attendance/no-shows?date=${date}`,
      providesTags: ["StudentAttendance"],
    }),
    markNoShowsAbsent: builder.mutation<
      { marked: number },
      { date: string; participantIds: string[] }
    >({
      query: (body) => ({ url: "/attendance/no-shows/mark-absent", method: "POST", body }),
      invalidatesTags: ["StudentAttendance", "StudentParticipants"],
    }),
    revertNoShows: builder.mutation<
      { reverted: number },
      { date: string; participantIds: string[] }
    >({
      query: (body) => ({ url: "/attendance/no-shows/revert", method: "POST", body }),
      invalidatesTags: ["StudentAttendance", "StudentParticipants"],
    }),
    getClosedDays: builder.query<ClosedDay[], void>({
      query: () => "/attendance/closed-days",
      providesTags: ["StudentAttendance"],
    }),
    createClosedDay: builder.mutation<
      ClosedDay,
      { date: string; branchId?: string; reason?: string }
    >({
      query: (body) => ({ url: "/attendance/closed-days", method: "POST", body }),
      invalidatesTags: ["StudentAttendance"],
    }),
    deleteClosedDay: builder.mutation<unknown, string>({
      query: (id) => ({ url: `/attendance/closed-days/${id}`, method: "DELETE" }),
      invalidatesTags: ["StudentAttendance"],
    }),
    getStudentSummary: builder.query<AttendanceSummary, string>({
      query: (userId) => `/attendance/students/${userId}/summary`,
      providesTags: ["StudentAttendance"],
    }),
    getMyAttendanceSummary: builder.query<AttendanceSummary, void>({
      query: () => "/attendance/students/me/summary",
      providesTags: ["StudentAttendance"],
    }),
    getInstrumentLessons: builder.query<
      InstrumentLesson[],
      { classId?: string } | undefined
    >({
      query: (arg) => ({
        url: "/classes/lessons",
        params: arg?.classId ? { classId: arg.classId } : {},
      }),
      providesTags: ["Lessons"],
    }),
    createLesson: builder.mutation<
      InstrumentLesson,
      { classId: string; title: string; code?: string; order?: number }
    >({
      query: (body) => ({
        url: "/classes/lessons",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Lessons"],
    }),
    updateLesson: builder.mutation<
      InstrumentLesson,
      { id: string; classId?: string; title?: string; code?: string; order?: number; isActive?: boolean }
    >({
      query: ({ id, ...body }) => ({
        url: `/classes/lessons/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Lessons"],
    }),
    deleteLesson: builder.mutation<
      { success: boolean },
      string
    >({
      query: (id) => ({
        url: `/classes/lessons/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Lessons"],
    }),
    getBillingSummary: builder.query<
      BillingSummary,
      { year?: number; month?: number } | void
    >({
      query: (params) => ({
        url: "/attendance/billing/summary",
        params: params ?? {},
      }),
      providesTags: ["Billing"],
    }),
    recordStudentPayment: builder.mutation<
      unknown,
      RecordStudentPaymentBody
    >({
      query: (body) => ({
        url: "/attendance/billing/pay",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Billing"],
    }),
    getGraduationEligibility: builder.query<GraduationEligibilityItem[], void>({
      query: () => ({
        url: "/attendance/graduation/eligibility",
      }),
      providesTags: ["Eligibility"],
    }),
    getMyAttendance: builder.query<
      Array<{
        _id: string;
        sessionDate: string;
        status: AttendanceStatus;
        lessonId: { _id: string; title: string; code?: string };
        revisedLessonId?: { _id: string; title: string; code?: string };
      }>,
      void
    >({
      query: () => "/attendance/students/me/attendance",
      providesTags: ["StudentAttendance"],
    }),
    getMyPayments: builder.query<
      Array<{
        _id: string;
        year: number;
        month: number;
        amount: number;
        paidToDate?: number;
        status: "paid" | "unpaid" | "waived";
        dueDate?: string;
        period?: number;
        isOverdue?: boolean;
        note?: string;
        createdAt?: string;
      }>,
      void
    >({
      query: () => "/attendance/students/me/payments",
      providesTags: ["StudentPayments"],
    }),
    getMyBilling: builder.query<StudentBillingState, void>({
      query: () => "/attendance/students/me/billing",
      providesTags: ["StudentPayments"],
    }),
    // Admin-only manual conversion of a specific user (recovery tool).
    convertUserToStudent: builder.mutation<
      { message: string; student: StudentParticipant },
      {
        userId: string;
        fullName: string;
        branchId?: string;
        learningType: LearningType;
        instrumentType: InstrumentType;
        programDurationMonths: 3 | 6 | 9;
        preferredLearningDays: DayOfWeek[];
        timeSlots?: TimeSlot[];
        registrationStartDate: string;
        preferredSchedule?: string;
        phone?: string;
        emergencyContactName?: string;
        emergencyContactPhone?: string;
        occupation?: string;
        city?: string;
        address?: string;
        amount: number;
        currency?: string;
        paymentMethod: string;
        paymentReference: string;
        note?: string;
      }
    >({
      query: ({ userId, ...body }) => ({
        url: `/attendance/students/convert/${userId}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["StudentParticipants"],
    }),
    // Admin reverts a student back to a regular user (history preserved).
    revertStudentToUser: builder.mutation<
      { message: string; reason: string; participantId: string },
      { userId: string; reason: "completed" | "withdrawn" | "dropped" }
    >({
      query: ({ userId, reason }) => ({
        url: `/attendance/students/${userId}/revert`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["StudentParticipants"],
    }),
    getPastStudents: builder.query<StudentParticipant[], void>({
      query: () => "/attendance/students/past",
      providesTags: ["StudentParticipants"],
    }),
    getOverduePayments: builder.query<OverduePaymentAdmin[], void>({
      query: () => "/attendance/payments/overdue",
      providesTags: ["StudentPayments"],
    }),
    getStudentAttendanceReport: builder.query<
      {
        student: {
          fullName: string;
          attendanceNumber?: string;
          instrumentType: InstrumentType;
          registrationStartDate: string;
          branch?: { _id: string; name: string } | string;
          learningType: LearningType;
          programDurationMonths: 3 | 6 | 9;
        };
        attendanceRecords: Array<{
          _id: string;
          date: string;
          lesson?: { _id?: string; title?: string; code?: string } | null;
          revisedLesson?: { _id?: string; title?: string; code?: string } | null;
          status: AttendanceStatus;
          note?: string | null;
          recordedBy?: { _id?: string; firstName?: string; lastName?: string; email?: string } | null;
        }>;
        totalSessions: number;
        presentCount: number;
        lateCount: number;
        absentCount: number;
        excusedCount: number;
        attendanceRate: number;
        generatedAt: string;
      },
      string
    >({
      // Backend endpoint: GET /attendance/reports/student/:id/attendance
      query: (studentId) => `/attendance/reports/student/${studentId}/attendance`,
      providesTags: ["StudentAttendance"],
    }),
    getStudentPaymentReport: builder.query<
      {
        student: {
          fullName: string;
          attendanceNumber?: string;
          instrumentType?: string;
          registrationStartDate?: string;
          branch?: unknown;
          monthlyFee?: number;
        };
        payments: Array<{
          month: number;
          year: number;
          amount: number;
          paidToDate?: number;
          status: "paid" | "unpaid" | "waived";
          dueDate?: string | null;
          period?: number;
          paidAt?: string;
          note?: string;
          recordedBy?: unknown;
        }>;
        totalPaid: number;
        totalPayments: number;
        paidCount: number;
        unpaidCount: number;
        waivedCount: number;
        billing?: {
          periodsConsumed: number;
          periodsSettled: number;
          suggestedOwed: number;
          overdue: boolean;
          nextDuePeriod: number;
          maxBillable: number;
          windowExceeded: boolean;
          monthlyFee?: number;
        };
      },
      string
    >({
      // Server route: GET /attendance/reports/student/:id/payments
      query: (studentId) => `/attendance/reports/student/${studentId}/payments`,
      providesTags: ["StudentPayments"],
    }),
    getTeacherAttendanceReport: builder.query<
      {
        teacher: { fullName?: string; instruments?: string[]; teachingDays?: string[] };
        attendanceRecords: Array<{
          checkInAt: string;
          checkOutAt?: string;
          durationMinutes?: number;
          recordedBy?: unknown;
        }>;
        totalSessions: number;
        totalHours: number;
        generatedAt: string;
      },
      { teacherId: string; startDate?: string; endDate?: string }
    >({
      query: ({ teacherId, startDate, endDate }) => ({
        url: `/attendance/reports/teacher/${teacherId}/attendance`,
        params: startDate && endDate ? { startDate, endDate } : undefined,
      }),
      providesTags: ["TeacherAttendance"],
    }),
    getTeacherAttendanceReportByUserId: builder.query<
      {
        teacher: { fullName?: string; instruments?: string[]; teachingDays?: string[] };
        attendanceRecords: Array<{
          checkInAt: string;
          checkOutAt?: string;
          durationMinutes?: number;
          recordedBy?: unknown;
        }>;
        totalSessions: number;
        totalHours: number;
        generatedAt: string;
      },
      { userId: string; startDate?: string; endDate?: string }
    >({
      query: ({ userId, startDate, endDate }) => ({
        url: `/attendance/reports/teacher/by-user/${userId}/attendance`,
        params: startDate && endDate ? { startDate, endDate } : undefined,
      }),
      providesTags: ["TeacherAttendance"],
    }),
    getMyUpcomingPayments: builder.query<
      Array<{
        year: number;
        month: number;
        dueDate: string;
        duedate?: string[];
        period?: number;
        dueDateInferred?: boolean;
        daysUntilDue: number;
        amount?: number;
        status?: "paid" | "unpaid";
      }>,
      { daysAhead?: number } | void
    >({
      query: (params) => ({
        url: "/attendance/students/me/upcoming-payments",
        params: params ?? {},
      }),
      providesTags: ["StudentPayments"],
    }),

    // Admin: upcoming payments for a given student id (look ahead in days)
    getStudentUpcomingPayments: builder.query<
      Array<{
        year: number;
        month: number;
        dueDate: string;
        duedate?: string[];
        period?: number;
        dueDateInferred?: boolean;
        daysUntilDue: number;
        amount?: number;
        status?: "paid" | "unpaid";
      }>,
      { id: string; daysAhead?: number }
    >({
      query: ({ id, daysAhead }) => ({
        url: `/attendance/students/${id}/upcoming-payments`,
        params: daysAhead ? { daysAhead } : {},
      }),
      providesTags: ["StudentPayments"],
    }),
    getUpcomingPaymentsSummary: builder.query<
      Array<{
        participantId: string;
        fullName: string;
        email: string;
        dueDate: string;
        daysUntilDue: number;
        amount?: number;
        year: number;
        month: number;
      }>,
      { daysAhead?: number } | void
    >({
      query: (params) => ({
        url: "/attendance/payments/upcoming-summary",
        params: params ? { daysAhead: params.daysAhead ?? 14 } : { daysAhead: 14 },
      }),
      providesTags: ["StudentPayments"],
    }),
    getLessonProgress: builder.query<
      {
        totalLessons: number;
        completedLessons: number;
        percentage: number;
        lessons: Array<{
          _id: string;
          title: string;
          code?: string;
          order?: number;
          isCompleted: boolean;
          lastAttendedAt: string | null;
        }>;
      },
      { classId: string }
    >({
      query: ({ classId }) => ({
        url: "/attendance/lessons/progress",
        params: { classId },
      }),
      providesTags: ["StudentAttendance"],
    }),
  }),
});

export const {
  useGetTeacherParticipantsQuery,
  useGetStudentParticipantsQuery,
  useGetMyTeachingStudentsQuery,
  useGetStudentByAttendanceNumberQuery,
  useSearchStudentsQuery,
  useGetStudentDetailsQuery,
  useRegisterTeacherParticipantMutation,
  useRegisterStudentParticipantMutation,
  useTeacherCheckInMutation,
  useTeacherCheckOutMutation,
  useGetTodayTeacherAttendanceQuery,
  useRecordStudentAttendanceMutation,
  useUpdateAttendanceRecordMutation,
  useDeleteAttendanceRecordMutation,
  useGetNoShowsQuery,
  useMarkNoShowsAbsentMutation,
  useRevertNoShowsMutation,
  useGetClosedDaysQuery,
  useCreateClosedDayMutation,
  useDeleteClosedDayMutation,
  useGetStudentSummaryQuery,
  useGetMyAttendanceSummaryQuery,
  useGetInstrumentLessonsQuery,
  useCreateLessonMutation,
  useUpdateLessonMutation,
  useDeleteLessonMutation,
  useGetBillingSummaryQuery,
  useRecordStudentPaymentMutation,
  useGetGraduationEligibilityQuery,
  useGetMyAttendanceQuery,
  useGetMyPaymentsQuery,
  useGetMyBillingQuery,
  useConvertUserToStudentMutation,
  useRevertStudentToUserMutation,
  useGetPastStudentsQuery,
  useGetOverduePaymentsQuery,
  useGetStudentAttendanceReportQuery,
  useGetStudentPaymentReportQuery,
  useGetTeacherAttendanceReportQuery,
  useGetTeacherAttendanceReportByUserIdQuery,
  useGetStudentUpcomingPaymentsQuery,
  useGetMyUpcomingPaymentsQuery,
  useGetUpcomingPaymentsSummaryQuery,
  useGetLessonProgressQuery,
} = attendanceApi;
