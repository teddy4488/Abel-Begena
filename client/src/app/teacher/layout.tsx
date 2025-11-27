"use client";

import { ReactNode, useEffect } from "react";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "next/navigation";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    } else if (user?.role !== "Teacher" && user?.role !== "Admin") {
      router.replace("/dashboard");
    }
  }, [isLoggedIn, user?.role, router]);

  if (!isLoggedIn || (user?.role !== "Teacher" && user?.role !== "Admin")) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-foreground/70">Checking permissions...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <TeacherSidebar />
      <div className="flex flex-1 flex-col">
        <main className="flex-1 overflow-y-auto bg-background px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

