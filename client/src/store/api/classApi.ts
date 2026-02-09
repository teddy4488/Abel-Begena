import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";
import type { InstrumentType } from "./storeApi";

type ClassAccess = {
  class: { _id: string; title: string };
  materials: { title: string; url: string; uploadedAt?: string | null }[];
  liveLink: string | null;
  isLive: boolean;
};

export type EnrollmentSnapshot = {
  status: "active" | "pending" | "withdrawn";
  amountPaid?: number | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  currency?: string | null;
  note?: string | null;
  enrolledAt?: string | null;
  classId?: string | null;
  classTitle?: string | null;
  fullName?: string | null;
  phone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  occupation?: string | null;
  city?: string | null;
  address?: string | null;
  preferredDaysPerWeek?: number | null;
  preferredSchedule?: string | null;
  preferredTime?: string | null;
  learningGoals?: string | null;
  notesForTeacher?: string | null;
  receiptUrl?: string | null;
};

export type ClassSummary = {
  _id: string;
  title: string;
  instrumentType: InstrumentType;
  level?: "beginner" | "advanced";
  isLive?: boolean;
  liveRoomCode?: string | null;
  createdAt?: string;
  instructorId?: string | null;
  teacherIds?: string[] | null;
  description?: string | null;
  tuition?: number | null;
  currency?: string | null;
  enrollmentDeadline?: string | null;
  enrollmentCount?: number;
  myEnrollment?: EnrollmentSnapshot | null;
};

export type ClassRosterResponse = {
  classId: string;
  title: string;
  students: Array<{
    _id: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    avatarUrl?: string | null;
    enrolledAt?: string;
    status: "active" | "pending" | "withdrawn";
    amountPaid?: number | null;
    currency?: string | null;
    paymentMethod?: string | null;
    paymentReference?: string | null;
    note?: string | null;
    // optional intake profile fields mirrored from EnrollmentSnapshot/AdminEnrollment
    fullName?: string | null;
    phone?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    occupation?: string | null;
    city?: string | null;
    address?: string | null;
    preferredDaysPerWeek?: number | null;
    preferredSchedule?: string | null;
    preferredTime?: string | null;
    learningGoals?: string | null;
    notesForTeacher?: string | null;
    receiptUrl?: string | null;
  }>;
};

export type ClassScheduleItem = {
  _id: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  location?: string | null;
  notes?: string | null;
};

type SchedulePayload = {
  title: string;
  startTime: string;
  endTime?: string;
  location?: string;
  notes?: string;
};

export type PublicCourseTrack = {
  _id: string;
  instrumentType: InstrumentType;
  level: "beginner" | "advanced";
  title: string;
  description?: string;
  isActive: boolean;
};

type EnrollmentRequest = {
  amount: number;
  currency?: string;
  paymentMethod: string;
  /**
   * Optional text reference for the payment (CHAPA/Telebirr/bank ref).
   * For paid classes without a receipt, the backend enforces that this is present.
   * For receipt-based flows, this may be omitted.
   */
  paymentReference?: string;
  note?: string;
  // optional intake profile
  fullName?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  occupation?: string;
  city?: string;
  address?: string;
  preferredDaysPerWeek?: number;
  preferredSchedule?: string;
  preferredTime?: string;
  learningGoals?: string;
  notesForTeacher?: string;
};

