import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";
import { InstrumentType } from "./storeApi";

export type InstrumentMaterial = {
  _id: string;
  title: string;
  url: string;
  instrumentType: InstrumentType;
  lessonId?: string;
  uploadedBy: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  uploadedAt: string;
  description?: string;
  fileType?: "pdf" | "image" | "video" | "other";
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const materialsApi = createApi({
  reducerPath: "materialsApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: ["Materials"],
  endpoints: (builder) => ({
    getMaterials: builder.query<
      InstrumentMaterial[],
      { instrumentType?: InstrumentType } | void
    >({
      query: (params) => ({
        url: "/materials",
        params: params?.instrumentType
          ? { instrumentType: params.instrumentType }
          : undefined,
      }),
      providesTags: ["Materials"],
    }),
    getPublicMaterials: builder.query<
      InstrumentMaterial[],
      { instrumentType?: InstrumentType } | void
    >({
      query: (params) => ({
        url: "/materials",
        params: params?.instrumentType
          ? { instrumentType: params.instrumentType }
          : undefined,
      }),
      providesTags: ["Materials"],
    }),
    getTeacherMaterials: builder.query<InstrumentMaterial[], void>({
      query: () => "/materials/teacher",
      providesTags: ["Materials"],
    }),
    uploadInstrumentMaterial: builder.mutation<
      InstrumentMaterial,
      {
        file: File;
        title: string;
        instrumentType: InstrumentType;
        description?: string;
        lessonId?: string;
      }
    >({
      query: ({ file, title, instrumentType, description, lessonId }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title);
        formData.append("instrumentType", instrumentType);
        if (description) {
          formData.append("description", description);
        }
        if (lessonId) {
          formData.append("lessonId", lessonId);
        }
        return {
          url: "/materials/upload",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Materials"],
    }),
    deleteMaterial: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/materials/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Materials"],
    }),
  }),
});

export const {
  useGetMaterialsQuery,
  useGetPublicMaterialsQuery,
  useGetTeacherMaterialsQuery,
  useUploadInstrumentMaterialMutation,
  useDeleteMaterialMutation,
} = materialsApi;
