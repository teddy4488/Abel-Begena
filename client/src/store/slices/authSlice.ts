"use client";

import { PayloadAction, createSlice } from "@reduxjs/toolkit";

export type AuthUser = {
  _id?: string;
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  teacherStatus?: "pending" | "approved" | "suspended";
  languagePreference?: "en" | "am";
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isLoggedIn: boolean;
  sessionExpiresAt: string | null;
};

const initialState: AuthState = {
  token: null,
  user: null,
  isLoggedIn: false,
  sessionExpiresAt: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        token?: string | null;
        user: AuthUser | null;
        sessionExpiresAt?: string | null;
      }>,
    ) => {
      state.token = action.payload.token ?? null;
      state.user = action.payload.user;
      state.isLoggedIn = Boolean(action.payload.user);
      state.sessionExpiresAt =
        typeof action.payload.sessionExpiresAt === "undefined"
          ? state.sessionExpiresAt
          : action.payload.sessionExpiresAt;
    },
    updateProfile: (state, action: PayloadAction<Partial<AuthUser>>) => {
      if (!state.user) {
        state.user = action.payload as AuthUser;
      } else {
        state.user = { ...state.user, ...action.payload };
      }
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isLoggedIn = false;
      state.sessionExpiresAt = null;
    },
  },
});

export const { setCredentials, updateProfile, logout } = authSlice.actions;
export default authSlice.reducer;

