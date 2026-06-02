import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";

export type Notification = {
  _id: string;
  userId?: string;
  type: string;
  title: string;
  message?: string;
  data?: Record<string, unknown>;
  readAt?: string | null;
  createdAt?: string;
};

export const notificationApi = createApi({
  reducerPath: "notificationApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: ["Notification"],
  endpoints: (builder) => ({
    getNotifications: builder.query<Notification[], void>({
      query: () => "/notifications/me",
      providesTags: ["Notification"],
    }),
    markAsRead: builder.mutation<unknown, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const { useGetNotificationsQuery, useMarkAsReadMutation } =
  notificationApi;
