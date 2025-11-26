"use client";

import { useEffect, useRef } from "react";
import { useSessionQuery } from "@/store/api/authApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";

export function AuthHydrator() {
  const { user, sessionExpiresAt, isLoggedIn } = useAppSelector(
    (state) => state.auth,
  );
  const dispatch = useAppDispatch();
  const { refetch } = useSessionQuery(undefined, {
    skip: Boolean(user),
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) {
      void refetch();
    }
  }, [refetch, user]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!isLoggedIn || !sessionExpiresAt) {
      return;
    }
    const expiryMs = new Date(sessionExpiresAt).getTime() - Date.now();
    if (expiryMs <= 0) {
      dispatch(logout());
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("session-expired"));
      }
      return;
    }
    timeoutRef.current = setTimeout(() => {
      dispatch(logout());
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("session-expired"));
      }
    }, expiryMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [dispatch, isLoggedIn, sessionExpiresAt]);

  return null;
}

