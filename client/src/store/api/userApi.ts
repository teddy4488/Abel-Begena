"use client";

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { AuthUser, setCredentials, updateProfile } from "../slices/authSlice";

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getProfile: builder.query<AuthUser | null, void>({
      query: () => "/users/profile",
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data) {
            dispatch(updateProfile(data));
            dispatch(setCredentials({ token: null, user: data }));
          }
        } catch (error) {
          console.error("Failed to load profile", error);
        }
      },
    }),
    updateProfile: builder.mutation<
      AuthUser | null,
      Partial<Pick<AuthUser, "firstName" | "lastName" | "phone">>
    >({
      query: (body) => ({
        url: "/users/profile",
        method: "PATCH",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data) {
            dispatch(updateProfile(data));
            dispatch(setCredentials({ token: null, user: data }));
          }
        } catch (error) {
          console.error("Failed to update profile", error);
        }
      },
    }),
    getAllUsers: builder.query<AuthUser[], void>({
      query: () => "/users",
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useGetAllUsersQuery,
} = userApi;

