"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock, Filter, Loader2, RefreshCcw, Search } from "lucide-react";
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
        <header className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/95 p-4 shadow-lg sm:rounded-[32px] sm:p-6 lg:flex-row lg:items-center lg:justify-between">
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
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition hover:bg-(--color-secondary-soft)"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            {t("button.reload", "Refresh")}
          </button>
        </header>

        <div className="rounded-2xl border border-border bg-surface/90 p-4 shadow-lg sm:rounded-[32px] sm:p-5">
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center rounded-full border border-border bg-background px-3 py-2 sm:px-4">
                <Search className="h-4 w-4 text-secondary" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("admin.enrollments.search", "Search student or class")}
                  className="ml-2 flex-1 bg-transparent text-xs outline-none sm:text-sm"
                />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold uppercase tracking-widest text-foreground/70 sm:px-4">
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
                            <p className="text-xs">
                              <a
                                href={enrollment.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-secondary underline underline-offset-2"
                              >
                                Receipt
                              </a>
                            </p>
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
                        <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-6 text-center text-sm text-foreground/70">
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
                    className="rounded-2xl border border-border bg-surface p-4 shadow-lg"
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
                          <a
                            href={enrollment.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-secondary underline underline-offset-2 mt-1 inline-block"
                          >
                            {t("admin.enrollments.viewReceipt", "View Receipt")}
                          </a>
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
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-6 text-center text-sm text-foreground/70">
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
    </section>
  );
}

