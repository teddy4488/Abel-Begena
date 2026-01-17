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
    } else if (user?.userType !== "teacher" && user?.userType !== "admin") {
      router.replace("/dashboard");
    }
  }, [isLoggedIn, user?.userType, router]);

  if (!isLoggedIn || (user?.userType !== "teacher" && user?.userType !== "admin")) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-foreground/70">Checking permissions...</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-background text-foreground">
      {/* Subtle Orthodox cross decorations */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <span className="absolute left-8 top-20 text-5xl text-secondary/5">✝</span>
        <span className="absolute right-12 top-40 text-6xl text-secondary/5">✝</span>
        <span className="absolute bottom-40 left-12 text-4xl text-secondary/5">✝</span>
        <span className="absolute bottom-20 right-8 text-5xl text-secondary/5">✝</span>
      </div>
      <TeacherSidebar />
      <div className="relative z-10 flex flex-1 flex-col">
        <main className="flex-1 overflow-y-auto bg-background px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

