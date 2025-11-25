"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { useGetClassAccessQuery } from "@/store/api/classApi";
import { X, Share2 } from "lucide-react";

export default function LiveClassPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const { data, isLoading, error } = useGetClassAccessQuery(classId, {
    skip: !isLoggedIn || !classId,
  });

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return null;
  }

  const isTeacher = user?.role === "Teacher" || user?.role === "Admin";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-lg">Loading classroom...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-lg font-semibold text-primary">
            Unable to load classroom
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 rounded-full bg-primary px-6 py-2 text-primary-foreground"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!data.liveLink) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-lg font-semibold text-primary">
            Live session is not available
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 rounded-full bg-primary px-6 py-2 text-primary-foreground"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleEndSession = () => {
    if (confirm("Are you sure you want to end this session?")) {
      router.push("/dashboard");
    }
  };

  const handleShareLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(data.liveLink || "");
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="relative flex h-screen flex-col bg-background text-foreground">
      {isTeacher && (
        <aside className="absolute right-0 top-0 z-50 flex h-full w-64 flex-col gap-4 border-l border-border bg-surface/95 p-6 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
              Teacher Controls
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-lg p-2 transition hover:bg-secondary/10"
              aria-label="Close panel"
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
              Share Screen Link
            </button>

            <button
              onClick={handleEndSession}
              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-90"
            >
              End Session
            </button>
          </div>

          <div className="mt-auto rounded-2xl border border-border bg-background/80 p-4">
            <p className="text-xs uppercase tracking-wide text-secondary">
              Class Info
            </p>
            <p className="mt-2 text-sm font-serif text-primary">
              {data.class.title}
            </p>
            <p className="mt-1 text-xs text-foreground/70">
              {data.isLive ? "Live Now" : "Session Offline"}
            </p>
          </div>
        </aside>
      )}

      <div className="flex-1">
        <iframe
          src={data.liveLink}
          className="h-full w-full border-0"
          allow="camera; microphone; fullscreen; display-capture"
          title="Live Classroom"
        />
      </div>
    </div>
  );
}

