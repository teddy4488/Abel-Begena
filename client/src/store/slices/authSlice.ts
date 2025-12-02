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
  isActive?: boolean;
  isVerified?: boolean;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isLoggedIn: boolean;
  sessionExpiresAt: string | null;
};

export const AUTH_STORAGE_KEY = "abel-begena-auth";

const loadInitialState = (): AuthState => {
  if (typeof window === "undefined") {
    return {
      token: null,
      user: null,
      isLoggedIn: false,
      sessionExpiresAt: null,
    };
  }
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return {
        token: null,
        user: null,
        isLoggedIn: false,
        sessionExpiresAt: null,
      };
    }
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    return {
      token: typeof parsed.token === "string" ? parsed.token : null,
      user: parsed.user ?? null,
      isLoggedIn: Boolean(parsed.user),
      sessionExpiresAt:
        typeof parsed.sessionExpiresAt === "string"
          ? parsed.sessionExpiresAt
          : null,
    };
  } catch {
    return {
      token: null,
      user: null,
      isLoggedIn: false,
      sessionExpiresAt: null,
    };
  }
};

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

const initialState: AuthState = loadInitialState();

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

export const { setCredentials, updateProfile, logout } = authSlice.actions;
export default authSlice.reducer;