export const classApi = createApi({
  reducerPath: "classApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: ["Classes", "ClassRoster", "ClassSchedule", "ClassEnrollment"],
  endpoints: (builder) => ({
    getPublicClasses: builder.query<
      ClassSummary[],
      { instrumentType?: string; level?: "beginner" | "advanced" } | void
    >({
      query: (params) => ({
        url: "/classes/public",
        params: params ?? {},
      }),
    }),
    getClasses: builder.query<ClassSummary[], void>({
      query: () => "/classes",
      providesTags: ["Classes"],
    }),
    getClassAccess: builder.query<ClassAccess, string>({
      query: (id) => `/classes/${id}/access`,
    }),
    getClassStudents: builder.query<ClassRosterResponse, string>({
      query: (id) => `/classes/${id}/students`,
      providesTags: (_result, _error, id) => [{ type: "ClassRoster", id }],
    }),
    getClassSchedule: builder.query<ClassScheduleItem[], string>({
      query: (id) => `/classes/${id}/schedule`,
      providesTags: (_result, _error, id) => [{ type: "ClassSchedule", id }],
    }),
    uploadMaterial: builder.mutation<
      { message: string; materials: ClassAccess["materials"] },
      { classId: string; file: File; title: string }
    >({
      query: ({ classId, file, title }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title);
        return {
          url: `/classes/${classId}/materials`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Classes"],
    }),
    updateLiveState: builder.mutation<
      ClassSummary,
      { classId: string; isLive?: boolean; liveRoomCode?: string }
    >({
      query: ({ classId, ...body }) => ({
        url: `/classes/${classId}/live`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Classes"],
    }),
    createScheduleItem: builder.mutation<
      ClassScheduleItem[],
      { classId: string; payload: SchedulePayload }
    >({
      query: ({ classId, payload }) => ({
        url: `/classes/${classId}/schedule`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (_result, _error, { classId }) => [
        { type: "ClassSchedule", id: classId },
      ],
    }),
    updateScheduleItem: builder.mutation<
      ClassScheduleItem[],
      { classId: string; sessionId: string; payload: Partial<SchedulePayload> }
    >({
      query: ({ classId, sessionId, payload }) => ({
        url: `/classes/${classId}/schedule/${sessionId}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: (_result, _error, { classId }) => [
        { type: "ClassSchedule", id: classId },
      ],
    }),
    deleteScheduleItem: builder.mutation<
      ClassScheduleItem[],
      { classId: string; sessionId: string }
    >({
      query: ({ classId, sessionId }) => ({
        url: `/classes/${classId}/schedule/${sessionId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { classId }) => [
        { type: "ClassSchedule", id: classId },
      ],
    }),
    enrollInClass: builder.mutation<
      { message: string; enrollment: EnrollmentSnapshot },
      { classId: string; payload: EnrollmentRequest }
    >({
      query: ({ classId, payload }) => ({
        url: `/classes/${classId}/enroll`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Classes", "ClassEnrollment"],
    }),
    enrollInClassWithReceipt: builder.mutation<
      { message: string; enrollment: EnrollmentSnapshot },
      { classId: string; payload: EnrollmentRequest; receipt: File }
    >({
      query: ({ classId, payload, receipt }) => {
        const formData = new FormData();
        formData.append("receipt", receipt);
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, String(value));
          }
        });
        return {
          url: `/classes/${classId}/enroll-with-receipt`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Classes", "ClassEnrollment"],
    }),
    getEnrollmentStatus: builder.query<EnrollmentSnapshot, string>({
      query: (classId) => `/classes/${classId}/enrollment`,
      providesTags: (_result, _error, classId) => [
        { type: "ClassEnrollment", id: classId },
      ],
    }),
    getMyEnrollments: builder.query<EnrollmentSnapshot[], void>({
      query: () => "/classes/enrollments/me",
      providesTags: ["ClassEnrollment"],
    }),
    updateEnrollmentStatus: builder.mutation<
      { message: string; enrollment: EnrollmentSnapshot },
      {
        classId: string;
        studentId: string;
        status: "active" | "pending" | "withdrawn";
        note?: string;
      }
    >({
      query: ({ classId, studentId, ...body }) => ({
        url: `/classes/${classId}/enrollments/${studentId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { classId }) => [
        { type: "ClassRoster", id: classId },
        { type: "ClassEnrollment", id: classId },
        "Classes",
      ],
    }),
  }),
});

export const {
  useGetPublicClassesQuery,
  useGetClassesQuery,
  useGetClassAccessQuery,
  useGetClassStudentsQuery,
  useGetClassScheduleQuery,
  useUploadMaterialMutation,
  useUpdateLiveStateMutation,
  useCreateScheduleItemMutation,
  useUpdateScheduleItemMutation,
  useDeleteScheduleItemMutation,
  useEnrollInClassMutation,
  useEnrollInClassWithReceiptMutation,
  useGetEnrollmentStatusQuery,
  useGetMyEnrollmentsQuery,
  useUpdateEnrollmentStatusMutation,
} = classApi;

