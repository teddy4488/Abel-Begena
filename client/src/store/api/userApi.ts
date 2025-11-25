"use client";

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";
import { AuthUser, setCredentials, updateProfile } from "../slices/authSlice";

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getProfile: builder.query<AuthUser | null, void>({
      query: () => "/users/profile",
      async onQueryStarted(_arg, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data) {
            dispatch(updateProfile(data));
            const token = (getState() as RootState).auth.token;
            dispatch(setCredentials({ token, user: data }));
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
      async onQueryStarted(_arg, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data) {
            dispatch(updateProfile(data));
            const token = (getState() as RootState).auth.token;
            dispatch(setCredentials({ token, user: data }));
          }
        } catch (error) {
          console.error("Failed to update profile", error);
        }
      },
    }),
  }),
});

export const { useGetProfileQuery, useUpdateProfileMutation } = userApi;

