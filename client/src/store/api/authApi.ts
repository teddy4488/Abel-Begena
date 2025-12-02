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
  accessToken?: string | null;
};

type RegisterResponse = {
  message: string;
  email: string;
  expiresInMinutes?: number;
  devCode?: string;
};

type VerificationResponse = {
  message: string;
  expiresInMinutes?: number;
  devCode?: string;
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: authorizedBaseQuery,
  endpoints: (builder) => ({
    register: builder.mutation<RegisterResponse, RegisterBody>({
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
              token: data.accessToken ?? null,
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
    verifyEmail: builder.mutation<{ message: string }, { email: string; code: string }>({
      query: (body) => ({
        url: "/auth/verify-email",
        method: "POST",
        body,
      }),
    }),
    resendVerification: builder.mutation<VerificationResponse, { email: string }>({
      query: (body) => ({
        url: "/auth/resend-verification",
        method: "POST",
        body,
      }),
    }),
    forgotPassword: builder.mutation<{ message: string; devCode?: string }, { email: string }>({
      query: (body) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body,
      }),
    }),
    resetPassword: builder.mutation<{ message: string }, { email: string; code: string; password: string }>({
      query: (body) => ({
        url: "/auth/reset-password",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useSessionQuery,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;