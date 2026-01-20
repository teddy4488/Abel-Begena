import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout } from "../slices/authSlice";
import type { RootState } from "../store";
import { setCredentials } from "../slices/authSlice";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const authorizedBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const path =
      typeof args === "string"
        ? args
        : typeof args.url === "string"
          ? args.url
          : "";

    // Avoid loops: don't try refresh if the failing endpoint is itself auth refresh/login.
    const isAuthRefresh = path.startsWith("/auth/refresh");
    const isAuthLogin = path.startsWith("/auth/login");

    if (!isAuthRefresh && !isAuthLogin) {
      // Attempt silent refresh once (uses httpOnly refresh cookie)
      const refreshResult = await rawBaseQuery(
        { url: "/auth/refresh", method: "POST" },
        api,
        extraOptions,
      );

      if (!refreshResult.error) {
        const data = refreshResult.data as
          | { accessToken?: string | null; expiresAt?: string | null; user?: any }
          | undefined;

        api.dispatch(
          setCredentials({
            token: data?.accessToken ?? null,
            user: data?.user ?? null,
            sessionExpiresAt: data?.expiresAt ?? null,
          }),
        );

        // Retry original request with updated token in state
        return await rawBaseQuery(args, api, extraOptions);
      }
    }

    // Only force a global logout on 401s from application endpoints
    // other than `/auth/session`. For the session probe itself, we
    // simply emit a "session-expired" event so the UI can react
    // without immediately wiping any optimistic client state.
    if (!path.startsWith("/auth/session")) {
      api.dispatch(logout());
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("session-expired"));
    }
  } else if (result.error) {
    const fallback = "Something went wrong. Please try again.";
    const statusText =
      "statusText" in result.error &&
      typeof (result.error as { statusText?: unknown }).statusText === "string"
        ? (result.error as { statusText: string }).statusText
        : undefined;
    const networkError =
      "error" in result.error && typeof result.error.error === "string"
        ? result.error.error
        : undefined;
    const message =
      (result.error.data as { message?: string })?.message ??
      statusText ??
      networkError ??
      fallback;
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("api-error", {
          detail: {
            message,
            status: result.error.status,
          },
        }),
      );
    }
  }

  return result;
};

export const baseUrl = apiBaseUrl;

