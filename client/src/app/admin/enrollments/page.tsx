"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Clock, Filter, Loader2, RefreshCcw, Search, X, Eye, Check, XCircle, FileText, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  useGetAllEnrollmentsQuery,
  type AdminEnrollment,
} from "@/store/api/adminApi";
import { useUpdateEnrollmentStatusMutation } from "@/store/api/classApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";

const statusPalette: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600",
  pending: "bg-amber-500/10 text-amber-600",
  withdrawn: "bg-rose-500/10 text-rose-500",
};

const statusOptions: Array<"active" | "pending" | "withdrawn"> = [
  "pending",
  "active",
  "withdrawn",
];

function formatAmount(amount?: number | null, currency?: string | null) {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return null;
  }
  const resolvedCurrency = currency ?? "ETB";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: resolvedCurrency,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${resolvedCurrency}`;
  }
}

export default function AdminEnrollmentsPage() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "pending" | "withdrawn"
  >("pending");
  const [search, setSearch] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<AdminEnrollment | null>(null);

  const { data = [], isLoading, isError, refetch, isFetching } =
    useGetAllEnrollmentsQuery(
      statusFilter === "all" ? undefined : { status: statusFilter },
    );

  const [updateStatus, { isLoading: isUpdating }] =
    useUpdateEnrollmentStatusMutation();

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return data;
    }
    const target = search.toLowerCase();
    return data.filter((item) => {
      const studentName = `${item.student.firstName ?? ""} ${item.student.lastName ?? ""}`.toLowerCase();
      return (
        studentName.includes(target) ||
        item.student.email.toLowerCase().includes(target) ||
        item.classTitle.toLowerCase().includes(target) ||
        (item.paymentReference ?? "").toLowerCase().includes(target)
      );
    });
  }, [data, search]);

  const handleStatusChange = async (
    enrollment: AdminEnrollment,
    status: "active" | "pending" | "withdrawn",
  ) => {
    try {
      await updateStatus({
        classId: enrollment.classId,
        studentId: enrollment.student.id,
        status,
      }).unwrap();
      pushToast({
        title: t("admin.enrollments.statusUpdated", "Enrollment updated"),
        variant: "success",
      });
      void refetch();
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("admin.enrollments.statusError", "Unable to update enrollment"),
        variant: "error",
      });
    }
  };

  return (
    <section className="min-h-screen bg-background px-4 py-8 text-foreground transition-colors sm:px-6 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:gap-6">
        <header className="flex flex-col gap-3 rounded-2xl  surface-elevated/95 p-4 shadow-lg sm:rounded-[32px] sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-secondary">
              {t("admin.enrollments.kicker", "Payment review")}
            </p>
            <h1 className="text-3xl font-serif text-primary">
              {t("admin.enrollments.title", "Enrollment Ledger")}
            </h1>
            <p className="text-sm text-foreground/70">
              {t(
                "admin.enrollments.subtitle",
                "Verify tuition entries, approve pending seats, and keep instructors in sync.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-full  px-4 py-2 text-xs font-semibold uppercase tracking-wide transition hover:bg-(--color-secondary-soft)"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            {t("button.reload", "Refresh")}
          </button>
        </header>

        <div className="rounded-2xl  surface-elevated/90 p-4 shadow-lg sm:rounded-[32px] sm:p-5">
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center rounded-full  bg-background px-3 py-2 sm:px-4">
                <Search className="h-4 w-4 text-secondary" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("admin.enrollments.search", "Search student or class")}
                  className="ml-2 flex-1 bg-transparent text-xs outline-none sm:text-sm"
                />
              </div>
              <div className="flex items-center gap-2 rounded-full  bg-background px-3 py-2 text-xs font-semibold uppercase tracking-widest text-foreground/70 sm:px-4">
                <Filter className="h-4 w-4" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="bg-transparent text-xs font-semibold uppercase tracking-widest outline-none"
                >
                  <option value="all">{t("admin.enrollments.filter.all", "All statuses")}</option>
                  <option value="pending">{t("classes.status.pending", "Pending")}</option>
                  <option value="active">{t("classes.status.active", "Active")}</option>
                  <option value="withdrawn">{t("classes.status.withdrawn", "Withdrawn")}</option>
                </select>
              </div>
            </div>
            <Link
              href="/classes"
              className="w-full inline-flex items-center justify-center rounded-full border border-secondary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-secondary transition hover:bg-(--color-secondary-soft) sm:w-auto"
            >
              {t("admin.enrollments.viewCatalog", "View classes")}
            </Link>
          </div>

          {isLoading && (
            <div className="mt-6 flex items-center gap-2 text-sm text-foreground/70">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("admin.enrollments.loading", "Loading enrollments...")}
            </div>
          )}

          {isError && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
              <p>{t("admin.enrollments.error", "Unable to load enrollments.")}</p>
            </div>
          )}

          {!isLoading && !isError && (
            <>
              {/* Desktop Table */}
              <div className="mt-6 hidden lg:block overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                    <th className="px-4 py-3">{t("admin.enrollments.student", "Student")}</th>
                    <th className="px-4 py-3">{t("admin.enrollments.class", "Class")}</th>
                    <th className="px-4 py-3">{t("admin.enrollments.payment", "Payment")}</th>
                    <th className="px-4 py-3">{t("admin.enrollments.status", "Status")}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filtered.map((enrollment) => {
                    const amountLabel = formatAmount(
                      enrollment.amountPaid,
                      enrollment.currency,
                    );
                    const status = enrollment.status ?? "pending";
                    return (
                      <tr key={`${enrollment.classId}-${enrollment.student.id}-${enrollment.paymentReference ?? ""}`}>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEnrollment(enrollment);
                              if (enrollment.receiptUrl) {
                                setSelectedReceipt(enrollment.receiptUrl);
                              }
                            }}
                            className="text-left"
                          >
                            <div className="font-semibold text-primary">
                              {[
                                enrollment.student.firstName,
                                enrollment.student.lastName,
                              ]
                                .filter(Boolean)
                                .join(" ") || enrollment.student.email}
                            </div>
                            <p className="text-xs text-foreground/60">
                              {enrollment.student.email}
                            </p>
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-foreground">
                            {enrollment.classTitle}
                          </p>
                          {enrollment.instructor && (
                            <p className="text-xs text-foreground/60">
                              {t("admin.enrollments.instructor", "Instructor")}:{" "}
                              {enrollment.instructor}
                            </p>
                          )}
                          {enrollment.enrolledAt && (
                            <p className="text-xs text-foreground/60">
                              {t("admin.enrollments.enrolledAt", "Enrolled:")}{" "}
                              {new Date(enrollment.enrolledAt).toLocaleDateString()}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-foreground/70">
                          {amountLabel ? (
                            <span className="font-semibold text-foreground">
                              {amountLabel}
                            </span>
                          ) : (
                            <em>{t("admin.enrollments.noPayment", "Awaiting amount")}</em>
                          )}
                          {enrollment.paymentReference && (
                            <p className="text-xs">
                              {enrollment.paymentReference}
                            </p>
                          )}
                          {enrollment.paymentMethod && (
                            <p className="text-xs capitalize">
                              {enrollment.paymentMethod}
                            </p>
                          )}
                          {enrollment.receiptUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReceipt(enrollment.receiptUrl!);
                                setSelectedEnrollment(enrollment);
                              }}
                              className="mt-1 inline-flex items-center gap-1 text-xs text-secondary hover:underline"
                            >
                              <Eye className="h-3 w-3" />
                              {t("admin.enrollments.viewReceipt", "View Receipt")}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusPalette[status] ?? "bg-secondary/20 text-secondary"}`}
                          >
                            {t(`classes.status.${status}`, status)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {statusOptions.map((option) => (
                              <button
                                key={option}
                                type="button"
                                disabled={isUpdating || option === status}
                                onClick={() => handleStatusChange(enrollment, option)}
                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                                  option === status
                                    ? "border-border bg-border/40 text-foreground/70"
                                    : "border-border text-foreground hover:bg-(--color-secondary-soft)"
                                } disabled:opacity-50`}
                              >
                                {option === "active" ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : (
                                  <Clock className="h-3 w-3" />
                                )}
                                {t(`classes.status.${option}`, option)}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center">
                        <div className="rounded-2xl border border-dashed border-border/70 card-elevated60 p-6 text-center text-sm text-foreground/70">
                          {t(
                            "admin.enrollments.noMatches",
                            "No enrollments match your filters.",
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="mt-6 lg:hidden space-y-4">
              {filtered.map((enrollment) => {
                const amountLabel = formatAmount(
                  enrollment.amountPaid,
                  enrollment.currency,
                );
                const status = enrollment.status ?? "pending";
                return (
                  <motion.div
                    key={`${enrollment.classId}-${enrollment.student.id}-${enrollment.paymentReference ?? ""}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl  surface-elevated p-4 shadow-lg"
                  >
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-secondary/70 mb-1">
                          {t("admin.enrollments.student", "Student")}
                        </p>
                        <p className="font-semibold text-primary">
                          {[
                            enrollment.student.firstName,
                            enrollment.student.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ") || enrollment.student.email}
                        </p>
                        <p className="text-xs text-foreground/60 mt-1">
                          {enrollment.student.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-secondary/70 mb-1">
                          {t("admin.enrollments.class", "Class")}
                        </p>
                        <p className="font-semibold text-foreground">
                          {enrollment.classTitle}
                        </p>
                        {enrollment.instructor && (
                          <p className="text-xs text-foreground/60 mt-1">
                            {t("admin.enrollments.instructor", "Instructor")}:{" "}
                            {enrollment.instructor}
                          </p>
                        )}
                        {enrollment.enrolledAt && (
                          <p className="text-xs text-foreground/60 mt-1">
                            {t("admin.enrollments.enrolledAt", "Enrolled:")}{" "}
                            {new Date(enrollment.enrolledAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-secondary/70 mb-1">
                          {t("admin.enrollments.payment", "Payment")}
                        </p>
                        {amountLabel ? (
                          <p className="font-semibold text-foreground">{amountLabel}</p>
                        ) : (
                          <p className="text-xs text-foreground/60 italic">
                            {t("admin.enrollments.noPayment", "Awaiting amount")}
                          </p>
                        )}
                        {enrollment.paymentReference && (
                          <p className="text-xs text-foreground/60 mt-1 font-mono">
                            {enrollment.paymentReference}
                          </p>
                        )}
                        {enrollment.paymentMethod && (
                          <p className="text-xs text-foreground/60 mt-1 capitalize">
                            {enrollment.paymentMethod}
                          </p>
                        )}
                        {enrollment.receiptUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReceipt(enrollment.receiptUrl!);
                              setSelectedEnrollment(enrollment);
                            }}
                            className="mt-1 inline-flex items-center gap-1 text-xs text-secondary hover:underline"
                          >
                            <Eye className="h-3 w-3" />
                            {t("admin.enrollments.viewReceipt", "View Receipt")}
                          </button>
                        )}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-secondary/70 mb-2">
                          {t("admin.enrollments.status", "Status")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {statusOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              disabled={isUpdating || option === status}
                              onClick={() => handleStatusChange(enrollment, option)}
                              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                                option === status
                                  ? "border-border bg-border/40 text-foreground/70"
                                  : "border-border text-foreground hover:bg-(--color-secondary-soft)"
                              } disabled:opacity-50`}
                            >
                              {option === "active" ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {t(`classes.status.${option}`, option)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {!filtered.length && (
                <div className="rounded-2xl border border-dashed border-border/70 card-elevated60 p-6 text-center text-sm text-foreground/70">
                  {t(
                    "admin.enrollments.noMatches",
                    "No enrollments match your filters.",
                  )}
                </div>
              )}
            </div>
            </>
          )}
        </div>
      </div>

      {/* Receipt Viewer Modal */}
      <AnimatePresence>
        {selectedReceipt && selectedEnrollment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                    {t("admin.enrollments.receiptViewer", "Payment Receipt")}
                  </p>
                  <h3 className="text-lg font-serif text-primary">
                    {[selectedEnrollment.student.firstName, selectedEnrollment.student.lastName]
                      .filter(Boolean)
                      .join(" ") || selectedEnrollment.student.email}
                  </h3>
                  <p className="text-sm text-foreground/70 mt-1">
                    {selectedEnrollment.classTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReceipt(null);
                    setSelectedEnrollment(null);
                  }}
                  className="rounded-full p-2 text-foreground/70 hover:bg-secondary/10 transition"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Receipt Image */}
              <div className="relative bg-background p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <div className="flex items-center justify-center min-h-[400px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedReceipt}
                    alt="Payment receipt"
                    className="max-w-full max-h-[70vh] rounded-lg shadow-lg object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const errorDiv = target.nextElementSibling as HTMLElement;
                      if (errorDiv) errorDiv.style.display = "flex";
                    }}
                  />
                  <div className="hidden flex-col items-center justify-center gap-4 text-center p-8">
                    <FileText className="h-16 w-16 text-foreground/30" />
                    <div>
                      <p className="text-sm font-semibold text-foreground/70">
                        {t("admin.enrollments.receiptError", "Unable to load receipt image")}
                      </p>
                      <a
                        href={selectedReceipt}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-2 text-xs text-secondary hover:underline"
                      >
                        {t("admin.enrollments.openInNewTab", "Open in new tab")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Details & Actions */}
              <div className="border-t border-border p-4 bg-background/50">
                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary/70 mb-1">
                      {t("admin.enrollments.paymentDetails", "Payment Details")}
                    </p>
                    <div className="space-y-1 text-sm">
                      {formatAmount(
                        selectedEnrollment.amountPaid,
                        selectedEnrollment.currency,
                      ) && (
                        <p className="font-semibold text-primary">
                          {formatAmount(
                            selectedEnrollment.amountPaid,
                            selectedEnrollment.currency,
                          )}
                        </p>
                      )}
                      {selectedEnrollment.paymentMethod && (
                        <p className="text-foreground/70 capitalize">
                          {t("admin.enrollments.method", "Method")}:{" "}
                          {selectedEnrollment.paymentMethod}
                        </p>
                      )}
                      {selectedEnrollment.paymentReference && (
                        <p className="text-foreground/70 font-mono text-xs">
                          {t(
                            "admin.enrollments.reference",
                            "Reference",
                          )}:{" "}
                          {selectedEnrollment.paymentReference}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary/70 mb-1">
                      {t("admin.enrollments.currentStatus", "Current Status")}
                    </p>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                        statusPalette[selectedEnrollment.status ?? "pending"] ??
                        "bg-secondary/20 text-secondary"
                      }`}
                    >
                      {t(
                        `classes.status.${selectedEnrollment.status ?? "pending"}`,
                        selectedEnrollment.status ?? "pending",
                      )}
                    </span>
                  </div>
                </div>

                {/* Enrollment intake details from enrollment form */}
                <div className="mb-4 rounded-2xl border border-border bg-background/60 p-4">
                  <p className="mb-2 text-xs uppercase tracking-[0.3em] text-secondary/70">
                    {t(
                      "admin.enrollments.intakeDetails",
                      "Enrollment details from student form",
                    )}
                  </p>
                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    {selectedEnrollment.fullName && (
                      <div>
                        <p className="text-xs text-foreground/60">
                          {t("classes.modal.fullName", "Full name")}
                        </p>
                        <p className="text-foreground/80">
                          {selectedEnrollment.fullName}
                        </p>
                      </div>
                    )}
                    {selectedEnrollment.phone && (
                      <div>
                        <p className="text-xs text-foreground/60">
                          {t("classes.modal.phone", "Phone number")}
                        </p>
                        <p className="text-foreground/80">
                          {selectedEnrollment.phone}
                        </p>
                      </div>
                    )}
                    {selectedEnrollment.emergencyContactName && (
                      <div>
                        <p className="text-xs text-foreground/60">
                          {t(
                            "classes.modal.emergencyContactName",
                            "Emergency contact name",
                          )}
                        </p>
                        <p className="text-foreground/80">
                          {selectedEnrollment.emergencyContactName}
                        </p>
                      </div>
                    )}
                    {selectedEnrollment.emergencyContactPhone && (
                      <div>
                        <p className="text-xs text-foreground/60">
                          {t(
                            "classes.modal.emergencyContactPhone",
                            "Emergency contact phone",
                          )}
                        </p>
                        <p className="text-foreground/80">
                          {selectedEnrollment.emergencyContactPhone}
                        </p>
                      </div>
                    )}
                    {selectedEnrollment.city && (
                      <div>
                        <p className="text-xs text-foreground/60">
                          {t("classes.modal.city", "City")}
                        </p>
                        <p className="text-foreground/80">
                          {selectedEnrollment.city}
                        </p>
                      </div>
                    )}
                    {selectedEnrollment.address && (
                      <div>
                        <p className="text-xs text-foreground/60">
                          {t("classes.modal.address", "Address / location")}
                        </p>
                        <p className="text-foreground/80">
                          {selectedEnrollment.address}
                        </p>
                      </div>
                    )}
                    {selectedEnrollment.learningGoals && (
                      <div className="md:col-span-2">
                        <p className="text-xs text-foreground/60">
                          {t(
                            "classes.modal.learningGoals",
                            "What are your learning goals?",
                          )}
                        </p>
                        <p className="text-foreground/80">
                          {selectedEnrollment.learningGoals}
                        </p>
                      </div>
                    )}
                    {selectedEnrollment.notesForTeacher && (
                      <div className="md:col-span-2">
                        <p className="text-xs text-foreground/60">
                          {t(
                            "teacher.students.notesForTeacher",
                            "Notes for teacher",
                          )}
                        </p>
                        <p className="text-foreground/80">
                          {selectedEnrollment.notesForTeacher}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                {selectedEnrollment.status === "pending" && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        await handleStatusChange(selectedEnrollment, "active");
                        setSelectedReceipt(null);
                        setSelectedEnrollment(null);
                      }}
                      disabled={isUpdating}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      {t("admin.enrollments.approve", "Approve Payment")}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleStatusChange(selectedEnrollment, "withdrawn");
                        setSelectedReceipt(null);
                        setSelectedEnrollment(null);
                      }}
                      disabled={isUpdating}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-red-500/60 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-500/10 disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      {t("admin.enrollments.reject", "Reject")}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

