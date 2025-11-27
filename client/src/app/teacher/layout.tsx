"use client";

import { ReactNode } from "react";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useI18n } from "@/components/providers/I18nProvider";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const { t } = useI18n();

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
        <div className="shrink-0 border-t border-border px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-foreground/60">
            {t("footer.console.reference", "Psalm 33:3")}
          </p>
          <p className="mt-1 text-xs font-serif text-secondary">
            {t(
              "footer.console.text",
              "“Sing to Him a new song; play skillfully with a shout of joy.”",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

