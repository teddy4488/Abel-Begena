"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/components/providers/I18nProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetMyPaymentsQuery,
  useGetMyBillingQuery,
  attendanceApi,
} from "@/store/api/attendanceApi";
import {
  useSubmitStudentMonthlyPaymentMutation,
  useGetMyPaymentRequestsQuery,
} from "@/store/api/paymentApi";
import { useUploadReceiptMutation } from "@/store/api/storeApi";
import { useDispatch } from "react-redux";
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Calendar,
  Filter,
  AlertTriangle,
  Upload,
  X,
  Loader2,
  CircleSlash,
} from "lucide-react";

type PaymentStatus = "paid" | "unpaid" | "waived";

export default function StudentPaymentsPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const { t } = useI18n();
  const { pushToast } = useToast();
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | "all">("all");
  const [filterYear, setFilterYear] = useState<string>("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const skip = !isLoggedIn || user?.userType !== "student";

  const { data: payments = [], isLoading } = useGetMyPaymentsQuery(undefined, { skip });
  const { data: billing } = useGetMyBillingQuery(undefined, { skip });
  const { data: paymentRequests = [] } = useGetMyPaymentRequestsQuery(undefined, { skip });

  const [uploadReceipt, { isLoading: isUploading }] = useUploadReceiptMutation();
  const [submitPayment, { isLoading: isSubmitting }] =
    useSubmitStudentMonthlyPaymentMutation();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (user?.userType !== "student") {
      router.replace("/student");
    }
  }, [isLoggedIn, router, user?.userType]);

  // A monthly-fee receipt is pending review (the student already submitted for the next period).
  const hasPendingMonthly = useMemo(
    () =>
      paymentRequests.some(
        (pr) => pr.type === "student_monthly_fee" && pr.status === "pending",
      ),
    [paymentRequests],
  );

  const filteredPayments = useMemo(() => {
    let filtered = payments;
    if (filterStatus !== "all") {
      filtered = filtered.filter((p) => p.status === filterStatus);
    }
    if (filterYear) {
      const year = parseInt(filterYear);
      filtered = filtered.filter((p) => p.year === year);
    }
    return [...filtered].sort((a, b) => (b.period ?? 0) - (a.period ?? 0));
  }, [payments, filterStatus, filterYear]);

  const stats = useMemo(() => {
    const total = payments.length;
    const paid = payments.filter((p) => p.status === "paid").length;
    const unpaid = payments.filter((p) => p.status === "unpaid").length;
    const totalPaid = payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + (p.paidToDate ?? p.amount), 0);
    return { total, paid, unpaid, totalPaid };
  }, [payments]);

  if (!isLoggedIn || user?.userType !== "student") {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const suggestedOwed = billing?.suggestedOwed ?? 0;
  const monthlyFee = billing?.monthlyFee ?? 0;
  const amountDue = suggestedOwed * monthlyFee;

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "waived":
        return <CircleSlash className="w-5 h-5 text-blue-600" />;
      default:
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case "paid":
        return t("payments.status.paid", "Paid");
      case "waived":
        return t("payments.status.waived", "Waived");
      default:
        return t("payments.status.unpaid", "Unpaid");
    }
  };

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 2,
    }).format(amount);

  const handleOpenReceiptModal = () => {
    setReceiptFile(null);
    setReceiptUrl("");
    setReference("");
    setNote("");
    setShowReceiptModal(true);
  };

  const handleSubmitReceipt = async () => {
    if (!receiptFile && !receiptUrl.trim()) {
      pushToast({
        title: t("student.payments.receiptRequired", "Receipt required"),
        description: t(
          "student.payments.uploadOrLink",
          "Please upload a receipt file or provide a receipt URL",
        ),
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

      const now = new Date();
      await submitPayment({
        // Month/year are metadata; the admin applies it to the next owed period on approval.
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        amount: monthlyFee || 0,
        receiptUrl: finalReceiptUrl,
        reference: reference.trim() || undefined,
        reviewNote: note.trim() || undefined,
      }).unwrap();

      pushToast({
        title: t("student.payments.receiptSubmitted", "Receipt submitted"),
        description: t(
          "student.payments.awaitingReview",
          "Your payment receipt has been submitted and is awaiting admin review",
        ),
        variant: "success",
      });

      dispatch(attendanceApi.util.invalidateTags(["StudentPayments"]));
      setShowReceiptModal(false);
      setReceiptFile(null);
      setReceiptUrl("");
      setReference("");
      setNote("");
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "data" in err &&
        err.data &&
        typeof err.data === "object" &&
        "message" in err.data
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
        {/* Amount due — consumption-based ("you pay for months you actually attend") */}
        {billing && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-3xl border p-6 shadow-lg ${
              suggestedOwed > 0
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-green-500/10 border-green-500/30"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {suggestedOwed > 0 ? (
                  <AlertTriangle className="h-6 w-6 flex-shrink-0 text-amber-600 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-green-600 mt-0.5" />
                )}
                <div>
                  <h3
                    className={`text-lg font-semibold ${
                      suggestedOwed > 0 ? "text-amber-700" : "text-green-700"
                    }`}
                  >
                    {suggestedOwed > 0
                      ? t("student.payments.amountDue", "Payment due")
                      : t("student.payments.allPaid", "You're all paid up")}
                  </h3>
                  <p className="mt-1 text-sm text-foreground/80">
                    {suggestedOwed > 0
                      ? t(
                          "student.payments.owedDescription",
                          "You owe for months of instruction you've already attended.",
                        )
                      : t(
                          "student.payments.paidDescription",
                          "You're only billed for months you actually attend — gaps are free.",
                        )}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-foreground/70">
                    <span>
                      {t("student.payments.monthsAttended", "Months attended")}:{" "}
                      <b className="text-foreground">{billing.periodsConsumed}</b>
                    </span>
                    <span>
                      {t("student.payments.monthsPaid", "Months paid")}:{" "}
                      <b className="text-foreground">{billing.periodsSettled}</b>
                    </span>
                    {monthlyFee > 0 && (
                      <span>
                        {t("student.payments.monthlyFee", "Monthly fee")}:{" "}
                        <b className="text-foreground">{formatAmount(monthlyFee)}</b>
                      </span>
                    )}
                    <span>
                      {t("student.payments.thisMonthSessions", "This month")}:{" "}
                      <b className="text-foreground">
                        {billing.currentWindowAttended}/{billing.expectedSessionsPerPeriod}
                      </b>{" "}
                      {t("student.payments.sessions", "sessions")}
                    </span>
                  </div>
                  {billing.windowExceeded && (
                    <p className="mt-2 text-xs font-semibold text-red-600">
                      {t(
                        "student.payments.windowExceeded",
                        "You've reached the maximum duration for this package. Please contact the school about re-enrollment.",
                      )}
                    </p>
                  )}
                </div>
              </div>

              {suggestedOwed > 0 && (
                <div className="text-right">
                  {monthlyFee > 0 && (
                    <p className="text-2xl font-bold text-amber-700">
                      {formatAmount(amountDue)}
                    </p>
                  )}
                  <p className="mb-2 text-xs text-foreground/60">
                    {suggestedOwed} {t("student.payments.monthsOwed", "month(s)")}
                  </p>
                  {hasPendingMonthly ? (
                    <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-600">
                      {t("student.payments.pendingReview", "Pending Review")}
                    </span>
                  ) : (
                    <button
                      onClick={handleOpenReceiptModal}
                      className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
                    >
                      <Upload className="h-3 w-3" />
                      {t("student.payments.submitReceipt", "Submit Receipt")}
                    </button>
                  )}
                </div>
              )}
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
                <XCircle className="h-5 w-5 text-red-600" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("student.payments.unpaid", "Unpaid")}
                </p>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.unpaid}</p>
            </div>

            <div className="rounded-2xl surface-elevated p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="h-5 w-5 text-secondary" />
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("student.payments.totalPaid", "Total Paid")}
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">
                {formatAmount(stats.totalPaid)}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-secondary" />
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as PaymentStatus | "all")
                }
                className="rounded-2xl surface-elevated px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-secondary/30 shadow-sm"
              >
                <option value="all">{t("student.payments.allStatuses", "All Statuses")}</option>
                <option value="paid">{t("payments.status.paid", "Paid")}</option>
                <option value="unpaid">{t("payments.status.unpaid", "Unpaid")}</option>
                <option value="waived">{t("payments.status.waived", "Waived")}</option>
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
              {filteredPayments.map((payment, idx) => (
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
                        {t("student.payments.month", "Month")} {payment.period ?? "—"}
                      </p>
                      {payment.note && (
                        <p className="text-xs text-foreground/60 truncate">{payment.note}</p>
                      )}
                      {payment.createdAt && (
                        <p className="text-xs text-foreground/50 mt-1">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                      )}
                      {payment.status === "unpaid" &&
                        payment.paidToDate != null &&
                        payment.paidToDate > 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            {t("student.payments.partial", "Partial")}:{" "}
                            {formatAmount(payment.paidToDate)} / {formatAmount(payment.amount)}
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
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Receipt Submission Modal */}
      <AnimatePresence>
        {showReceiptModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
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
                    {t("student.payments.amountDue", "Amount due")}
                  </p>
                  <p className="font-semibold text-primary">
                    {formatAmount(monthlyFee || 0)}{" "}
                    <span className="text-xs font-normal text-foreground/60">
                      {t("student.payments.perMonth", "per month")}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-foreground/60">
                    {t(
                      "student.payments.appliedToNext",
                      "Applied to your next unpaid month after admin review.",
                    )}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    {t("student.payments.uploadReceipt", "Upload Receipt")} (
                    {t("common.optional", "optional")})
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
                    {t("student.payments.receiptUrl", "Receipt URL")} (
                    {t("common.optional", "optional")})
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
                    {t("student.payments.reference", "Reference Number")} (
                    {t("common.optional", "optional")})
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={t(
                      "student.payments.referencePlaceholder",
                      "Transaction reference",
                    )}
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
                    placeholder={t(
                      "student.payments.notePlaceholder",
                      "Additional information",
                    )}
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
                    disabled={
                      isUploading || isSubmitting || (!receiptFile && !receiptUrl.trim())
                    }
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
