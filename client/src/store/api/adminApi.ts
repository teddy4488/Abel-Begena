"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";
import type { InstrumentType } from "./storeApi";
import type { ClassSummary } from "./classApi";
import type { AuthUser } from "../slices/authSlice";

export type AnalyticsKpi = {
  revenue: {
    total: number;
    monthly: { label: string; total: number }[];
  };
  users: {
    total: number;
    active: number;
    monthly: { label: string; total: number }[];
  };
  students: {
    total: number;
    active: number;
  };
  teachers: {
    total: number;
    active: number;
    approved: number;
  };
  attendance: {
    studentRecords: {
      total: number;
      thisMonth: number;
      today: number;
    };
    teacherRecords: {
      total: number;
      thisMonth: number;
      today: number;
    };
  };
  payments: {
    studentPayments: {
      total: number;
      totalAmount: number;
      thisMonth: number;
      thisMonthAmount: number;
      paid: number;
      unpaid: number;
      partial: number;
    };
  };
  orders: {
    total: number;
    statusBreakdown: Record<string, number>;
  };
  classes: {
    total: number;
    live: number;
  };
};

export type ManagedClass = ClassSummary & {
  description?: string;
  classType?: "online" | "physical" | "both";
  instrumentType: InstrumentType;
  level?: "beginner" | "advanced";
  durationMonths?: 3 | 6 | 9 | null;
  startDate?: string;
  endDate?: string;
  branchId?: string | null;
  teacherIds?: string[] | null;
  primaryInstructorId?: string | null;
  instructorId?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
};

export type DayOccupancy = {
  day: string;
  operatingHours: { start: string; end: string };
  sessionMinutes: number;
  buckets: { time: string; count: number }[];
  bySlot: { startTime: string; count: number }[];
  totalStudents: number;
  totalSessions: number;
};

export type AdminEnrollment = {
  classId: string;
  classTitle: string;
  instructor?: string | null;
  student: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  };
  status: "active" | "pending" | "withdrawn";
  amountPaid?: number | null;
  currency?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  note?: string | null;
  enrolledAt?: string | null;
  /** Intake / conversion fields captured during enrollment */
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
  preferredLearningDays?: string[] | null;
  registrationStartDate?: string | null;
  learningGoals?: string | null;
  notesForTeacher?: string | null;
  receiptUrl?: string | null;
};

export type Teacher = {
  _id: string;
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive: boolean;
  isVerified: boolean;
  teacherStatus?: 'pending' | 'approved' | 'suspended';
  avatarUrl?: string;
  bio?: string;
  languagePreference?: 'en' | 'am';
};

export type AdminUser = {
  _id: string;
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive: boolean;
  isVerified: boolean;
  avatarUrl?: string;
  languagePreference?: 'en' | 'am';
  /** Phase 5.3: branch-scoped admin */
  branchId?: string | { _id: string; name: string };
  role?: string;
};

export type Student = {
  _id: string;
  id?: string;
  email?: string;
  fullName: string;
  attendanceNumber: string;
  branchId?: string;
  learningType?: 'physical' | 'online';
  instrumentType?: string;
  programDurationMonths?: number;
  preferredLearningDays?: string[];
  registrationStartDate?: string;
  learningDaysPerWeek?: number;
  isActive: boolean;
  isVerified: boolean;
  monthlyFee?: number;
  periodAdjustment?: number;
  autoReminders?: boolean;
};

