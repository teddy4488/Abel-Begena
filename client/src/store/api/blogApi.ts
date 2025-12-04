import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";

export type BlogAuthor = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
};

export type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  content: string;
  // Optional legacy/alternate fields used in some UI components
  body?: string;
  excerpt?: string;
  coverImage: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  author?: BlogAuthor;
};

export const blogApi = createApi({
  reducerPath: "blogApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: ["Blog"],
  endpoints: (builder) => ({
    getPublishedPosts: builder.query<BlogPost[], { search?: string } | void>({
      query: (params) => ({
        url: "/blog",
        params: params?.search ? { search: params.search } : undefined,
      }),
      providesTags: ["Blog"],
    }),
    getPostBySlug: builder.query<BlogPost, string>({
      query: (slug) => `/blog/${slug}`,
      providesTags: (_result, _error, slug) => [{ type: "Blog", id: slug }],
    }),
    getManagePosts: builder.query<BlogPost[], { search?: string } | void>({
      query: (params) => ({
        url: "/blog/manage/list",
        params: params?.search ? { search: params.search } : undefined,
      }),
      providesTags: ["Blog"],
    }),
    createPost: builder.mutation<
      BlogPost,
      Pick<BlogPost, "title" | "content" | "coverImage"> & {
        slug?: string;
        isPublished?: boolean;
      }
    >({
      query: (body) => ({
        url: "/blog",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Blog"],
    }),
    updatePost: builder.mutation<
      BlogPost,
      { id: string; data: Partial<BlogPost> }
    >({
      query: ({ id, data }) => ({
        url: `/blog/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Blog"],
    }),
    deletePost: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/blog/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Blog"],
    }),
  }),
});

export const {
  useGetPublishedPostsQuery,
  useGetPostBySlugQuery,
  useGetManagePostsQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
} = blogApi;

