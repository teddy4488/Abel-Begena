"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAppSelector } from "@/store/hooks";

export function useRequireAdmin() {
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  const isAdmin = useMemo(() => user?.role === "Admin", [user?.role]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (isLoggedIn && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, isLoggedIn, router]);

  return isAdmin;
}

