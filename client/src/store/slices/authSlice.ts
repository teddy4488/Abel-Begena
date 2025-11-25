"use client";

import { PayloadAction, createSlice } from "@reduxjs/toolkit";

export type AuthUser = {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isLoggedIn: boolean;
};

const initialState: AuthState = {
  token: null,
  user: null,
  isLoggedIn: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ token: string | null; user: AuthUser | null }>,
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isLoggedIn = Boolean(action.payload.token);
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isLoggedIn = false;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

