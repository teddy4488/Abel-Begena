"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/components/providers/I18nProvider";
import { useGetMyOrdersQuery } from "@/store/api/storeApi";
import { useGetClassesQuery } from "@/store/api/classApi";
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
} from "lucide-react";

type PaymentType = "all" | "enrollments" | "orders";

export default function PaymentHistoryPage() {
  const { t } = useI18n();
  const [filterType, setFilterType] = useState<PaymentType>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: orders = [], isLoading: ordersLoading } = useGetMyOrdersQuery();
  const { data: classes = [], isLoading: classesLoading } =
    useGetClassesQuery();

  const isLoading = ordersLoading || classesLoading;

  // Transform enrollments into payment items
  const enrollmentPayments = classes
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
  const orderPayments = orders.map((o) => ({
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
  const allPayments = [...enrollmentPayments, ...orderPayments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Apply filters
  const filteredPayments = allPayments.filter((p) => {
    if (filterType !== "all" && p.type !== filterType) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-begena-cream via-begena-cream to-begena-lightBrown dark:from-begena-darkBrown dark:via-gray-900 dark:to-black p-4 md:p-6 lg:p-8">
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <p className="text-2xl md:text-3xl font-bold text-begena-gold">
              {formatAmount(totalPaid, "ETB")}
            </p>
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
            <p className="text-2xl md:text-3xl font-bold text-begena-gold">
              {formatAmount(pendingAmount, "ETB")}
            </p>
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
            <p className="text-2xl md:text-3xl font-bold text-begena-gold">
              {filteredPayments.length}
            </p>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-begena-cream/40 dark:bg-begena-darkBrown/40 backdrop-blur-sm border border-begena-gold/20"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-begena-gold" />
            <span className="text-sm font-semibold text-begena-brown dark:text-begena-cream">
              {t("payments.filters.type", "Type")}:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "enrollments", "orders"] as PaymentType[]).map((type) => (
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
                  : type === "enrollments"
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
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg bg-begena-cream dark:bg-begena-darkBrown border border-begena-gold/30 text-begena-brown dark:text-begena-cream text-sm focus:outline-none focus:ring-2 focus:ring-begena-gold"
            >
              <option value="all">{t("payments.filters.allStatuses", "All Statuses")}</option>
              <option value="completed">{t("payments.status.completed", "Completed")}</option>
              <option value="pending">{t("payments.status.pending", "Pending")}</option>
              <option value="processing">{t("payments.status.processing", "Processing")}</option>
              <option value="failed">{t("payments.status.failed", "Failed")}</option>
            </select>
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
            className="text-center py-12 rounded-xl bg-begena-cream/40 dark:bg-begena-darkBrown/40 border border-begena-gold/20"
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
                className="p-4 md:p-6 rounded-xl bg-begena-cream/60 dark:bg-begena-darkBrown/60 backdrop-blur-sm border border-begena-gold/20 hover:border-begena-gold/40 transition-all"
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

