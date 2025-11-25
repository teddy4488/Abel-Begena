"use client";

import { useEffect } from "react";
import { useSessionQuery } from "@/store/api/authApi";
import { useAppSelector } from "@/store/hooks";

export function AuthHydrator() {
  const { user } = useAppSelector((state) => state.auth);
  const { refetch } = useSessionQuery(undefined, {
    skip: Boolean(user),
  });

  useEffect(() => {
    if (!user) {
      void refetch();
    }
  }, [refetch, user]);

  return null;
}

