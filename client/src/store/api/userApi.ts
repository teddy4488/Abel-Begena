import { createApi } from "@reduxjs/toolkit/query/react";
import { AuthUser, setCredentials, updateProfile } from "../slices/authSlice";
import { authorizedBaseQuery } from "./baseQuery";

export const userApi = createApi({
  reducerPath: "userApi",
  tagTypes: ["AdminUsers"],
  baseQuery: authorizedBaseQuery,
  endpoints: (builder) => ({
    getProfile: builder.query<AuthUser | null, void>({
      query: () => "/users/profile",
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data) {
            dispatch(updateProfile(data));
            dispatch(setCredentials({ token: null, user: data }));
          }
        } catch (error) {
          console.error("Failed to load profile", error);
        }
      },
    }),
    updateProfile: builder.mutation<
      AuthUser | null,
      Partial<
        Pick<
          AuthUser,
          "firstName" | "lastName" | "phone" | "bio" | "languagePreference"
        >
      >
    >({
      query: (body) => ({
        url: "/users/profile",
        method: "PATCH",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data) {
            dispatch(updateProfile(data));
            dispatch(setCredentials({ token: null, user: data }));
          }
        } catch (error) {
          console.error("Failed to update profile", error);
        }
      },
    }),
    getAllUsers: builder.query<AuthUser[], void>({
      query: () => "/users",
      providesTags: ["AdminUsers"],
    }),
    uploadAvatar: builder.mutation<{ avatarUrl: string }, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: "/users/profile/avatar",
          method: "POST",
          body: formData,
        };
      },
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(updateProfile({ avatarUrl: data.avatarUrl }));
        } catch (error) {
          console.error("Failed to upload avatar", error);
        }
      },
    }),
    adminCreateUser: builder.mutation<AuthUser, Partial<AuthUser> & { email: string; password: string }>(
      {
        query: (body) => ({
          url: "/users",
          method: "POST",
          body,
        }),
        invalidatesTags: ["AdminUsers"],
      },
    ),
    adminUpdateUser: builder.mutation<
      AuthUser,
      { id: string; data: Partial<AuthUser> & { password?: string } }
    >({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["AdminUsers"],
    }),
    adminDeleteUser: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AdminUsers"],
    }),
    adminUploadAvatar: builder.mutation<
      { avatarUrl: string },
      { id: string; file: File }
    >({
      query: ({ id, file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: `/users/${id}/avatar`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["AdminUsers"],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useGetAllUsersQuery,
  useUploadAvatarMutation,
  useAdminCreateUserMutation,
  useAdminUpdateUserMutation,
  useAdminDeleteUserMutation,
  useAdminUploadAvatarMutation,
} = userApi;

