import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";

export type FaqItem = {
  _id: string;
  question: string;
  answer: string;
  order?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const faqApi = createApi({
  reducerPath: "faqApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: ["Faq"],
  endpoints: (builder) => ({
    getFaq: builder.query<FaqItem[], void>({
      query: () => "/faq",
      providesTags: ["Faq"],
    }),
    getAllFaq: builder.query<FaqItem[], void>({
      query: () => "/faq/manage",
      providesTags: ["Faq"],
    }),
    createFaq: builder.mutation<
      FaqItem,
      { question: string; answer: string; order?: number; isActive?: boolean }
    >({
      query: (body) => ({
        url: "/faq",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Faq"],
    }),
    updateFaq: builder.mutation<
      FaqItem,
      { id: string; data: Partial<Omit<FaqItem, "_id">> }
    >({
      query: ({ id, data }) => ({
        url: `/faq/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Faq"],
    }),
    deleteFaq: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/faq/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Faq"],
    }),
  }),
});

export const {
  useGetFaqQuery,
  useGetAllFaqQuery,
  useCreateFaqMutation,
  useUpdateFaqMutation,
  useDeleteFaqMutation,
} = faqApi;
