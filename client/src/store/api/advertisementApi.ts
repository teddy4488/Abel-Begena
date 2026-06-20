import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";

export type Advertisement = {
  _id: string;
  title?: string;
  mediaUrl: string;
  mediaType: "video" | "image";
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  uploadedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const advertisementApi = createApi({
  reducerPath: "advertisementApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: ["Advertisement"],
  endpoints: (builder) => ({
    getActiveAd: builder.query<Advertisement[], void>({
      query: () => "/advertisements/active",
      providesTags: ["Advertisement"],
    }),
    getAllAds: builder.query<Advertisement[], void>({
      query: () => "/advertisements",
      providesTags: ["Advertisement"],
    }),
    uploadAdMedia: builder.mutation<
      { mediaUrl: string; mediaType: "video" | "image" },
      File
    >({
      query: (file) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: "/advertisements/upload-media",
          method: "POST",
          body: formData,
        };
      },
    }),
    createAd: builder.mutation<
      Advertisement,
      Pick<Advertisement, "mediaUrl" | "mediaType"> & {
        title?: string;
        isActive?: boolean;
        startDate?: string;
        endDate?: string;
      }
    >({
      query: (body) => ({ url: "/advertisements", method: "POST", body }),
      invalidatesTags: ["Advertisement"],
    }),
    updateAd: builder.mutation<
      Advertisement,
      { id: string; data: Partial<Omit<Advertisement, "_id">> }
    >({
      query: ({ id, data }) => ({
        url: `/advertisements/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Advertisement"],
    }),
    deleteAd: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `/advertisements/${id}`, method: "DELETE" }),
      invalidatesTags: ["Advertisement"],
    }),
  }),
});

export const {
  useGetActiveAdQuery,
  useGetAllAdsQuery,
  useUploadAdMediaMutation,
  useCreateAdMutation,
  useUpdateAdMutation,
  useDeleteAdMutation,
} = advertisementApi;
