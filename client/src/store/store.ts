"use client";

import { configureStore } from "@reduxjs/toolkit";
import { authApi } from "./api/authApi";
import { classApi } from "./api/classApi";
import { storeApi } from "./api/storeApi";
import authReducer from "./slices/authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [classApi.reducerPath]: classApi.reducer,
    [storeApi.reducerPath]: storeApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      classApi.middleware,
      storeApi.middleware,
    ),
});

export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;