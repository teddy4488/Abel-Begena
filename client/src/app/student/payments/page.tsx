"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/components/providers/I18nProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { motion, AnimatePresence } from "framer-motion";
import { useGetMyPaymentsQuery, useGetMyUpcomingPaymentsQuery, attendanceApi } from "@/store/api/attendanceApi";
import { useSubmitStudentMonthlyPaymentMutation, useGetMyPaymentRequestsQuery } from "@/store/api/paymentApi";
import { useUploadReceiptMutation } from "@/store/api/storeApi";
import { useDispatch } from "react-redux";
import { Receipt, CheckCircle2, Clock, XCircle, Calendar, Filter, AlertTriangle, Upload, X, Loader2 } from "lucide-react";

type PaymentStatus = "paid" | "partial" | "unpaid";

type PaymentRecord = {
  year: number;
  month: number;
  status?: string;
  amount?: number;
  duedate?: unknown;
  period?: number;
  dueDate?: string;
};

function getEffectiveDueDate(payment: PaymentRecord | null | undefined): Date | null {
  try {
    if (payment?.duedate && Array.isArray(payment.duedate) && payment.duedate.length > 0) {
      const arr = payment.duedate as (string | number)[];
      const idx = payment.period != null && Number.isInteger(payment.period) && payment.period >= 1 && payment.period <= arr.length
        ? payment.period - 1
        : 0;
      return new Date(arr[idx]);
    }
    if (payment?.dueDate) return new Date(payment.dueDate);
    if (payment?.year != null && payment?.month != null) return new Date(payment.year, payment.month - 1, 5);
  } catch {
    // ignore parse errors
  }
  return null;
}

