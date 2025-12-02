"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { useGetClassAccessQuery } from "@/store/api/classApi";
import { X, Share2 } from "lucide-react";
import { LiveRoom } from "@/components/live/LiveRoom";
import { useI18n } from "@/components/providers/I18nProvider";

export default function LiveClassPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const { data, isLoading, error } = useGetClassAccessQuery(classId, {
    skip: !isLoggedIn || !classId,
  });
  const { t } = useI18n();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return null;
  }

  const isTeacher = user?.role === "Teacher" || user?.role === "Admin";
  const resolvedUserId =
    typeof user?._id === "string"
      ? user._id
      : typeof user?.id === "string"
        ? user.id
        : "";
  const resolvedRole: "Teacher" | "Admin" | "Student" =
    user?.role === "Teacher"
      ? "Teacher"
      : user?.role === "Admin"
        ? "Admin"
        : "Student";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-lg">
          {t("live.loading", "Loading classroom...")}
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-lg font-semibold text-primary">
            {t("live.error.title", "Unable to load classroom")}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 rounded-full bg-primary px-6 py-2 text-primary-foreground"
          >
            {t("live.error.backDashboard", "Return to Dashboard")}
          </button>
        </div>
      </div>
    );
  }

  if (!data.isLive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-lg font-semibold text-primary">
            {t("live.notAvailable", "Live session is not available")}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 rounded-full bg-primary px-6 py-2 text-primary-foreground"
          >
            {t("live.error.backDashboard", "Return to Dashboard")}
          </button>
        </div>
      </div>
    );
  }

  const handleEndSession = () => {
    if (
      confirm(
        t(
          "live.confirm.endSession",
          "Are you sure you want to end this session for everyone?",
        ),
      )
    ) {
      router.push("/dashboard");
    }
  };

  const handleShareLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert(t("live.share.copied", "Link copied to clipboard!"));
    }
  };

  return (
    <div className="relative flex h-screen flex-col bg-background text-foreground">
      {isTeacher && (
        <aside className="absolute right-0 top-0 z-40 hidden h-full w-64 flex-col gap-4 border-l border-border bg-surface/95 p-5 shadow-xl backdrop-blur lg:flex">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
              {t("live.teacher.kicker", "Teacher Controls")}
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-lg p-2 transition hover:bg-secondary/10"
              aria-label={t("live.teacher.closePanel", "Close panel")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleShareLink}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium transition hover:bg-secondary/10"
            >
              <Share2 className="h-4 w-4 text-secondary" />
              {t("live.teacher.shareLink", "Share live link")}
            </button>

            <button
              onClick={handleEndSession}
              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-90"
            >
              {t("live.teacher.endSession", "End session")}
            </button>
          </div>

          <div className="mt-auto rounded-2xl border border-border bg-background/80 p-4">
            <p className="text-xs uppercase tracking-wide text-secondary">
              {t("live.teacher.classInfo", "Class Info")}
            </p>
            <p className="mt-2 text-sm font-serif text-primary">
              {data.class.title}
            </p>
            <p className="mt-1 text-xs text-foreground/70">
              {data.isLive
                ? t("live.status.liveNow", "Live Now")
                : t("live.status.offline", "Session Offline")}
            </p>
          </div>
        </aside>
      )}

      <div
        className={`flex h-full flex-1 flex-col px-3 py-4 md:px-6 ${
          isTeacher ? "lg:pr-72" : ""
        }`}
      >
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/90 px-3 py-2 text-sm shadow-sm md:mb-4 md:px-4 md:py-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-secondary md:text-xs">
              {t("live.header.kicker", "Live Class")}
            </p>
            <h1 className="text-base font-serif text-primary md:text-lg">
              {data.class.title}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/80 transition hover:bg-background md:px-4 md:text-sm"
          >
            {t("live.header.backDashboard", "Back to dashboard")}
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <LiveRoom
            classId={classId}
            userId={resolvedUserId}
            displayName={
              `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
              user?.email ||
              "Guest"
            }
            role={resolvedRole}
            onLeave={() => router.push("/dashboard")}
            isTeacherSession={isTeacher}
          />
        </div>
      </div>
    </div>
  );
}
