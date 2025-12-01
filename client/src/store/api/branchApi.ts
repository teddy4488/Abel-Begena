import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";

export type Branch = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  address?: string;
  city?: string;
  region?: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  radiusMeters: number;
  isActive: boolean;
};

export type CreateBranchBody = {
  name: string;
  slug: string;
  description?: string;
  address?: string;
  city?: string;
  region?: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  isActive?: boolean;
};

export type UpdateBranchBody = Partial<CreateBranchBody>;

export const branchApi = createApi({
  reducerPath: "branchApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: ["Branches"],
  endpoints: (builder) => ({
    getBranches: builder.query<Branch[], void>({
      query: () => "/branches",
      providesTags: ["Branches"],
    }),
    getBranchesAdmin: builder.query<Branch[], void>({
      query: () => "/branches/admin",
      providesTags: ["Branches"],
    }),
    createBranch: builder.mutation<Branch, CreateBranchBody>({
      query: (body) => ({
        url: "/branches",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Branches"],
    }),
    updateBranch: builder.mutation<
      Branch,
      { id: string; data: UpdateBranchBody }
    >({
      query: ({ id, data }) => ({
        url: `/branches/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Branches"],
    }),
    deleteBranch: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/branches/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Branches"],
    }),
  }),
});

export const {
  useGetBranchesQuery,
  useGetBranchesAdminQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
} = branchApi;


