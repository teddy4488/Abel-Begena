"use client";

import { ReactNode, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "next/navigation";

export default function StudentLayout({ children }: { children: ReactNode }) {
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    } else if (user?.userType !== "student") {
      // Redirect to appropriate dashboard
      const userType = user?.userType;
      if (userType === "admin") {
        router.replace("/admin/console");
      } else if (userType === "teacher") {
        router.replace("/teacher");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [isLoggedIn, user?.userType, router]);

  if (!isLoggedIn || user?.userType !== "student") {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-foreground/70">Checking permissions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="w-full">{children}</main>
    </div>
  );
}
