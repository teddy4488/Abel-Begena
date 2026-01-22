"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";
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
  startDate?: string;
  endDate?: string;
  capacity?: number;
  instructorId?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
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
  fullName?: string | null;
  phone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  occupation?: string | null;
  city?: string | null;
  address?: string | null;
  preferredDaysPerWeek?: number | null;
  preferredSchedule?: string | null;
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
};

export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: ["AdminAnalytics", "AdminClasses", "AdminEnrollments", "Teachers", "Admins", "Students", "WebsiteUsers"],
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
  }),
});

export const {
  useGetAnalyticsOverviewQuery,
  useGetManagedClassesQuery,
  useCreateManagedClassMutation,
  useUpdateManagedClassMutation,
  useDeleteManagedClassMutation,
  useAssignClassInstructorMutation,
  useGetAllEnrollmentsQuery,
  useGetTeachersQuery,
  useGetAdminsQuery,
  useGetStudentsQuery,
  useGetWebsiteUsersQuery,
  useUpdateTeacherMutation,
  useUpdateAdminMutation,
  useUpdateWebsiteUserMutation,
  useUpdateStudentMutation,
} = adminApi;

