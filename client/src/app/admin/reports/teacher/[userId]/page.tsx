"use client";

import { useParams, useRouter } from "next/navigation";
import { useGetTeacherAttendanceReportByUserIdQuery } from "@/store/api/attendanceApi";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/components/providers/I18nProvider";
import { ArrowLeft, Loader2, Calendar, Clock } from "lucide-react";
import Link from "next/link";

export default function AdminTeacherAttendanceReportPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { data, isLoading, error } = useGetTeacherAttendanceReportByUserIdQuery(
    userId ? { userId } : { userId: "" },
    { skip: !userId },
  );
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const { t } = useI18n();

  if (!isLoggedIn || (user?.role !== "Admin" && user?.role !== "SuperAdmin")) {
    router.replace("/login");
    return null;
  }

  if (!userId) {
    return (
      <div className="p-6">
        <p className="text-foreground/70">{t("admin.reports.missingId", "Missing teacher.")}</p>
        <Link href="/admin/users" className="mt-4 inline-flex items-center gap-2 text-secondary hover:underline">
          <ArrowLeft className="w-4 h-4" /> {t("common.back", "Back")}
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <p className="text-red-600">{t("admin.reports.loadError", "Failed to load report.")}</p>
        <Link href="/admin/users" className="mt-4 inline-flex items-center gap-2 text-secondary hover:underline">
          <ArrowLeft className="w-4 h-4" /> {t("common.back", "Back")}
        </Link>
      </div>
    );
  }

  const { teacher, attendanceRecords, totalSessions, totalHours, generatedAt } = data;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-secondary hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> {t("common.back", "Back")}
      </Link>
      <h1 className="text-2xl font-serif text-primary mb-2">
        {t("admin.reports.teacherAttendance", "Teacher attendance report")}
      </h1>
      <p className="text-foreground/70 mb-6">
        {teacher?.fullName ?? "—"} • {totalSessions} {t("admin.reports.sessions", "sessions")} • {totalHours} {t("admin.reports.hours", "hours")}
      </p>
      <div className="rounded-2xl surface-elevated p-4 shadow-lg mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary/70 mb-3">
          {t("admin.reports.records", "Records")}
        </h2>
        {attendanceRecords.length === 0 ? (
          <p className="text-foreground/60">{t("admin.reports.noRecords", "No attendance records.")}</p>
        ) : (
          <ul className="space-y-2">
            {attendanceRecords.map((record, idx) => (
              <li
                key={idx}
                className="flex items-center gap-4 rounded-xl card-elevated px-4 py-3 text-sm"
              >
                <Calendar className="w-4 h-4 text-secondary shrink-0" />
                <span>
                  {new Date(record.checkInAt).toLocaleDateString()} {new Date(record.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                {record.checkOutAt && (
                  <>
                    <Clock className="w-4 h-4 text-secondary shrink-0" />
                    <span>
                      → {new Date(record.checkOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </>
                )}
                {record.durationMinutes != null && (
                  <span className="text-foreground/70 ml-auto">
                    {record.durationMinutes} min
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-xs text-foreground/50">
        {t("admin.reports.generatedAt", "Generated")}: {new Date(generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
