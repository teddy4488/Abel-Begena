import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";

type ClassAccess = {
  class: { _id: string; title: string };
  materials: { title: string; url: string; uploadedAt?: string }[];
  liveLink: string | null;
  isLive: boolean;
};

export type ClassSummary = {
  _id: string;
  title: string;
  isLive?: boolean;
  createdAt?: string;
  instructorId?: string;
};

export const classApi = createApi({
  reducerPath: "classApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: ["Classes"],
  endpoints: (builder) => ({
    getPublicClasses: builder.query<ClassSummary[], void>({
      query: () => "/classes/public",
    }),
    getClasses: builder.query<ClassSummary[], void>({
      query: () => "/classes",
      providesTags: ["Classes"],
    }),
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
      invalidatesTags: ["Classes"],
    }),
    updateLiveState: builder.mutation<
      ClassSummary,
      { classId: string; isLive?: boolean; liveRoomCode?: string }
    >({
      query: ({ classId, ...body }) => ({
        url: `/classes/${classId}/live`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Classes"],
    }),
  }),
});

export const {
  useGetPublicClassesQuery,
  useGetClassesQuery,
  useGetClassAccessQuery,
  useUploadMaterialMutation,
  useUpdateLiveStateMutation,
} = classApi;