export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: [
    "AdminAnalytics",
    "AdminClasses",
    "AdminEnrollments",
    "Teachers",
    "Admins",
    "Students",
    "WebsiteUsers",
  ],
  endpoints: (builder) => ({
    getAnalyticsOverview: builder.query<AnalyticsKpi, void>({
      query: () => "/admin/dashboard/analytics",
      providesTags: ["AdminAnalytics"],
    }),
    getManagedClasses: builder.query<ManagedClass[], void>({
      query: () => "/classes/manage",
      providesTags: ["AdminClasses"],
    }),
    createManagedClass: builder.mutation<ManagedClass, Record<string, unknown>>({
      query: (body) => ({
        url: "/classes",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AdminClasses"],
    }),
    updateManagedClass: builder.mutation<
      ManagedClass,
      { id: string; data: Record<string, unknown> }
    >({
      query: ({ id, data }) => ({
        url: `/classes/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["AdminClasses"],
    }),
    deleteManagedClass: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/classes/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AdminClasses"],
    }),
    assignClassInstructor: builder.mutation<
      ManagedClass,
      { classId: string; instructorId: string }
    >({
      query: ({ classId, instructorId }) => ({
        url: `/classes/${classId}/instructor/${instructorId}`,
        method: "PATCH",
      }),
      invalidatesTags: ["AdminClasses"],
    }),

    getDayOccupancy: builder.query<
      DayOccupancy,
      { day: string; branchId?: string; instrumentType?: string }
    >({
      query: ({ day, branchId, instrumentType }) => ({
        url: "/classes/occupancy",
        params: {
          day,
          ...(branchId ? { branchId } : {}),
          ...(instrumentType ? { instrumentType } : {}),
        },
      }),
    }),

    getAllEnrollments: builder.query<
      AdminEnrollment[],
      { status?: "active" | "pending" | "withdrawn" } | void
    >({
      query: (params) => ({
        url: "/classes/enrollments",
        params: params ?? undefined,
      }),
      providesTags: ["AdminEnrollments"],
    }),
    getTeachers: builder.query<Teacher[], void>({
      query: () => "/admin/teachers",
      providesTags: ["Teachers"],
    }),
    getAdmins: builder.query<AdminUser[], void>({
      query: () => "/admin/admins",
      providesTags: ["Admins"],
    }),
    createAdmin: builder.mutation<
      AdminUser,
      { email: string; password: string; firstName?: string; lastName?: string; phone?: string; branchId?: string }
    >({
      query: (body) => ({
        url: "/admin/admins",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Admins"],
    }),
    getStudents: builder.query<Student[], void>({
      query: () => "/attendance/students/participants",
      providesTags: ["Students"],
    }),
    getWebsiteUsers: builder.query<AuthUser[], void>({
      query: () => "/users",
      providesTags: ["WebsiteUsers"],
    }),
    updateTeacher: builder.mutation<
      Teacher,
      { id: string; data: Partial<Teacher> }
    >({
      query: ({ id, data }) => ({
        url: `/admin/teachers/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Teachers"],
    }),
    deleteTeacher: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/admin/teachers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Teachers"],
    }),
    updateAdmin: builder.mutation<
      AdminUser,
      { id: string; data: Partial<AdminUser> }
    >({
      query: ({ id, data }) => ({
        url: `/admin/admins/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Admins"],
    }),
    deleteAdmin: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/admin/admins/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Admins"],
    }),
    updateWebsiteUser: builder.mutation<
      AuthUser,
      { id: string; data: Partial<AuthUser> }
    >({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["WebsiteUsers"],
    }),
    updateStudent: builder.mutation<
      Student,
      { id: string; data: Partial<Student> }
    >({
      query: ({ id, data }) => ({
        url: `/attendance/students/participants/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Students"],
    }),
    deleteStudent: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/attendance/students/participants/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Students"],
    }),
  }),
});

export const {
  useGetAnalyticsOverviewQuery,
  useGetManagedClassesQuery,
  useCreateManagedClassMutation,
  useUpdateManagedClassMutation,
  useDeleteManagedClassMutation,
  useGetDayOccupancyQuery,
  useAssignClassInstructorMutation,
  useGetAllEnrollmentsQuery,
  useGetTeachersQuery,
  useGetAdminsQuery,
  useCreateAdminMutation,
  useGetStudentsQuery,
  useGetWebsiteUsersQuery,
  useUpdateTeacherMutation,
  useDeleteTeacherMutation,
  useUpdateAdminMutation,
  useDeleteAdminMutation,
  useUpdateWebsiteUserMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
} = adminApi;

