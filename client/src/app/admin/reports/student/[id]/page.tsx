"use client";

import { useParams, useRouter } from "next/navigation";
import { useGetStudentAttendanceReportQuery, useGetStudentPaymentReportQuery } from "@/store/api/attendanceApi";
import { useI18n } from "@/components/providers/I18nProvider";
import { ArrowLeft, CheckCircle2, XCircle, Clock, AlertCircle, Download } from "lucide-react";

export default function StudentReportPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const id = params.id as string;

  const { data: attReport, isLoading: attLoading } = useGetStudentAttendanceReportQuery(id, { skip: !id });
  const { data: payReport, isLoading: payLoading } = useGetStudentPaymentReportQuery(id, { skip: !id });

  const isLoading = attLoading || payLoading;

  const formatDate = (d: string | Date | undefined | null) => {
    if (!d) return "—";
    return new Date(d as string).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const formatAmount = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", minimumFractionDigits: 0 }).format(n);

  const statusIcon = (status: string) => {
    switch (status) {
      case "present": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "late": return <Clock className="h-4 w-4 text-yellow-600" />;
      case "excused": return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default: return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const payStatusBadge = (status: string) => {
    const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold";
    if (status === "paid") return <span className={`${base} bg-green-500/10 text-green-600`}>Paid</span>;
    if (status === "waived") return <span className={`${base} bg-blue-500/10 text-blue-600`}>Waived</span>;
    return <span className={`${base} bg-amber-500/10 text-amber-600`}>Unpaid</span>;
  };

  const handleExportAttendance = () => {
    if (!attReport) return;
    const rows = [
      ["Date", "Status", "Lesson", "Note"],
      ...attReport.attendanceRecords.map((r) => [
        formatDate(r.date),
        r.status,
        (r.lesson as { title?: string } | null)?.title ?? "",
        "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `attendance-${id}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  // Extended pay report fields that may come from the backend but aren't in the base type
  type ExtendedPayReport = typeof payReport & {
    billing?: {
      periodsConsumed?: number;
      suggestedOwed?: number;
      overdue?: boolean;
      windowExceeded?: boolean;
    };
    student: {
      fullName: string;
      attendanceNumber?: string;
      instrumentType?: string;
      registrationStartDate?: string;
      branch?: unknown;
      monthlyFee?: number;
    };
  };

  const extPayReport = payReport as ExtendedPayReport | undefined;

  // Extended attendance report: lateCount is not in base type
  type ExtendedAttReport = typeof attReport & {
    lateCount?: number;
    attendanceRate?: number;
  };
  const extAttReport = attReport as ExtendedAttReport | undefined;

  return (
    <section className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex items-center gap-4">
          <button type="button" onClick={() => router.back()} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-background/60 transition">
            <ArrowLeft className="h-4 w-4" />
            {t("button.back", "Back")}
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">{t("admin.reports.kicker", "Student Report")}</p>
            <h1 className="text-2xl font-serif text-primary">{attReport?.student.fullName ?? payReport?.student.fullName ?? "Loading…"}</h1>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl surface-elevated animate-pulse" />)}</div>
        ) : (
          <>
            {/* Student info */}
            {(attReport || payReport) && (
              <div className="rounded-3xl surface-elevated p-6 shadow-lg">
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div><p className="text-xs text-secondary/70 uppercase tracking-wide">{t("attendance.students.attendanceNumber", "ID")}</p><p className="font-semibold">{attReport?.student.attendanceNumber ?? "—"}</p></div>
                  <div><p className="text-xs text-secondary/70 uppercase tracking-wide">{t("attendance.students.instrument", "Instrument")}</p><p className="font-semibold">{attReport?.student.instrumentType ?? "—"}</p></div>
                  <div><p className="text-xs text-secondary/70 uppercase tracking-wide">{t("attendance.students.duration", "Duration")}</p><p className="font-semibold">{attReport?.student.programDurationMonths ?? "—"} months</p></div>
                  <div><p className="text-xs text-secondary/70 uppercase tracking-wide">{t("attendance.students.registrationDate", "Registered")}</p><p className="font-semibold">{formatDate(attReport?.student.registrationStartDate)}</p></div>
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Attendance report */}
              <div className="rounded-3xl surface-elevated p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-serif text-primary">{t("admin.reports.attendance", "Attendance")}</h2>
                  <button type="button" onClick={handleExportAttendance} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-background/60 transition">
                    <Download className="h-3.5 w-3.5" />{t("admin.payments.exportCsv", "CSV")}
                  </button>
                </div>
                {extAttReport && (
                  <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-green-500/10 p-2"><p className="text-lg font-bold text-green-600">{extAttReport.presentCount + (extAttReport.lateCount ?? 0)}</p><p className="text-green-700">{t("attendance.status.present", "Present")}</p></div>
                    <div className="rounded-xl bg-red-500/10 p-2"><p className="text-lg font-bold text-red-600">{extAttReport.absentCount}</p><p className="text-red-700">{t("attendance.status.absent", "Absent")}</p></div>
                    <div className="rounded-xl bg-secondary/10 p-2"><p className="text-lg font-bold text-secondary">{Math.round((extAttReport.attendanceRate ?? 0) * 100)}%</p><p className="text-secondary/70">{t("student.attendance.rate", "Rate")}</p></div>
                  </div>
                )}
                <div className="max-h-80 overflow-y-auto space-y-1">
                  {attReport?.attendanceRecords.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-background/50">
                      {statusIcon(r.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground/90">{formatDate(r.date)}</p>
                        {r.lesson && <p className="text-[11px] text-foreground/60 truncate">{(r.lesson as { title?: string }).title}</p>}
                      </div>
                      <span className="text-[10px] font-semibold uppercase text-foreground/50">{r.status}</span>
                    </div>
                  ))}
                  {!attReport?.attendanceRecords.length && <p className="py-4 text-center text-sm text-foreground/50">{t("admin.reports.noAttendance", "No attendance records.")}</p>}
                </div>
              </div>

              {/* Payment report */}
              <div className="rounded-3xl surface-elevated p-6 shadow-lg">
                <h2 className="mb-4 text-lg font-serif text-primary">{t("admin.reports.payments", "Payments")}</h2>
                {extPayReport && (
                  <>
                    <div className="mb-4 grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-green-500/10 p-2"><p className="text-lg font-bold text-green-600">{formatAmount(extPayReport.totalPaid)}</p><p className="text-green-700">{t("student.payments.totalPaid", "Total paid")}</p></div>
                      <div className="rounded-xl bg-secondary/10 p-2">
                        <p className="text-lg font-bold text-secondary">{extPayReport.billing?.periodsConsumed ?? 0}</p>
                        <p className="text-secondary/70">{t("student.payments.monthsAttended", "Months attended")}</p>
                      </div>
                    </div>
                    {extPayReport.billing && (
                      <div className={`mb-4 rounded-xl p-3 text-xs ${extPayReport.billing.overdue ? "bg-amber-500/10 text-amber-700" : "bg-green-500/10 text-green-700"}`}>
                        {extPayReport.billing.overdue
                          ? `${extPayReport.billing.suggestedOwed} month(s) outstanding${extPayReport.student.monthlyFee ? ` · ${formatAmount(extPayReport.billing.suggestedOwed! * extPayReport.student.monthlyFee)}` : ""}`
                          : t("student.payments.allPaid", "All caught up")}
                        {extPayReport.billing.windowExceeded && <span className="ml-2 font-bold">⚠ Over program window</span>}
                      </div>
                    )}
                  </>
                )}
                <div className="max-h-80 overflow-y-auto space-y-1">
                  {payReport?.payments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 hover:bg-background/50">
                      <div>
                        <p className="text-xs font-semibold text-foreground/90">Period {p.period ?? "—"}</p>
                        <p className="text-[11px] text-foreground/50">{p.month}/{p.year}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{formatAmount(p.amount ?? 0)}</span>
                        {payStatusBadge(p.status)}
                      </div>
                    </div>
                  ))}
                  {!payReport?.payments.length && <p className="py-4 text-center text-sm text-foreground/50">{t("admin.reports.noPayments", "No payment records.")}</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
