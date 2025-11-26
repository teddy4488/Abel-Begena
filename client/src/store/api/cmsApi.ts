import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";

export type CmsValue = {
  key: string;
  label: string;
  description?: string;
  value: string;
};

export type CmsBlock = {
  key: string;
  label: string;
  description?: string;
  content: {
    en: string;
    am: string;
  };
};

export const cmsApi = createApi({
  reducerPath: "cmsApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: ["CmsBlocks"],
  endpoints: (builder) => ({
    getContent: builder.query<CmsValue[], { lang: "en" | "am" }>({
      query: ({ lang }) => ({
        url: "/cms",
        params: { lang },
      }),
    }),
    getAllBlocks: builder.query<CmsBlock[], void>({
      query: () => "/cms/manage",
      providesTags: ["CmsBlocks"],
    }),
    createBlock: builder.mutation<CmsBlock, Partial<CmsBlock> & { key: string }>(
      {
        query: (body) => ({
          url: "/cms",
          method: "POST",
          body: {
            key: body.key,
            label: body.label,
            description: body.description,
            en: body.content?.en,
            am: body.content?.am,
          },
        }),
        invalidatesTags: ["CmsBlocks"],
      },
    ),
    updateBlock: builder.mutation<
      CmsBlock,
      { key: string; data: { label?: string; description?: string; en?: string; am?: string } }
    >({
      query: ({ key, data }) => ({
        url: `/cms/${key}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["CmsBlocks"],
    }),
    deleteBlock: builder.mutation<{ message: string }, string>({
      query: (key) => ({
        url: `/cms/${key}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CmsBlocks"],
    }),
  }),
});

export const {
  useGetContentQuery,
  useGetAllBlocksQuery,
  useCreateBlockMutation,
  useUpdateBlockMutation,
  useDeleteBlockMutation,
} = cmsApi;