export default function StudentPaymentsPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const { t } = useI18n();
  const { pushToast } = useToast();
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | "all">("all");
  const [filterYear, setFilterYear] = useState<string>("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<{ month: number; year: number; amount: number } | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const { data: payments = [], isLoading } = useGetMyPaymentsQuery(undefined, {
    skip: !isLoggedIn || user?.userType !== "student",
  });

  const { data: upcomingPayments = [] } = useGetMyUpcomingPaymentsQuery(undefined, {
    skip: !isLoggedIn || user?.userType !== "student",
  });

  const { data: paymentRequests = [] } = useGetMyPaymentRequestsQuery(undefined, {
    skip: !isLoggedIn || user?.userType !== "student",
  });

  const [uploadReceipt, { isLoading: isUploading }] = useUploadReceiptMutation();
  const [submitPayment, { isLoading: isSubmitting }] = useSubmitStudentMonthlyPaymentMutation();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (user?.userType !== "student") {
      router.replace("/student");
    }
  }, [isLoggedIn, router, user?.userType]);

  // Calculate overdue payments (30-day rolling: use payment.duedate/period when set)
  const overduePayments = useMemo(() => {
    const now = new Date();
    return payments
      .filter((p) => {
        if (p.status === "paid") return false;
        const dueDate = getEffectiveDueDate(p) || new Date(p.year, p.month - 1, 5);
        return dueDate < now;
      })
      .map((p) => {
        const dueDate = getEffectiveDueDate(p) || new Date(p.year, p.month - 1, 5);
        const daysOverdue = Math.floor(
          (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        return { ...p, dueDate, daysOverdue };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [payments]);

  // Get pending payment requests by month/year
  const getPendingRequest = (month: number, year: number) => {
    return paymentRequests.find((pr) => {
      if (pr.type !== "student_monthly_fee" || pr.status !== "pending") return false;
      try {
        const metadata = JSON.parse(pr.conversionData || "{}");
        return metadata.month === month && metadata.year === year;
      } catch {
        return false;
      }
    });
  };

  const filteredPayments = useMemo(() => {
    let filtered = payments;
    
    if (filterStatus !== "all") {
      filtered = filtered.filter((p) => p.status === filterStatus);
    }
    
    if (filterYear) {
      const year = parseInt(filterYear);
      filtered = filtered.filter((p) => p.year === year);
    }
    
    return filtered.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [payments, filterStatus, filterYear]);

  const stats = useMemo(() => {
    const total = payments.length;
    const paid = payments.filter((p) => p.status === "paid").length;
    const partial = payments.filter((p) => p.status === "partial").length;
    const unpaid = payments.filter((p) => p.status === "unpaid").length;
    const totalPaid = payments
      .filter((p) => p.status === "paid" || p.status === "partial")
      .reduce((sum, p) => sum + p.amount, 0);
    
    return { total, paid, partial, unpaid, totalPaid };
  }, [payments]);

  if (!isLoggedIn || user?.userType !== "student") {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "partial":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "unpaid":
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case "paid":
        return t("payments.status.paid", "Paid");
      case "partial":
        return t("payments.status.partial", "Partial");
      case "unpaid":
        return t("payments.status.unpaid", "Unpaid");
    }
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

  const handleOpenReceiptModal = (payment: { month: number; year: number; amount?: number }) => {
    setSelectedPayment({ month: payment.month, year: payment.year, amount: payment.amount ?? 0 });
    setReceiptFile(null);
    setReceiptUrl("");
    setReference("");
    setNote("");
    setShowReceiptModal(true);
  };

  const handleSubmitReceipt = async () => {
    if (!selectedPayment) return;

    if (!receiptFile && !receiptUrl.trim()) {
      pushToast({
        title: t("student.payments.receiptRequired", "Receipt required"),
        description: t("student.payments.uploadOrLink", "Please upload a receipt file or provide a receipt URL"),
        variant: "error",
      });
      return;
    }

    try {
      let finalReceiptUrl = receiptUrl;

      if (receiptFile) {
        const uploaded = await uploadReceipt({ file: receiptFile }).unwrap();
        finalReceiptUrl = uploaded.url;
      }

      await submitPayment({
        month: selectedPayment.month,
        year: selectedPayment.year,
        amount: selectedPayment.amount,
        receiptUrl: finalReceiptUrl,
        reference: reference.trim() || undefined,
        reviewNote: note.trim() || undefined,
      }).unwrap();

      pushToast({
        title: t("student.payments.receiptSubmitted", "Receipt submitted"),
        description: t("student.payments.awaitingReview", "Your payment receipt has been submitted and is awaiting admin review"),
        variant: "success",
      });

      // Invalidate attendance queries to refresh payment data
      dispatch(attendanceApi.util.invalidateTags(["StudentPayments"]));

      setShowReceiptModal(false);
      setSelectedPayment(null);
      setReceiptFile(null);
      setReceiptUrl("");
      setReference("");
      setNote("");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "data" in err && err.data && typeof err.data === "object" && "message" in err.data
          ? String((err.data as { message: unknown }).message)
          : t("student.payments.tryAgain", "Please try again");
      pushToast({
        title: t("student.payments.submitError", "Submission failed"),
        description: msg,
        variant: "error",
      });
    }
  };

  return (
    <section className="min-h-screen bg-background px-4 py-8 text-foreground transition-colors sm:px-6 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Overdue Payments Alert */}
        {overduePayments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-red-500/10 border border-red-500/30 p-6 shadow-lg"
          >
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-600 mb-2">
                  {t("student.payments.overdue", "Overdue Payments")}
                </h3>
                <p className="text-sm text-foreground/80 mb-3">
                  {t("student.payments.overdueDescription", "You have overdue payment(s). Please submit your receipts as soon as possible.").replace("overdue payment(s)", `${overduePayments.length} overdue payment(s)`)}
                </p>
                <div className="space-y-2">
                  {overduePayments.slice(0, 3).map((payment) => {
                    const pendingRequest = getPendingRequest(payment.month, payment.year);
                    return (
                      <div key={payment._id} className="flex items-center justify-between rounded-xl bg-background/40 p-3">
                        <div>
                          <p className="font-semibold text-primary">
                            {getMonthName(payment.month)} {payment.year}
                          </p>
                          <p className="text-xs text-foreground/60">
                            {formatAmount(payment.amount)} • {t("student.payments.dueDate", "Due")}: {payment.dueDate.toLocaleDateString()} • {payment.daysOverdue} {t("student.payments.daysOverdue", "days overdue")}
                          </p>
                        </div>
                        {pendingRequest ? (
                          <span className="text-xs font-semibold text-yellow-600 bg-yellow-500/10 px-3 py-1 rounded-full">
                            {t("student.payments.pendingReview", "Pending Review")}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenReceiptModal(payment)}
                            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition"
                          >
                            <Upload className="h-3 w-3" />
                            {t("student.payments.submitReceipt", "Submit Receipt")}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Upcoming Payments */}
        {upcomingPayments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl bg-blue-500/10 border border-blue-500/30 p-6 shadow-lg"
          >
            <div className="flex items-start gap-4">
              <Calendar className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">
                  {t("student.payments.upcoming", "Upcoming Payments")}
                </h3>
                <p className="text-sm text-foreground/80 mb-3">
                  {t("student.payments.upcomingDescription", "You have upcoming payment(s).").replace("upcoming payment(s)", `${upcomingPayments.length} upcoming payment(s)`)}
                </p>
                <div className="space-y-2">
                  {upcomingPayments.slice(0, 3).map((payment) => {
                    const pendingRequest = getPendingRequest(payment.month, payment.year);
                    return (
                      <div key={`${payment.year}-${payment.month}`} className="flex items-center justify-between rounded-xl bg-background/40 p-3">
                        <div>
                          <p className="font-semibold text-primary">
                            {getMonthName(payment.month)} {payment.year}
                          </p>
                          <p className="text-xs text-foreground/60">
                            {formatAmount(payment.amount || 0)} • {t("student.payments.dueIn", "Due in")} {payment.daysUntilDue} {t("student.payments.days", "days")}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-blue-600 bg-blue-500/10 px-3 py-1 rounded-full">
                            {(() => { const d = getEffectiveDueDate(payment); return d ? d.toLocaleDateString() : "-" })()}
                          </span>
                          {pendingRequest ? (
                            <span className="text-xs font-semibold text-yellow-600 bg-yellow-500/10 px-3 py-1 rounded-full">
                              {t("student.payments.pendingReview", "Pending Review")}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenReceiptModal({ month: payment.month, year: payment.year, amount: payment.amount ?? 0 })}
                              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition"
                            >
                              <Upload className="h-3 w-3" />
                              {t("student.payments.submitReceipt", "Submit Receipt")}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:p-8"
        >
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
              {t("student.payments.kicker", "Payment History")}
            </p>
            <h1 className="text-3xl font-serif text-primary sm:text-4xl">
              {t("student.payments.title", "My Payments")}
            </h1>
            <p className="mt-2 text-sm text-foreground/70">
              {t(
                "student.payments.subtitle",
                "View your tuition payment records and history.",
              )}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Receipt className="h-5 w-5 text-secondary" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("student.payments.total", "Total Payments")}
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
            </div>

            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("student.payments.paid", "Paid")}
                </p>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            </div>

            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("student.payments.partial", "Partial")}
                </p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.partial}</p>
            </div>

            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="h-5 w-5 text-secondary" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("student.payments.totalPaid", "Total Paid")}
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">{formatAmount(stats.totalPaid)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-secondary" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as PaymentStatus | "all")}
                className="rounded-2xl surface-elevated px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-secondary/30 shadow-sm"
              >
                <option value="all">{t("student.payments.allStatuses", "All Statuses")}</option>
                <option value="paid">{t("payments.status.paid", "Paid")}</option>
                <option value="partial">{t("payments.status.partial", "Partial")}</option>
                <option value="unpaid">{t("payments.status.unpaid", "Unpaid")}</option>
              </select>
            </div>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="rounded-2xl surface-elevated px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-secondary/30 shadow-sm"
            >
              <option value="">{t("student.payments.allYears", "All Years")}</option>
              {years.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Payment Records */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl surface-elevated p-6 shadow-[0_25px_60px_rgba(18,6,6,0.12)] sm:p-8"
        >
          <h2 className="text-xl font-serif text-primary mb-4">
            {t("student.payments.records", "Payment Records")}
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl surface-elevated animate-pulse" />
              ))}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="rounded-xl surface-elevated p-8 text-center shadow-lg">
              <Receipt className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
              <p className="text-sm text-foreground/70">
                {t(
                  "student.payments.empty",
                  "No payment records found for the selected period.",
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPayments.map((payment, idx) => {
                const pendingRequest = getPendingRequest(payment.month, payment.year);
                return (
                  <motion.div
                    key={payment._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between rounded-xl surface-elevated p-4 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {getStatusIcon(payment.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-primary mb-1">
                          {getMonthName(payment.month)} {payment.year}
                        </p>
                        {payment.note && (
                          <p className="text-xs text-foreground/60 truncate">
                            {payment.note}
                          </p>
                        )}
                        {payment.createdAt && (
                          <p className="text-xs text-foreground/50 mt-1">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                        )}
                        {pendingRequest && (
                          <p className="text-xs text-yellow-600 mt-1">
                            {t("student.payments.receiptPending", "Receipt submitted, pending review")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">
                          {formatAmount(payment.amount)}
                        </p>
                        <p className="text-xs font-semibold text-foreground/60">
                          {getStatusLabel(payment.status)}
                        </p>
                      </div>
                      {payment.status !== "paid" && !pendingRequest && (
                        <button
                          onClick={() => handleOpenReceiptModal(payment)}
                          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
                        >
                          <Upload className="h-3 w-3" />
                          {t("student.payments.submitReceipt", "Submit Receipt")}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Receipt Submission Modal */}
      <AnimatePresence>
        {showReceiptModal && selectedPayment && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl surface-elevated p-6 shadow-[0_20px_60px_var(--color-primary-glow)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-serif text-primary">
                  {t("student.payments.submitReceipt", "Submit Payment Receipt")}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="rounded-full p-1 hover:bg-background/60"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl bg-background/40 p-4">
                  <p className="text-sm text-foreground/70 mb-1">
                    {t("student.payments.paymentPeriod", "Payment Period")}
                  </p>
                  <p className="font-semibold text-primary">
                    {getMonthName(selectedPayment.month)} {selectedPayment.year}
                  </p>
                  <p className="text-sm text-foreground/70 mt-2">
                    {t("student.payments.amount", "Amount")}: {formatAmount(selectedPayment.amount)}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("student.payments.uploadReceipt", "Upload Receipt")} ({t("common.optional", "optional")})
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                  {receiptFile && (
                    <p className="mt-2 text-xs text-foreground/60">
                      {t("student.payments.selectedFile", "Selected")}: {receiptFile.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("student.payments.receiptUrl", "Receipt URL")} ({t("common.optional", "optional")})
                  </label>
                  <input
                    type="url"
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("student.payments.reference", "Reference Number")} ({t("common.optional", "optional")})
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={t("student.payments.referencePlaceholder", "Transaction reference")}
                    className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("student.payments.note", "Note")} ({t("common.optional", "optional")})
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder={t("student.payments.notePlaceholder", "Additional information")}
                    className="w-full rounded-2xl card-elevated px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(false)}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-background/60"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitReceipt}
                    disabled={isUploading || isSubmitting || (!receiptFile && !receiptUrl.trim())}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {(isUploading || isSubmitting) && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {t("student.payments.submit", "Submit")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
