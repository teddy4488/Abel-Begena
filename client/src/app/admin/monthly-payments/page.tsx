"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetBillingSummaryQuery,
  useRecordStudentPaymentMutation,
  useGetOverduePaymentsQuery,
  useGetStudentUpcomingPaymentsQuery,
  useGetStudentPaymentReportQuery,
  attendanceApi,
} from "@/store/api/attendanceApi";
import { useGetPendingPaymentRequestsQuery, useUpdatePaymentStatusMutation, type PaymentRequest } from "@/store/api/paymentApi";
import { useUploadReceiptMutation } from "@/store/api/storeApi";
import { useDispatch } from "react-redux";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import Pagination from "@/components/ui/Pagination";
import {
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  FileText,
  ExternalLink,
  Check,
  XCircle,
  Clock,
  X,
  Loader2,
  Receipt,
  DollarSign,
  Users,
  CheckCircle2,
} from "lucide-react";
import StudentPaymentsModal from "./components/StudentPaymentsModal";

export default function AdminMonthlyPaymentsPage() {
  const dispatch = useDispatch();
  const { t } = useI18n();
  const { pushToast } = useToast();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStudentId, setPaymentStudentId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("0");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partial" | "unpaid">("paid");
  const [paymentNote, setPaymentNote] = useState<string>("");
  const [overdueSearch, setOverdueSearch] = useState<string>("");
  const [overdueDaysFilter, setOverdueDaysFilter] = useState<string>("all");
  const [overdueDateFilter, setOverdueDateFilter] = useState<string>("");
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState<PaymentRequest | null>(null);
  const [reviewNote, setReviewNote] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [billingPage, setBillingPage] = useState(1);
  const [billingItemsPerPage, setBillingItemsPerPage] = useState(10);
  const [overduePage, setOverduePage] = useState(1);
  const [overdueItemsPerPage, setOverdueItemsPerPage] = useState(10);

  const { data: billingSummary } = useGetBillingSummaryQuery({ year: selectedYear, month: selectedMonth });
  const { data: overduePayments = [] } = useGetOverduePaymentsQuery();
  const { data: pendingPaymentRequests = [] } = useGetPendingPaymentRequestsQuery({
    type: "student_monthly_fee",
  });
  const [showNextDueModal, setShowNextDueModal] = useState(false);
  const [nextDueStudentId, setNextDueStudentId] = useState<string>("");
  const [showStudentPaymentsModal, setShowStudentPaymentsModal] = useState(false);
  const [paymentsStudentId, setPaymentsStudentId] = useState<string>("");
  const { t: tt } = useI18n(); // small alias for nested component use (avoid name shadowing)
  const [recordStudentPayment, { isLoading: recordingPayment }] = useRecordStudentPaymentMutation();
  const [updatePaymentStatus, { isLoading: isUpdatingPayment }] = useUpdatePaymentStatusMutation();
  const [uploadReceipt, { isLoading: isUploadingReceipt }] = useUploadReceiptMutation();
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null);

  const billingItems = billingSummary?.items ?? [];
  const unpaidCount = billingSummary?.unpaidCount ?? 0;
  const partialCount = billingSummary?.partialCount ?? 0;
  const paidCount = billingSummary?.paidCount ?? 0;

  useEffect(() => {
    setBillingPage(1);
  }, [selectedYear, selectedMonth, billingItems.length]);

  useEffect(() => {
    setOverduePage(1);
  }, [overdueSearch, overdueDaysFilter, overdueDateFilter, overduePayments.length]);

  // Payment request handlers
  const handleApprovePaymentRequest = async (request: PaymentRequest) => {
    try {
      await updatePaymentStatus({
        id: request._id,
        body: { status: "approved", reason: reviewNote || undefined },
      }).unwrap();
      pushToast({
        title: t("monthlyPayments.paymentApproved", "Payment Approved"),
        description: t("monthlyPayments.paymentApprovedDesc", "The payment has been approved and recorded."),
        variant: "success",
      });
      dispatch(attendanceApi.util.invalidateTags(["StudentPayments", "Billing"]));
      setSelectedPaymentRequest(null);
      setReviewNote("");
    } catch (error: any) {
      pushToast({
        title: t("monthlyPayments.paymentError", "Error"),
        description: error?.data?.message || t("monthlyPayments.paymentErrorDesc", "Failed to update payment status."),
        variant: "error",
      });
    }
  };

  const handleRejectPaymentRequest = async (request: PaymentRequest) => {
    if (!reviewNote.trim()) {
      pushToast({
        title: t("monthlyPayments.reasonRequired", "Reason Required"),
        description: t("monthlyPayments.reasonRequiredDesc", "Please provide a reason for rejection."),
        variant: "error",
      });
      return;
    }
    try {
      await updatePaymentStatus({
        id: request._id,
        body: { status: "rejected", reason: reviewNote },
      }).unwrap();
      pushToast({
        title: t("monthlyPayments.paymentRejected", "Payment Rejected"),
        description: t("monthlyPayments.paymentRejectedDesc", "The payment has been rejected."),
        variant: "success",
      });
      dispatch(attendanceApi.util.invalidateTags(["StudentPayments", "Billing"]));
      setSelectedPaymentRequest(null);
      setReviewNote("");
    } catch (error: any) {
      pushToast({
        title: t("monthlyPayments.paymentError", "Error"),
        description: error?.data?.message || t("monthlyPayments.paymentErrorDesc", "Failed to update payment status."),
        variant: "error",
      });
    }
  };

  const getUserDisplayName = (userId: PaymentRequest["userId"]) => {
    if (typeof userId === "object" && userId !== null) {
      const parts = [userId.firstName, userId.lastName].filter(Boolean);
      return parts.length > 0 ? parts.join(" ") : userId.email || "Unknown";
    }
    return "Unknown";
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    const months = [
      t("months.january", "January"),
      t("months.february", "February"),
      t("months.march", "March"),
      t("months.april", "April"),
      t("months.may", "May"),
      t("months.june", "June"),
      t("months.july", "July"),
      t("months.august", "August"),
      t("months.september", "September"),
      t("months.october", "October"),
      t("months.november", "November"),
      t("months.december", "December"),
    ];
    return months[month - 1] || `Month ${month}`;
  };

  // Helper to determine the effective due date for a payment record.
  function getEffectiveDueDate(payment: any): Date | null {
    try {
      if (payment?.duedate && Array.isArray(payment.duedate) && payment.duedate.length > 0) {
        const idx = payment?.period && Number.isInteger(payment.period) && payment.period >= 1 && payment.period <= payment.duedate.length
          ? payment.period - 1
          : 0;
        return new Date(payment.duedate[idx]);
      }
      if (payment?.dueDate) return new Date(payment.dueDate);
      if (payment?.year && payment?.month) return new Date(payment.year, payment.month - 1, 5);
    } catch (e) {
      // ignore parse errors and fall through to null
    }
    return null;
  }

  function NextDueModal({
    studentId,
    onClose,
    onViewPayments,
  }: {
    studentId: string;
    onClose: () => void;
    onViewPayments?: (id: string) => void;
  }) {
    const { data: upcoming = [], isFetching } = useGetStudentUpcomingPaymentsQuery({ id: studentId, daysAhead: 365 }, { skip: !studentId });
    const next = upcoming && upcoming.length > 0 ? upcoming[0] : null;

    return (
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4 backdrop-blur">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md rounded-2xl surface-elevated p-6 shadow-[0_20px_60px_var(--color-primary-glow)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-serif text-primary">{tt("monthlyPayments.nextDueTitle", "Next Due")}</h3>
            <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-background/60">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3">
            {isFetching ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm text-foreground/70">{tt("monthlyPayments.loading", "Loading...")}</p>
              </div>
            ) : next ? (
              <div>
                <p className="text-sm text-foreground/70">{tt("monthlyPayments.upcomingFor", "Upcoming payments for the student:")}</p>
                                <div className="mt-2 rounded-xl bg-background/50 p-3">
                      <p className="font-semibold text-primary">
                        {(() => {
                          const d = getEffectiveDueDate(next);
                          return d ? (
                            <div className="inline-flex items-center gap-2">
                              <span>{d.toLocaleDateString()}</span>
                              {next?.dueDateInferred && (
                                <span title={t("monthlyPayments.payments.inferredTooltip", "Due date inferred from registration date")} className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                  {t("monthlyPayments.payments.inferredBadge", "Inferred")}
                                </span>
                              )}
                            </div>
                          ) : "-";
                        })()}
                      </p>
                      <p className="text-xs text-foreground/60">{next.year}-{String(next.month).padStart(2, "0")}</p>
                      {next.amount && <p className="mt-2 text-sm font-bold text-primary">{formatAmount(next.amount)}</p>}
                      <p className="mt-2 text-xs text-foreground/70">{next.status ?? tt("monthlyPayments.status.unpaid", "Unpaid")}</p>
                    </div>

                    <div className="mt-4 flex justify-end gap-3">
                      <button type="button" onClick={() => { onViewPayments?.(studentId); onClose(); }} className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-background/60">{tt("monthlyPayments.viewPayments", "View payment history")}</button>
                    </div>
              </div>
            ) : (
              <p className="text-sm text-foreground/70">{tt("monthlyPayments.noUpcoming", "No upcoming payments found in the next year.")}</p>
            )}

            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-background/60">
                {tt("common.close", "Close")}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Calculate total revenue from paid payments
  const totalRevenue = useMemo(() => {
    return billingItems
      .filter((item) => item.status === "paid")
      .reduce((sum, item) => {
        // Get payment amount from student payments if available
        // For now, we'll use a default amount or calculate from billing summary
        return sum + (billingSummary?.items?.find((i) => i.participantId === item.participantId) ? 5000 : 0);
      }, 0);
  }, [billingItems, billingSummary]);

  return (
    <section className="min-h-screen bg-background px-4 py-8 text-foreground transition-colors sm:px-6 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:p-8"
        >
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
              {t("monthlyPayments.kicker", "Student Payments")}
            </p>
            <h1 className="text-3xl font-serif text-primary sm:text-4xl">
              {t("monthlyPayments.title", "Monthly Payments Management")}
            </h1>
            <p className="mt-2 text-sm text-foreground/70">
              {t(
                "monthlyPayments.subtitle",
                "Manage student monthly tuition payments, review receipts, and track overdue payments.",
              )}
            </p>
          </div>

          {/* Period Selector */}
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-secondary" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-2xl surface-elevated px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-secondary/30 shadow-sm"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="rounded-2xl surface-elevated px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-secondary/30 shadow-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {getMonthName(month)}
                </option>
              ))}
            </select>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-secondary" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("monthlyPayments.totalStudents", "Total Students")}
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">{billingSummary?.totalActiveStudents ?? 0}</p>
            </div>

            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("monthlyPayments.paid", "Paid")}
                </p>
              </div>
              <p className="text-2xl font-bold text-green-600">{paidCount}</p>
            </div>

            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("monthlyPayments.partial", "Partial")}
                </p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{partialCount}</p>
            </div>

            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="h-5 w-5 text-secondary" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("monthlyPayments.unpaid", "Unpaid")}
                </p>
              </div>
              <p className="text-2xl font-bold text-red-600">{unpaidCount}</p>
            </div>
          </div>
        </motion.div>

        {/* Overdue Payments Alert - Prominent Display */}
        {overduePayments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-red-500/10 border-2 border-red-500/30 p-6 shadow-lg"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div>
                  <h2 className="text-xl font-serif text-red-600">
                    {t("monthlyPayments.overdueTitle", "Overdue Payments Alert")}
                  </h2>
                  <p className="mt-1 text-sm text-foreground/80">
                    {`${overduePayments.length} ${t("monthlyPayments.overdueUrgent", "payment(s) are overdue and require immediate attention")}`}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white">
                {overduePayments.length}
              </span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {overduePayments.slice(0, 5).map((payment) => {
                const daysColor =
                  payment.daysOverdue > 30
                    ? "bg-red-600 text-white"
                    : payment.daysOverdue > 14
                      ? "bg-orange-600 text-white"
                      : "bg-yellow-600 text-white";
                return (
                  <div
                    key={`${payment.participantId}-${payment.year}-${payment.month}`}
                    className="flex items-center justify-between rounded-xl bg-background/60 p-3 border border-red-500/20"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-primary">{payment.fullName}</p>
                      <p className="text-xs text-foreground/60">
                        {payment.attendanceNumber} • {payment.instrumentType} •{" "}
                        {(() => { const d = getEffectiveDueDate(payment); return d ? d.toLocaleDateString() : "-" })() } •{" "}
                        {payment.year}-{String(payment.month).padStart(2, "0")}
                      </p>
                      {payment.amount && (
                        <p className="mt-1 text-sm font-semibold text-primary">
                          {formatAmount(payment.amount)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${daysColor}`}>
                        {payment.daysOverdue} {t("monthlyPayments.daysOverdue", "days")}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentStudentId(payment.participantId);
                          setPaymentStatus(payment.status || "unpaid");
                          setPaymentAmount(payment.amount?.toString() || "0");
                          setPaymentNote("");
                          setShowPaymentModal(true);
                        }}
                        className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-md hover:opacity-90"
                      >
                        {t("monthlyPayments.record", "Record Payment")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {overduePayments.length > 5 && (
              <p className="mt-3 text-xs text-foreground/60 text-center">
                {`+ ${overduePayments.length - 5} ${t("monthlyPayments.moreOverdue", "more overdue payments")}`}
              </p>
            )}
          </motion.div>
        )}

        {/* Billing Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:p-8"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {t("monthlyPayments.billingTitle", "Billing Overview")}
              </p>
              <h2 className="text-xl font-serif text-primary">
                {t("monthlyPayments.billingSubtitle", "Monthly Tuition Status")}
              </h2>
              {billingSummary && (
                <p className="mt-1 text-xs text-foreground/60">
                  {t("monthlyPayments.period", "Period")}: {billingSummary.year}-{String(billingSummary.month).padStart(2, "0")}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {billingItems.length > 0 ? (
              <>
                <div className="mb-4 flex items-center justify-end gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary/70">
                    {t("pagination.itemsPerPage", "Items per page")}:
                  </label>
                  <select
                    value={billingItemsPerPage}
                    onChange={(e) => {
                      setBillingItemsPerPage(Number(e.target.value));
                      setBillingPage(1);
                    }}
                    className="rounded-2xl surface-elevated px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-secondary/30 shadow-sm"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                {billingItems
                  .slice(
                    (billingPage - 1) * billingItemsPerPage,
                    (billingPage - 1) * billingItemsPerPage + billingItemsPerPage,
                  )
                  .map((item) => {
                const statusColor =
                  item.status === "paid"
                    ? "bg-green-500/10 text-green-600"
                    : item.status === "partial"
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-red-500/10 text-red-600";
                return (
                  <div
                    key={item.participantId}
                    className="flex items-center justify-between rounded-xl card-elevated px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-primary">{item.fullName}</p>
                      <p className="text-xs text-foreground/60">
                        {item.attendanceNumber} • {item.instrumentType}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>
                        {item.status === "paid"
                          ? t("monthlyPayments.status.paid", "Paid")
                          : item.status === "partial"
                            ? t("monthlyPayments.status.partial", "Partial")
                            : t("monthlyPayments.status.unpaid", "Unpaid")}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentStudentId(item.participantId);
                          setPaymentStatus(item.status);
                          setPaymentAmount("0");
                          setPaymentNote("");
                          setShowPaymentModal(true);
                        }}
                        className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-md hover:opacity-90"
                      >
                        {t("monthlyPayments.record", "Record")}
                      </button>
                      {/* Overdue badge (if this student has an overdue payment for the selected period) */}
                      {billingSummary && (
                        (() => {
                          const overdueEntry = overduePayments.find(
                            (p) => p.participantId === item.participantId && p.year === billingSummary.year && p.month === billingSummary.month,
                          );
                          if (overdueEntry) {
                            const daysColor =
                              overdueEntry.daysOverdue > 30
                                ? "bg-red-600 text-white"
                                : overdueEntry.daysOverdue > 14
                                  ? "bg-orange-600 text-white"
                                  : "bg-yellow-600 text-white";
                            return (
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${daysColor}`}>
                                {overdueEntry.daysOverdue} {t("monthlyPayments.daysOverdue", "days")}
                              </span>
                            );
                          }
                          return null;
                        })()
                      )}

                      {/* Next due quick peek */}
                      <button
                        type="button"
                        title={tt("monthlyPayments.nextDueTitle", "View next due dates")}
                        onClick={() => {
                          setNextDueStudentId(item.participantId);
                          setShowNextDueModal(true);
                        }}
                        className="rounded-full bg-background/50 px-3 py-1 text-xs font-semibold text-foreground shadow-sm hover:opacity-90"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>                    </div>
                  </div>
                );
                })}
                {billingItems.length > 0 &&
                  Math.ceil(billingItems.length / billingItemsPerPage) > 1 && (
                    <div className="mt-6">
                      <Pagination
                        currentPage={billingPage}
                        totalPages={Math.ceil(billingItems.length / billingItemsPerPage)}
                        totalItems={billingItems.length}
                        itemsPerPage={billingItemsPerPage}
                        onPageChange={setBillingPage}
                      />
                    </div>
                  )}
              </>
            ) : (
              <p className="py-8 text-center text-sm text-foreground/60">
                {t("monthlyPayments.noStudents", "No active students in attendance registry for this month.")}
              </p>
            )}
          </div>
        </motion.div>

        {/* Enhanced Overdue Payments Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:p-8"
        >
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                {t("monthlyPayments.overdue", "Overdue Payments")}
              </p>
              <h2 className="text-xl font-serif text-primary">
                {t("monthlyPayments.allOverdue", "All Overdue Payments")}
              </h2>
              <p className="mt-1 text-xs text-foreground/60">
                {overduePayments.length > 0
                  ? `${overduePayments.length} ${t("monthlyPayments.overdueCount", "payment(s) overdue")}`
                  : t("monthlyPayments.noOverdue", "No overdue payments")}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
                <input
                  type="text"
                  value={overdueSearch}
                  onChange={(e) => setOverdueSearch(e.target.value)}
                  placeholder={t("monthlyPayments.searchOverdue", "Search by student name, attendance number...")}
                  className="w-full rounded-2xl card-elevated pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-secondary" />
              <select
                value={overdueDaysFilter}
                onChange={(e) => setOverdueDaysFilter(e.target.value)}
                className="rounded-2xl card-elevated px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
              >
                <option value="all">{t("monthlyPayments.allDays", "All Days")}</option>
                <option value="0-7">{t("monthlyPayments.week1", "1-7 days")}</option>
                <option value="8-14">{t("monthlyPayments.week2", "8-14 days")}</option>
                <option value="15-30">{t("monthlyPayments.month1", "15-30 days")}</option>
                <option value="30+">{t("monthlyPayments.monthPlus", "30+ days")}</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-secondary" />
              <input
                type="date"
                value={overdueDateFilter}
                onChange={(e) => setOverdueDateFilter(e.target.value)}
                className="rounded-2xl card-elevated px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                placeholder={t("monthlyPayments.filterByDate", "Filter by due date")}
              />
            </div>
          </div>

          {/* Filtered Overdue Payments */}
          {(() => {
            // Helper to get payment request for an overdue payment
            const getPaymentRequestForOverdue = (payment: typeof overduePayments[0]) => {
              return pendingPaymentRequests.find((pr) => {
                if (pr.type !== "student_monthly_fee" || pr.status !== "pending") return false;
                try {
                  const metadata = JSON.parse(pr.conversionData || "{}");
                  return (
                    metadata.month === payment.month &&
                    metadata.year === payment.year &&
                    pr.targetId === payment.participantId
                  );
                } catch {
                  return false;
                }
              });
            };

            // Filter overdue payments
            const filteredOverdue = overduePayments.filter((payment) => {
              // Search filter
              if (overdueSearch.trim()) {
                const searchLower = overdueSearch.toLowerCase();
                const matchesSearch =
                  payment.fullName.toLowerCase().includes(searchLower) ||
                  payment.attendanceNumber.toLowerCase().includes(searchLower) ||
                  payment.instrumentType.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
              }

              // Days overdue filter
              if (overdueDaysFilter !== "all") {
                if (overdueDaysFilter === "0-7" && (payment.daysOverdue < 0 || payment.daysOverdue > 7))
                  return false;
                if (overdueDaysFilter === "8-14" && (payment.daysOverdue < 8 || payment.daysOverdue > 14))
                  return false;
                if (overdueDaysFilter === "15-30" && (payment.daysOverdue < 15 || payment.daysOverdue > 30))
                  return false;
                if (overdueDaysFilter === "30+" && payment.daysOverdue <= 30) return false;
              }

              // Date filter
              if (overdueDateFilter) {
                const filterDate = new Date(overdueDateFilter);
                const dueDate = getEffectiveDueDate(payment);
                if (!dueDate) return false;
                if (
                  dueDate.getFullYear() !== filterDate.getFullYear() ||
                  dueDate.getMonth() !== filterDate.getMonth() ||
                  dueDate.getDate() !== filterDate.getDate()
                )
                  return false;
              }

              return true;
            });

            // Pagination for overdue list
            const overdueTotalPages =
              filteredOverdue.length > 0
                ? Math.ceil(filteredOverdue.length / overdueItemsPerPage)
                : 1;
            const overdueStart = (overduePage - 1) * overdueItemsPerPage;
            const overdueEnd = overdueStart + overdueItemsPerPage;
            const paginatedOverdue = filteredOverdue.slice(overdueStart, overdueEnd);

            return (
              <div className="space-y-3">
                {filteredOverdue.length > 0 ? (
                  <>
                    <div className="mb-4 flex items-center justify-end gap-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary/70">
                        {t("pagination.itemsPerPage", "Items per page")}:
                      </label>
                      <select
                        value={overdueItemsPerPage}
                        onChange={(e) => {
                          setOverdueItemsPerPage(Number(e.target.value));
                          setOverduePage(1);
                        }}
                        className="rounded-2xl card-elevated px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    {paginatedOverdue.map((payment) => {
                    const daysColor =
                      payment.daysOverdue > 30
                        ? "bg-red-600 text-white"
                        : payment.daysOverdue > 14
                          ? "bg-orange-600 text-white"
                          : "bg-yellow-600 text-white";
                    const paymentRequest = getPaymentRequestForOverdue(payment);

                    return (
                      <div
                        key={`${payment.participantId}-${payment.year}-${payment.month}`}
                        className="rounded-xl card-elevated p-4 border border-border/50 hover:border-secondary/50 transition"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-semibold text-primary">{payment.fullName}</p>
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${daysColor}`}>
                                {payment.daysOverdue} {t("monthlyPayments.daysOverdue", "days")}
                              </span>
                              {paymentRequest && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-600">
                                  <Clock className="h-3 w-3" />
                                  {t("monthlyPayments.receiptPending", "Receipt Pending")}
                                </span>
                              )}
                            </div>
                            <div className="grid gap-1 text-xs text-foreground/60 sm:grid-cols-2">
                              <p>
                                <span className="font-semibold">{t("monthlyPayments.attendanceNumber", "Attendance #")}:</span>{" "}
                                {payment.attendanceNumber}
                              </p>
                              <p>
                                <span className="font-semibold">{t("monthlyPayments.instrument", "Instrument")}:</span>{" "}
                                {payment.instrumentType}
                              </p>
                              <p>
                                <span className="font-semibold">{t("monthlyPayments.period", "Period")}:</span>{" "}
                                {payment.year}-{String(payment.month).padStart(2, "0")}
                              </p>
                              <p>
                                <span className="font-semibold">{t("monthlyPayments.dueDate", "Due Date")}:</span>{" "}
                                {(() => { const d = getEffectiveDueDate(payment); return d ? d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-" })()}
                              </p>
                            </div>
                            {payment.amount && (
                              <p className="mt-2 text-sm font-bold text-primary">
                                {formatAmount(payment.amount)}
                              </p>
                            )}
                            {paymentRequest && (
                              <div className="mt-3 rounded-lg bg-amber-500/10 p-2 border border-amber-500/20">
                                <p className="text-xs font-semibold text-amber-700 mb-1">
                                  {t("monthlyPayments.receiptSubmitted", "Receipt Submitted")}
                                </p>
                                {paymentRequest.receiptUrl && (
                                  <a
                                    href={paymentRequest.receiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 transition"
                                  >
                                    <FileText className="h-3 w-3" />
                                    {t("monthlyPayments.viewReceipt", "View Receipt")}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                                {paymentRequest.reference && (
                                  <p className="text-xs text-foreground/60 mt-1">
                                    {t("monthlyPayments.reference", "Reference")}: {paymentRequest.reference}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            {paymentRequest ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPaymentRequest(paymentRequest);
                                    setReviewNote("");
                                  }}
                                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md hover:opacity-90 transition"
                                >
                                  <FileText className="h-3 w-3" />
                                  {t("monthlyPayments.reviewReceipt", "Review Receipt")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPaymentStudentId(payment.participantId);
                                    setPaymentStatus(payment.status || "unpaid");
                                    setPaymentAmount(payment.amount?.toString() || "0");
                                    setPaymentNote("");
                                    setShowPaymentModal(true);
                                  }}
                                  className="inline-flex items-center justify-center gap-2 rounded-full bg-background/60 px-4 py-2 text-xs font-semibold text-foreground/70 hover:bg-background/80 transition"
                                >
                                  {t("monthlyPayments.recordManually", "Record Manually")}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentStudentId(payment.participantId);
                                  setPaymentStatus(payment.status || "unpaid");
                                  setPaymentAmount(payment.amount?.toString() || "0");
                                  setPaymentNote("");
                                  setShowPaymentModal(true);
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md hover:opacity-90 transition"
                              >
                                {t("monthlyPayments.record", "Record Payment")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                    })}
                    {filteredOverdue.length > 0 && overdueTotalPages > 1 && (
                      <div className="mt-6">
                        <Pagination
                          currentPage={overduePage}
                          totalPages={overdueTotalPages}
                          totalItems={filteredOverdue.length}
                          itemsPerPage={overdueItemsPerPage}
                          onPageChange={setOverduePage}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl surface-elevated p-8 text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
                    <p className="text-sm text-foreground/70">
                      {overduePayments.length === 0
                        ? t("monthlyPayments.noOverdue", "No overdue payments")
                        : t("monthlyPayments.noMatchingOverdue", "No overdue payments match your filters")}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </motion.div>
      </div>

      {/* Payment Recording Modal */}
      <AnimatePresence>
        {showPaymentModal && billingSummary && (
          <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4 backdrop-blur">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl surface-elevated p-6 shadow-[0_20px_60px_var(--color-primary-glow)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-serif text-primary">
                  {t("monthlyPayments.recordTitle", "Record Payment")}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="rounded-full p-1 hover:bg-background/60"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-foreground/60">
                  {t("monthlyPayments.period", "Period")}: {billingSummary.year}-{String(billingSummary.month).padStart(2, "0")}
                </p>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("monthlyPayments.amount", "Amount")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("monthlyPayments.status", "Status")}
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) =>
                      setPaymentStatus(e.target.value as "paid" | "partial" | "unpaid")
                    }
                    className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  >
                    <option value="paid">{t("monthlyPayments.status.paid", "Paid")}</option>
                    <option value="partial">{t("monthlyPayments.status.partial", "Partial")}</option>
                    <option value="unpaid">{t("monthlyPayments.status.unpaid", "Unpaid")}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("monthlyPayments.note", "Note (optional)")}
                  </label>
                  <textarea
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("monthlyPayments.receipt", "Payment Receipt")} ({t("common.optional", "optional")})
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setPaymentReceiptFile(e.target.files?.[0] ?? null)}
                    className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none"
                  />
                  {paymentReceiptFile && (
                    <p className="mt-2 text-xs text-foreground/70">{paymentReceiptFile.name}</p>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPaymentReceiptFile(null);
                    }}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-background/60"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={recordingPayment || !paymentStudentId}
                    onClick={async () => {
                      try {
                        let receiptUrl: string | undefined = undefined;
                        if (paymentReceiptFile) {
                          const uploaded = await uploadReceipt({ file: paymentReceiptFile }).unwrap();
                          receiptUrl = uploaded.url;
                        }

                        await recordStudentPayment({
                          participantId: paymentStudentId,
                          amount: Number(paymentAmount) || 0,
                          month: billingSummary.month,
                          year: billingSummary.year,
                          status: paymentStatus,
                          note: paymentNote || undefined,
                          receiptUrl,
                        }).unwrap();
                        pushToast({
                          title: t("monthlyPayments.saved", "Payment information saved"),
                          variant: "success",
                        });
                        setShowPaymentModal(false);
                        setPaymentReceiptFile(null);
                      } catch (error: any) {
                        pushToast({
                          title: t("monthlyPayments.error", "Unable to record payment"),
                          description: error?.data?.message || t("monthlyPayments.tryAgain", "Please try again"),
                          variant: "error",
                        });
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {(recordingPayment || isUploadingReceipt) && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("common.save", "Save")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Request Review Modal */}
      <AnimatePresence>
        {selectedPaymentRequest && (
          <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4 backdrop-blur">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl rounded-3xl border border-border bg-surface/95 p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-serif text-primary">
                    {t("monthlyPayments.reviewReceiptTitle", "Review Payment Receipt")}
                  </h3>
                  <p className="mt-1 text-sm text-foreground/70">
                    {t("monthlyPayments.reviewReceiptSubtitle", "Review the payment receipt and approve or reject the payment.")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPaymentRequest(null);
                    setReviewNote("");
                  }}
                  className="rounded-full p-2 text-foreground/70 transition hover:bg-secondary/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 space-y-3 rounded-2xl border border-border bg-background/50 p-4">
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-secondary/70">
                      {t("monthlyPayments.student", "Student")}
                    </p>
                    <p className="mt-1 font-semibold text-primary">
                      {getUserDisplayName(selectedPaymentRequest.userId)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-secondary/70">
                      {t("monthlyPayments.amount", "Amount")}
                    </p>
                    <p className="mt-1 font-semibold text-primary">
                      {formatAmount(selectedPaymentRequest.amount)}
                    </p>
                  </div>
                  {selectedPaymentRequest.reference && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-secondary/70">
                        {t("monthlyPayments.reference", "Reference")}
                      </p>
                      <p className="mt-1 text-foreground/80">{selectedPaymentRequest.reference}</p>
                    </div>
                  )}
                  {selectedPaymentRequest.createdAt && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-secondary/70">
                        {t("monthlyPayments.submitted", "Submitted")}
                      </p>
                      <p className="mt-1 text-foreground/80">
                        {new Date(selectedPaymentRequest.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}
                  {selectedPaymentRequest.conversionData && (
                    <div className="md:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-secondary/70">
                        {t("monthlyPayments.paymentPeriod", "Payment Period")}
                      </p>
                      <p className="mt-1 text-foreground/80">
                        {(() => {
                          try {
                            const metadata = JSON.parse(selectedPaymentRequest.conversionData);
                            return `${getMonthName(metadata.month)} ${metadata.year}`;
                          } catch {
                            return selectedPaymentRequest.conversionData;
                          }
                        })()}
                      </p>
                    </div>
                  )}
                </div>
                {selectedPaymentRequest.receiptUrl && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs uppercase tracking-wide text-secondary/70">
                      {t("monthlyPayments.receipt", "Payment Receipt")}
                    </p>
                    <a
                      href={selectedPaymentRequest.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold transition hover:border-secondary"
                    >
                      <FileText className="h-4 w-4" />
                      {t("monthlyPayments.viewReceipt", "View Receipt")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("monthlyPayments.reviewNote", "Review Note (Optional)")}
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={3}
                  placeholder={t("monthlyPayments.reviewNotePlaceholder", "Add any notes about this review...")}
                  className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleRejectPaymentRequest(selectedPaymentRequest)}
                  disabled={isUpdatingPayment}
                  className="flex-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/20 disabled:opacity-50"
                >
                  {isUpdatingPayment ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="mr-2 inline h-4 w-4" />
                      {t("monthlyPayments.reject", "Reject")}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleApprovePaymentRequest(selectedPaymentRequest)}
                  disabled={isUpdatingPayment}
                  className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
                >
                  {isUpdatingPayment ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="mr-2 inline h-4 w-4" />
                      {t("monthlyPayments.approve", "Approve")}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Next Due Modal (triggered from rows) */}
      {showNextDueModal && (
        <NextDueModal
          studentId={nextDueStudentId}
          onClose={() => setShowNextDueModal(false)}
          onViewPayments={(id) => {
            setPaymentsStudentId(id);
            setShowStudentPaymentsModal(true);
          }}
        />
      )}

      {showStudentPaymentsModal && (
        <StudentPaymentsModal studentId={paymentsStudentId} onClose={() => setShowStudentPaymentsModal(false)} />
      )}
    </section>
  );
}
