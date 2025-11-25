"use client";

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { RootState } from "../store";

type ClassAccess = {
  class: { _id: string; title: string };
  materials: { title: string; url: string; uploadedAt?: string }[];
  liveLink: string | null;
  isLive: boolean;
};

export const classApi = createApi({
  reducerPath: "classApi",
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
    getClassAccess: builder.query<ClassAccess, string>({
      query: (id) => `/classes/${id}/access`,
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
    }),
  }),
});

export const { useGetClassAccessQuery, useUploadMaterialMutation } = classApi;

