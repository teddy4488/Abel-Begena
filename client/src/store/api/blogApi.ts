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
  status?: "draft" | "pending" | "published";
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  author?: BlogAuthor;
};

export const blogApi = createApi({
  reducerPath: "blogApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: ["Blog", "Comments"],
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
        status?: "draft" | "pending" | "published";
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
    getComments: builder.query<
      Array<{
        _id: string;
        content: string;
        status: string;
        authorId?: { firstName?: string; lastName?: string; email?: string; avatarUrl?: string };
        createdAt?: string;
      }>,
      { slug: string; postId: string }
    >({
      query: ({ slug, postId }) => ({
        url: `/blog/${slug}/comments`,
        params: { postId },
      }),
      providesTags: ["Comments"],
    }),
    createComment: builder.mutation<
      { _id: string },
      { slug: string; postId: string; content: string }
    >({
      query: ({ slug, postId, content }) => ({
        url: `/blog/${slug}/comments`,
        method: "POST",
        params: { postId },
        body: { content },
      }),
      invalidatesTags: ["Comments"],
    }),
    getManageComments: builder.query<
      Array<{
        _id: string;
        content: string;
        status: string;
        postId?: { title?: string; slug?: string; status?: string; isPublished?: boolean };
        authorId?: { firstName?: string; lastName?: string; email?: string; avatarUrl?: string };
        createdAt?: string;
      }>,
      { search?: string } | void
    >({
      query: (params) => ({
        url: "/blog/comments/manage",
        params: params?.search ? { search: params.search } : undefined,
      }),
      providesTags: ["Comments"],
    }),
    updateCommentStatus: builder.mutation<
      { _id: string; status: string },
      { id: string; status: "pending" | "approved" | "rejected"; note?: string }
    >({
      query: ({ id, status, note }) => ({
        url: `/blog/comments/${id}/status`,
        method: "PATCH",
        body: { status, ...(note ? { note } : {}) },
      }),
      invalidatesTags: ["Comments"],
    }),
    deleteComment: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/blog/comments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Comments"],
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
  useGetCommentsQuery,
  useCreateCommentMutation,
  useGetManageCommentsQuery,
  useUpdateCommentStatusMutation,
  useDeleteCommentMutation,
} = blogApi;

