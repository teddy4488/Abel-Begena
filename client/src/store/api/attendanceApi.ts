import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";
import type { InstrumentType } from "./storeApi";

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type LearningType = 'physical' | 'online';
export type AttendanceStatus = 'present' | 'late' | 'excused';

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

export type StudentParticipant = {
  _id: string;
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
  registrationStartDate: string;
  learningDaysPerWeek: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type InstrumentLesson = {
  _id: string;
  instrumentType: InstrumentType;
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
  registrationStartDate: string;
  attendanceNumber?: string;
};

export type RecordStudentAttendanceBody = {
  participantId: string;
  lessonId: string;
  revisedLessonId?: string;
  status?: AttendanceStatus;
};

export type BillingSummary = {
  year: number;
  month: number;
  totalActiveStudents: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  items: {
    participantId: string;
    fullName: string;
    attendanceNumber: string;
    instrumentType: InstrumentType;
    status: "paid" | "partial" | "unpaid";
  }[];
};

export type RecordStudentPaymentBody = {
  participantId: string;
  amount: number;
  month: number;
  year: number;
  status: "paid" | "partial" | "unpaid";
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

export const attendanceApi = createApi({
  reducerPath: "attendanceApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: [
    "TeacherParticipants",
    "StudentParticipants",
    "TeacherToday",
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
        lastAttendance?: any;
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
      invalidatesTags: ["StudentParticipants"],
    }),
    getInstrumentLessons: builder.query<
      InstrumentLesson[],
      string | undefined
    >({
      query: (instrumentType) => ({
        url: "/classes/lessons",
        params: instrumentType ? { instrumentType } : {},
      }),
      providesTags: ["Lessons"],
    }),
    createLesson: builder.mutation<
      InstrumentLesson,
      { instrumentType: InstrumentType; title: string; code?: string; order?: number }
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
      { id: string; title?: string; code?: string; order?: number; isActive?: boolean }
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
        status: "paid" | "partial" | "unpaid";
        dueDate?: string;
        duedate?: string[];
        period?: number;
        dueDateInferred?: boolean;
        note?: string;
        createdAt?: string;
      }>,
      void
    >({
      query: () => "/attendance/students/me/payments",
      providesTags: ["StudentPayments"],
    }),
    convertUserToStudent: builder.mutation<
      { message: string; student: StudentParticipant },
      {
        fullName: string;
        branchId?: string;
        learningType: LearningType;
        instrumentType: InstrumentType;
        programDurationMonths: 3 | 6 | 9;
        preferredLearningDays: DayOfWeek[];
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
      query: (body) => ({
        url: "/attendance/students/convert",
        method: "POST",
        body,
      }),
      invalidatesTags: ["StudentParticipants"],
    }),
    getOverduePayments: builder.query<
      Array<{
        participantId: string;
        fullName: string;
        attendanceNumber: string;
        instrumentType: string;
        year: number;
        month: number;
        dueDate: string;
        duedate?: string[];
        period?: number;
        dueDateInferred?: boolean;
        daysOverdue: number;
        amount?: number;
        status?: "paid" | "partial" | "unpaid";
      }>,
      void
    >({
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
          _id?: string;
          date: string;
          lesson?: { _id?: string; title?: string; code?: string } | null;
          revisedLesson?: { _id?: string; title?: string; code?: string } | null;
          status: AttendanceStatus;
          recordedBy?: { _id?: string; firstName?: string; lastName?: string; email?: string } | null;
        }>;
        totalSessions: number;
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
          branch?: any;
        };
        payments: Array<{
          month: number;
          year: number;
          amount?: number;
          status: "paid" | "partial" | "unpaid";
          dueDate?: string | null;
          dueDateInferred?: boolean;
          duedate?: string[];
          period?: number;
          paidAt?: string;
          note?: string;
          recordedBy?: any;
        }>;
        totalPaid: number;
        totalPayments: number;
      },
      string
    >({
      // Server route: GET /attendance/reports/student/:id/payments
      query: (studentId) => `/attendance/reports/student/${studentId}/payments`,
      providesTags: ["StudentPayments"],
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
        status?: "paid" | "partial" | "unpaid";
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
        status?: "paid" | "partial" | "unpaid";
      }>,
      { id: string; daysAhead?: number }
    >({
      query: ({ id, daysAhead }) => ({
        url: `/attendance/students/${id}/upcoming-payments`,
        params: daysAhead ? { daysAhead } : {},
      }),
      providesTags: ["StudentPayments"],
    }),
  }),
});

export const {
  useGetTeacherParticipantsQuery,
  useGetStudentParticipantsQuery,
  useGetStudentByAttendanceNumberQuery,
  useSearchStudentsQuery,
  useGetStudentDetailsQuery,
  useRegisterTeacherParticipantMutation,
  useRegisterStudentParticipantMutation,
  useTeacherCheckInMutation,
  useTeacherCheckOutMutation,
  useGetTodayTeacherAttendanceQuery,
  useRecordStudentAttendanceMutation,
  useGetInstrumentLessonsQuery,
  useCreateLessonMutation,
  useUpdateLessonMutation,
  useDeleteLessonMutation,
  useGetBillingSummaryQuery,
  useRecordStudentPaymentMutation,
  useGetGraduationEligibilityQuery,
  useGetMyAttendanceQuery,
  useGetMyPaymentsQuery,
  useConvertUserToStudentMutation,
  useGetOverduePaymentsQuery,
  useGetStudentAttendanceReportQuery,
  useGetStudentPaymentReportQuery,
  useGetStudentUpcomingPaymentsQuery,
  useGetMyUpcomingPaymentsQuery,
} = attendanceApi;
