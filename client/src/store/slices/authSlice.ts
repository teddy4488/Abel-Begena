"use client";

import { PayloadAction, createSlice } from "@reduxjs/toolkit";

export type AuthUser = {
  _id?: string;
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  userType?: "website_user" | "teacher" | "admin" | "student";
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  teacherStatus?: "pending" | "approved" | "suspended";
  languagePreference?: "en" | "am";
  isActive?: boolean;
  isVerified?: boolean;
  // Student-specific fields
  attendanceNumber?: string;
  fullName?: string;
  instrumentType?: string;
  branchId?: string | { _id: string; name: string };
  learningType?: "physical" | "online";
  studentProfile?: {
    attendanceNumber?: string;
    fullName?: string;
    branchId?: unknown;
    learningType?: "physical" | "online";
    instrumentType?: string;
  };
  mustChangePassword?: boolean;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isLoggedIn: boolean;
  sessionExpiresAt: string | null;
};

export const AUTH_STORAGE_KEY = "abel-begena-auth";

const persistState = (state: AuthState) => {
  if (typeof window === "undefined") return;
  try {
    const payload: AuthState = {
      token: state.token,
      user: state.user,
      isLoggedIn: state.isLoggedIn,
      sessionExpiresAt: state.sessionExpiresAt,
    };
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
};

const clearPersistedState = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
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
    hydrateFromStorage: (state) => {
      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<AuthState>;
        state.token = typeof parsed.token === "string" ? parsed.token : null;
        state.user = (parsed.user ?? null) as AuthUser | null;
        state.isLoggedIn = Boolean(parsed.user);
        state.sessionExpiresAt =
          typeof parsed.sessionExpiresAt === "string"
            ? parsed.sessionExpiresAt
            : null;
      } catch {
        // ignore corrupted storage
      }
    },
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
      persistState(state);
    },
    updateProfile: (state, action: PayloadAction<Partial<AuthUser>>) => {
      if (!state.user) {
        state.user = action.payload as AuthUser;
      } else {
        state.user = { ...state.user, ...action.payload };
      }
      persistState(state);
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isLoggedIn = false;
      state.sessionExpiresAt = null;
      clearPersistedState();
    },
  },
});

export const { hydrateFromStorage, setCredentials, updateProfile, logout } =
  authSlice.actions;
export default authSlice.reducer;

