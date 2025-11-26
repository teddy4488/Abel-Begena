"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";
import type { ClassSummary } from "./classApi";

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

export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: ["AdminAnalytics", "AdminClasses"],
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
  }),
});

export const {
  useGetAnalyticsOverviewQuery,
  useGetManagedClassesQuery,
  useCreateManagedClassMutation,
  useUpdateManagedClassMutation,
  useDeleteManagedClassMutation,
  useAssignClassInstructorMutation,
} = adminApi;

