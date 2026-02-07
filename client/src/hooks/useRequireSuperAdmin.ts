"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAppSelector } from "@/store/hooks";

export function useRequireSuperAdmin() {
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  const isSuperAdmin = useMemo(
    () => user?.role === "SuperAdmin",
    [user?.role],
  );

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (isLoggedIn && !isSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [isSuperAdmin, isLoggedIn, router]);

  return isSuperAdmin;
}
