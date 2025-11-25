"use client";

// src/store/api/authApi.ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { setCredentials } from "../slices/authSlice";

type RegisterBody = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

type LoginBody = { email: string; password: string };

type LoginResponse = {
  access_token: string;
};

type LoginTransformed = {
  token: string;
  user: { email: string };
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
    credentials: "include",
  }),
  endpoints: (builder) => ({
    register: builder.mutation<unknown, RegisterBody>({
      query: (body) => ({
        url: "/auth/register",
        method: "POST",
        body,
      }),
    }),
    login: builder.mutation<LoginTransformed, LoginBody>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
      transformResponse: (response: LoginResponse, _meta, arg) => ({
        token: response.access_token,
        user: { email: arg.email },
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
        } catch (error) {
          console.error("Login failed", error);
        }
      },
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation } = authApi;