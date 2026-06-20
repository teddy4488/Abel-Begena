"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/components/providers/I18nProvider";
import { useGetMyOrdersQuery } from "@/store/api/storeApi";
import { useGetClassesQuery } from "@/store/api/classApi";
import { useGetMyBillingQuery } from "@/store/api/attendanceApi";
import { useAppSelector } from "@/store/hooks";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Receipt,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BookOpen,
  ShoppingBag,
  Filter,
  Calendar,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

type PaymentStatus = "completed" | "pending" | "processing" | "failed";
type PaymentRecordType = "enrollment" | "order";
type PaymentType = "all" | PaymentRecordType;

type PaymentRecord = {
  id: string;
  type: PaymentRecordType;
  title: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentReference?: string | null;
  status: PaymentStatus;
  date: string;
  receiptUrl?: string | null;
  note?: string | null;
};

export default function PaymentHistoryPage() {
  const { t } = useI18n();
  const [filterType, setFilterType] = useState<PaymentType>("all");
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { user } = useAppSelector((state) => state.auth);
  const isStudent = user?.userType === "student" || user?.role === "Student";
  const { data: billing } = useGetMyBillingQuery(undefined, { skip: !isStudent });

  const { data: orders = [], isLoading: ordersLoading } = useGetMyOrdersQuery();
  const { data: classes = [], isLoading: classesLoading } =
    useGetClassesQuery();

  const isLoading = ordersLoading || classesLoading;

  // Transform enrollments into payment items
  const enrollmentPayments: PaymentRecord[] = classes
    .filter((c) => c.myEnrollment && c.myEnrollment.amountPaid)
    .map((e) => ({
      id: `${e._id}-enrollment`,
      type: "enrollment" as const,
      title: e.title || t("classes.unknown", "Unknown Class"),
      amount: e.myEnrollment!.amountPaid!,
      currency: e.myEnrollment!.currency || "ETB",
      paymentMethod: e.myEnrollment!.paymentMethod || "Manual",
      paymentReference: e.myEnrollment!.paymentReference,
      status:
        e.myEnrollment!.status === "active"
          ? "completed"
          : e.myEnrollment!.status === "pending"
          ? "pending"
          : "failed",
      date: e.myEnrollment!.enrolledAt || e.createdAt || "",
      receiptUrl: e.myEnrollment!.receiptUrl,
      note: e.myEnrollment!.note,
    }));

  // Transform orders into payment items
  const orderPayments: PaymentRecord[] = orders.map((o) => ({
    id: o._id,
    type: "order" as const,
    title: `${o.items.length} ${o.items.length === 1 ? t("store.item", "item") : t("store.items", "items")}`,
    amount: o.totalAmount,
    currency: "ETB",
    paymentMethod: o.paymentMethod,
    paymentReference: o._id,
    status: o.isPaid
      ? o.status === "Delivered"
        ? "completed"
        : o.status === "Cancelled"
        ? "failed"
        : "processing"
      : "pending",
    date: o.createdAt,
    receiptUrl: null,
    note: null,
  }));

  // Combine and sort by date (newest first)
  const allPayments = useMemo(
    () =>
      [...enrollmentPayments, ...orderPayments].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [enrollmentPayments, orderPayments]
  );

  // Apply filters
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredPayments = allPayments.filter((p) => {
    if (filterType !== "all" && p.type !== filterType) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (normalizedSearch) {
      const haystack = `${p.title} ${p.paymentMethod ?? ""} ${
        p.paymentReference ?? ""
      }`.toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "processing":
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return t("payments.status.completed", "Completed");
      case "pending":
        return t("payments.status.pending", "Pending");
      case "processing":
        return t("payments.status.processing", "Processing");
      case "failed":
        return t("payments.status.failed", "Failed");
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return t("payments.date.unknown", "Unknown");
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "ETB",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const totalPaid = filteredPayments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = filteredPayments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  const typeBreakdown = filteredPayments.reduce(
    (acc, payment) => {
      acc[payment.type] += 1;
      return acc;
    },
    { enrollment: 0, order: 0 }
  );

  const latestPaymentDate = filteredPayments[0]?.date ?? null;
  const averageTicket =
    filteredPayments.length > 0
      ? filteredPayments.reduce((sum, p) => sum + p.amount, 0) /
        filteredPayments.length
      : 0;

  const escapeCsv = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '""';
    return `"${String(value).replace(/"/g, '""')}"`;
  };

  const handleExportCsv = () => {
    if (!filteredPayments.length) return;
    const header = [
      "id",
      "type",
      "title",
      "amount",
      "currency",
      "paymentMethod",
      "paymentReference",
      "status",
      "date",
      "note",
    ];
    const rows = filteredPayments.map((p) =>
      [
        escapeCsv(p.id),
        escapeCsv(p.type),
        escapeCsv(p.title),
        escapeCsv(p.amount.toString()),
        escapeCsv(p.currency),
        escapeCsv(p.paymentMethod),
        escapeCsv(p.paymentReference ?? ""),
        escapeCsv(p.status),
        escapeCsv(formatDate(p.date)),
        escapeCsv(p.note ?? ""),
      ].join(",")
    );
    const csvContent = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `abel-begena-payments-${new Date().toISOString()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-begena-gold/20 dark:bg-begena-gold/10">
              <Receipt className="w-6 h-6 md:w-8 md:h-8 text-begena-gold" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-begena-gold">
                {t("payments.title", "Payment History")}
              </h1>
              <p className="text-sm md:text-base text-begena-brown/70 dark:text-begena-cream/70 mt-1">
                {t(
                  "payments.subtitle",
                  "View all your class enrollments and product orders"
                )}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Consumption-based tuition card — only for students */}
        {isStudent && billing && (billing.suggestedOwed > 0 || billing.periodsConsumed > 0) && (
          <div className={`rounded-3xl border p-6 shadow-lg ${billing.suggestedOwed > 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-green-500/10 border-green-500/30"}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {billing.suggestedOwed > 0 ? (
                  <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600 mt-0.5" />
                ) : (
                  <TrendingUp className="h-6 w-6 shrink-0 text-green-600 mt-0.5" />
                )}
                <div>
                  <h3 className={`text-lg font-semibold ${billing.suggestedOwed > 0 ? "text-amber-700" : "text-green-700"}`}>
                    {billing.suggestedOwed > 0
                      ? t("student.payments.amountDue", "Tuition balance due")
                      : t("student.payments.allPaid", "Tuition up to date")}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-foreground/70">
                    <span>{t("student.payments.monthsAttended", "Months attended")}: <b className="text-foreground">{billing.periodsConsumed}</b></span>
                    <span>{t("student.payments.monthsPaid", "Months paid")}: <b className="text-foreground">{billing.periodsSettled}</b></span>
                    {billing.monthlyFee ? <span>{t("student.payments.monthlyFee", "Monthly fee")}: <b className="text-foreground">{new Intl.NumberFormat("en-US",{style:"currency",currency:"ETB",minimumFractionDigits:0}).format(billing.monthlyFee)}</b></span> : null}
                  </div>
                  {billing.windowExceeded && (
                    <p className="mt-2 text-xs font-semibold text-red-600">
                      {t("student.payments.windowExceeded", "You've reached the maximum duration. Please contact the school about re-enrollment.")}
                    </p>
                  )}
                </div>
              </div>
              {billing.suggestedOwed > 0 && billing.monthlyFee && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-700">{new Intl.NumberFormat("en-US",{style:"currency",currency:"ETB",minimumFractionDigits:0}).format(billing.suggestedOwed * billing.monthlyFee)}</p>
                  <p className="text-xs text-foreground/60">{billing.suggestedOwed} {t("student.payments.monthsOwed","month(s)")}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 md:p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-begena-brown/70 dark:text-begena-cream/70">
                {t("payments.summary.totalPaid", "Total Paid")}
              </span>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32 rounded-lg" />
            ) : (
              <p className="text-2xl md:text-3xl font-bold text-begena-gold">
                {formatAmount(totalPaid, "ETB")}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 md:p-6 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-begena-brown/70 dark:text-begena-cream/70">
                {t("payments.summary.pending", "Pending")}
              </span>
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-28 rounded-lg" />
            ) : (
              <p className="text-2xl md:text-3xl font-bold text-begena-gold">
                {formatAmount(pendingAmount, "ETB")}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 md:p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-begena-brown/70 dark:text-begena-cream/70">
                {t("payments.summary.totalTransactions", "Total Transactions")}
              </span>
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-20 rounded-lg" />
            ) : (
              <p className="text-2xl md:text-3xl font-bold text-begena-gold">
                {filteredPayments.length}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 md:p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-begena-brown/70 dark:text-begena-cream/70">
                {t("payments.summary.avgTicket", "Avg. Ticket")}
              </span>
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24 rounded-lg" />
            ) : (
              <p className="text-2xl md:text-3xl font-bold text-begena-gold">
                {formatAmount(averageTicket || 0, "ETB")}
              </p>
            )}
            {isLoading ? (
              <Skeleton className="mt-2 h-4 w-40 rounded-full" />
            ) : (
              <p className="text-xs text-begena-brown/60 dark:text-begena-cream/60 mt-1">
                {latestPaymentDate
                  ? `${t(
                      "payments.summary.lastPayment",
                      "Last payment on",
                    )} ${formatDate(latestPaymentDate)}`
                  : t("payments.summary.noPaymentsYet", "No payments yet")}
              </p>
            )}
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="tonal-lift flex flex-wrap items-center gap-3 p-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-begena-gold" />
            <span className="text-sm font-semibold text-begena-brown dark:text-begena-cream">
              {t("payments.filters.type", "Type")}:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "enrollment", "order"] as PaymentType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterType === type
                    ? "bg-begena-gold text-begena-darkBrown shadow-lg"
                    : "bg-begena-brown/20 dark:bg-begena-cream/20 text-begena-brown dark:text-begena-cream hover:bg-begena-brown/30 dark:hover:bg-begena-cream/30"
                }`}
              >
                {type === "all"
                  ? t("payments.filters.all", "All")
                  : type === "enrollment"
                  ? t("payments.filters.enrollments", "Enrollments")
                  : t("payments.filters.orders", "Orders")}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm font-semibold text-begena-brown dark:text-begena-cream">
              {t("payments.filters.status", "Status")}:
            </span>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as PaymentStatus | "all")
              }
              className="recessed px-3 py-2 text-foreground text-sm focus:outline-none"
            >
              <option value="all">{t("payments.filters.allStatuses", "All Statuses")}</option>
              <option value="completed">{t("payments.status.completed", "Completed")}</option>
              <option value="pending">{t("payments.status.pending", "Pending")}</option>
              <option value="processing">{t("payments.status.processing", "Processing")}</option>
              <option value="failed">{t("payments.status.failed", "Failed")}</option>
            </select>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3">
            <input
              type="search"
              placeholder={t(
                "payments.filters.search",
                "Search by class, method, or reference"
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="recessed flex-1 px-3 py-2 text-sm text-foreground focus:outline-none"
            />
            <button
              type="button"
              disabled={!filteredPayments.length}
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-lg bg-begena-gold/90 px-4 py-2 text-sm font-semibold text-begena-darkBrown transition hover:bg-begena-gold disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {t("payments.actions.exportCsv", "Export CSV")}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="tonal-lift p-4">
            <p className="text-sm font-semibold text-begena-brown dark:text-begena-cream mb-2">
              {t("payments.insights.breakdownTitle", "Breakdown by Type")}
            </p>
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs uppercase text-begena-brown/60 dark:text-begena-cream/60">
                  {t("payments.filters.enrollments", "Enrollments")}
                </p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-6 w-10 rounded-lg" />
                ) : (
                  <p className="text-2xl font-bold text-begena-gold">
                    {typeBreakdown.enrollment}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase text-begena-brown/60 dark:text-begena-cream/60">
                  {t("payments.filters.orders", "Orders")}
                </p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-6 w-10 rounded-lg" />
                ) : (
                  <p className="text-2xl font-bold text-begena-gold">
                    {typeBreakdown.order}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="tonal-lift p-4">
            <p className="text-sm font-semibold text-begena-brown dark:text-begena-cream mb-2">
              {t("payments.insights.pendingTitle", "Pending follow-ups")}
            </p>
            {isLoading ? (
              <Skeleton className="mt-1 h-6 w-10 rounded-lg" />
            ) : (
              <p className="text-2xl font-bold text-begena-gold">
                {
                  filteredPayments.filter(
                    (payment) =>
                      payment.status === "pending" || payment.status === "processing",
                  ).length
                }
              </p>
            )}
            <p className="text-xs text-begena-brown/60 dark:text-begena-cream/60 mt-1">
              {t(
                "payments.insights.pendingDescription",
                "Need manual verification or webhook confirmation."
              )}
            </p>
          </div>
        </motion.div>

        {/* Payment List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-begena-gold"></div>
            <p className="mt-4 text-begena-brown/70 dark:text-begena-cream/70">
              {t("payments.loading", "Loading payments...")}
            </p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="tonal-lift text-center py-12"
          >
            <Receipt className="w-12 h-12 mx-auto text-begena-brown/40 dark:text-begena-cream/40 mb-4" />
            <p className="text-begena-brown/70 dark:text-begena-cream/70">
              {t("payments.noPayments", "No payments found matching your filters.")}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment, index) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="tonal-lift p-4 md:p-6 backdrop-blur-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      {payment.type === "enrollment" ? (
                        <BookOpen className="w-5 h-5 text-begena-gold mt-1 flex-shrink-0" />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-begena-gold mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-begena-brown dark:text-begena-cream mb-1">
                          {payment.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-begena-brown/70 dark:text-begena-cream/70">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(payment.date)}
                          </div>
                          <span>•</span>
                          <span>
                            {t("payments.method", "Method")}: {payment.paymentMethod}
                          </span>
                          {payment.paymentReference && (
                            <>
                              <span>•</span>
                              <span>
                                {t("payments.reference", "Ref")}: {payment.paymentReference}
                              </span>
                            </>
                          )}
                        </div>
                        {payment.note && (
                          <p className="mt-2 text-sm text-begena-brown/60 dark:text-begena-cream/60 italic">
                            {payment.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-begena-gold">
                          {formatAmount(payment.amount, payment.currency)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(payment.status)}
                          <span className="text-sm font-medium text-begena-brown dark:text-begena-cream">
                            {getStatusLabel(payment.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {payment.receiptUrl && (
                      <a
                        href={payment.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-begena-gold/20 hover:bg-begena-gold/30 text-begena-brown dark:text-begena-cream transition-colors text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        {t("payments.downloadReceipt", "Download Receipt")}
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

