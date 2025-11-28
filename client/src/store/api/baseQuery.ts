import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout } from "../slices/authSlice";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  credentials: "include",
});

export const authorizedBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    api.dispatch(logout());
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
    const message =
      (result.error.data as { message?: string })?.message ??
      statusText ??
      (typeof result.error.error === "string"
        ? result.error.error
        : undefined) ??
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

