"use client";

import { configureStore } from "@reduxjs/toolkit";
import { authApi } from "./api/authApi";
import { classApi } from "./api/classApi";
import { storeApi } from "./api/storeApi";
import { userApi } from "./api/userApi";
import { blogApi } from "./api/blogApi";
import { attendanceApi } from "./api/attendanceApi";
import { faqApi } from "./api/faqApi";
import { adminApi } from "./api/adminApi";
import { branchApi } from "./api/branchApi";
import authReducer from "./slices/authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [classApi.reducerPath]: classApi.reducer,
    [storeApi.reducerPath]: storeApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [blogApi.reducerPath]: blogApi.reducer,
    [attendanceApi.reducerPath]: attendanceApi.reducer,
    [faqApi.reducerPath]: faqApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [branchApi.reducerPath]: branchApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      classApi.middleware,
      storeApi.middleware,
      userApi.middleware,
      blogApi.middleware,
      attendanceApi.middleware,
      faqApi.middleware,
      adminApi.middleware,
      branchApi.middleware,
    ),
});

export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;