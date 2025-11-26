// src/store/api/authApi.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { AuthUser, logout, setCredentials } from "../slices/authSlice";
import { authorizedBaseQuery } from "./baseQuery";

type RegisterBody = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

type LoginBody = { email: string; password: string };

type LoginResponse = {
  user: AuthUser | null;
  expiresAt?: string | null;
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: authorizedBaseQuery,
  endpoints: (builder) => ({
    register: builder.mutation<unknown, RegisterBody>({
      query: (body) => ({
        url: "/auth/register",
        method: "POST",
        body,
      }),
    }),
    login: builder.mutation<LoginResponse, LoginBody>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            setCredentials({
              token: null,
              user: data.user ?? null,
              sessionExpiresAt: data.expiresAt ?? null,
            }),
          );
        } catch (error) {
          console.error("Login failed", error);
        }
      },
    }),
    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(logout());
        }
      },
    }),
    session: builder.query<LoginResponse, void>({
      query: () => ({
        url: "/auth/session",
        method: "GET",
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.user) {
            dispatch(
              setCredentials({
                token: null,
                user: data.user,
                sessionExpiresAt: data.expiresAt ?? null,
              }),
            );
          }
        } catch (error) {
          console.warn("Session lookup failed", error);
        }
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useSessionQuery,
} = authApi;