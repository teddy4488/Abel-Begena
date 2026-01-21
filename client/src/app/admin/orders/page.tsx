"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetAllOrdersQuery,
  useUpdateOrderStatusMutation,
} from "@/store/api/storeApi";
import {
  useGetPendingPaymentRequestsQuery,
  useUpdatePaymentStatusMutation,
  type PaymentRequest,
} from "@/store/api/paymentApi";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import {
  Package,
  ShoppingBag,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Loader2,
  Search,
  RefreshCcw,
  FileText,
  ExternalLink,
  X,
  Check,
  User,
  MapPin,
} from "lucide-react";

const statusConfig: Record<
  string,
  { color: string; bg: string; icon: React.ElementType; label: string }
> = {
  Pending: {
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    icon: Clock,
    label: "orders.status.pending",
  },
  PaymentPending: {
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    icon: Clock,
    label: "orders.status.paymentpending",
  },
  PaymentRejected: {
    color: "text-rose-600",
    bg: "bg-rose-500/10",
    icon: XCircle,
    label: "orders.status.paymentrejected",
  },
  Processing: {
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    icon: Package,
    label: "orders.status.processing",
  },
  Shipped: {
    color: "text-indigo-600",
    bg: "bg-indigo-500/10",
    icon: Truck,
    label: "orders.status.shipped",
  },
  Delivered: {
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    icon: CheckCircle2,
    label: "orders.status.delivered",
  },
  Cancelled: {
    color: "text-red-600",
    bg: "bg-red-500/10",
    icon: XCircle,
    label: "orders.status.cancelled",
  },
};

export default function AdminOrdersPage() {
  const { data: orders, isLoading, isError, refetch, isFetching } =
    useGetAllOrdersQuery();
  const [updateStatus, { isLoading: isUpdating }] =
    useUpdateOrderStatusMutation();
  const { data: pendingOrderPayments = [] } = useGetPendingPaymentRequestsQuery({
    type: "order",
  });
  const [updatePaymentStatus, { isLoading: isReviewingPayment }] =
    useUpdatePaymentStatusMutation();
  const { pushToast } = useToast();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const filtered = useMemo(() => {
    return (orders ?? [])
      .map((order) => ({
        ...order,
        completedAt:
          order.status === "Delivered" ? order.updatedAt ?? order.createdAt : null,
      }))
      .filter((order) => {
        const matchesSearch =
          !search ||
          order._id.toLowerCase().includes(search.toLowerCase()) ||
          order.items.some((item) =>
            item.product?.name?.toLowerCase().includes(search.toLowerCase()),
          );
        const matchesStatus = statusFilter === "all" || order.status === statusFilter;
        const matchesPayment =
          paymentFilter === "all" ||
          (paymentFilter === "paid" && order.isPaid) ||
          (paymentFilter === "unpaid" && !order.isPaid);
        return matchesSearch && matchesStatus && matchesPayment;
      });
  }, [orders, search, statusFilter, paymentFilter]);

  const handleStatusChange = async (
    orderId: string,
    status: string,
    isPaid: boolean,
  ) => {
    try {
      await updateStatus({
        id: orderId,
        status,
        isPaid,
      }).unwrap();
      pushToast({
        title: t("admin.orders.statusUpdated", "Order updated"),
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      pushToast({
        title: t("admin.orders.updateError", "Unable to update order"),
        variant: "error",
      });
    }
  };

  const pendingByOrderId = useMemo(() => {
    const map = new Map<string, PaymentRequest>();
    for (const req of pendingOrderPayments ?? []) {
      if (req.type !== "order") continue;
      const targetId =
        typeof req.targetId === "string" ? req.targetId : req.targetId ?? null;
      if (targetId) {
        map.set(targetId, req);
      }
    }
    return map;
  }, [pendingOrderPayments]);

  const getCustomerLabel = (order: any) => {
    const user = order?.user;
    if (user && typeof user === "object") {
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
      return name || user.email || t("admin.orders.unknownCustomer", "Customer");
    }
    return t("admin.orders.unknownCustomer", "Customer");
  };

  const getCustomerSub = (order: any) => {
    const user = order?.user;
    if (user && typeof user === "object") {
      return user.email || user.phone || "";
    }
    return "";
  };

  const handleApprove = async (orderId: string) => {
    const req = pendingByOrderId.get(orderId);
    if (!req) return;
    try {
      await updatePaymentStatus({
        id: req._id,
        body: { status: "approved", reason: reviewNote || undefined },
      }).unwrap();
      pushToast({
        title: t("admin.payments.review.approved", "Payment approved"),
        variant: "success",
      });
      setReviewNote("");
    } catch {
      pushToast({
        title: t("admin.payments.review.error", "Failed to update payment"),
        variant: "error",
      });
    }
  };

  const handleReject = async (orderId: string) => {
    const req = pendingByOrderId.get(orderId);
    if (!req) return;
    try {
      await updatePaymentStatus({
        id: req._id,
        body: { status: "rejected", reason: reviewNote || undefined },
      }).unwrap();
      pushToast({
        title: t("admin.payments.review.rejected", "Payment rejected"),
        variant: "success",
      });
      setReviewNote("");
    } catch {
      pushToast({
        title: t("admin.payments.review.error", "Failed to update payment"),
        variant: "error",
      });
    }
  };

  const stats = useMemo(() => {
    const total = orders?.length ?? 0;
    const paid = orders?.filter((o) => o.isPaid).length ?? 0;
    const pending = orders?.filter((o) => o.status === "Pending").length ?? 0;
    const delivered = orders?.filter((o) => o.status === "Delivered").length ?? 0;
    const revenue = orders?.reduce(
      (sum, order) => sum + (order.isPaid ? order.totalAmount : 0),
      0,
    ) ?? 0;
    const avgTicket = total > 0 ? revenue / total : 0;
    const fulfillmentRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    return { total, paid, pending, delivered, revenue, avgTicket, fulfillmentRate };
  }, [orders]);

  return (
    <section className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          {t("admin.orders.kicker", "Order Management")}
        </p>
        <h1 className="text-3xl md:text-4xl font-serif text-primary">
          {t("admin.orders.title", "Payment & Fulfillment")}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {t(
            "admin.orders.subtitle",
            "Manage store orders, track payments, and update fulfillment status.",
          )}
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl  surface-elevated p-4 shadow-lg sm:rounded-3xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/60">
                {t("admin.orders.stats.total", "Total Orders")}
              </p>
              <p className="text-2xl font-bold text-primary mt-1">{stats.total}</p>
            </div>
            <ShoppingBag className="w-8 h-8 text-secondary/40" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl  surface-elevated p-4 shadow-lg sm:rounded-3xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/60">
                {t("admin.orders.stats.paid", "Paid")}
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.paid}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-600/40" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl  surface-elevated p-4 shadow-lg sm:rounded-3xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/60">
                {t("admin.orders.stats.pending", "Pending")}
              </p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-amber-600/40" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl  surface-elevated p-4 shadow-lg sm:rounded-3xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/60">
                {t("admin.orders.stats.delivered", "Delivered")}
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.delivered}</p>
            </div>
            <Truck className="w-8 h-8 text-emerald-600/40" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl  surface-elevated p-4 shadow-lg sm:rounded-3xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary/60">
                {t("admin.orders.stats.revenue", "Paid Revenue")}
              </p>
              <p className="text-2xl font-bold text-primary mt-1">
                {stats.revenue.toLocaleString("en-US", { style: "currency", currency: "ETB" })}
              </p>
              <p className="text-xs text-foreground/60">
                {t("admin.orders.stats.avgTicket", "Avg ticket")}:{" "}
                {stats.avgTicket.toLocaleString("en-US", {
                  style: "currency",
                  currency: "ETB",
                })}
              </p>
            </div>
            <Package className="w-8 h-8 text-secondary/40" />
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3 rounded-2xl  surface-elevated p-4 sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.orders.searchPlaceholder", "Search by order ID or product...")}
              className="w-full rounded-xl  card-elevated70 pl-10 pr-4 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full rounded-xl  card-elevated70 px-4 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30 sm:w-auto"
        >
          <option value="all">{t("admin.orders.filter.allStatuses", "All Statuses")}</option>
          {Object.keys(statusConfig).map((status) => (
            <option key={status} value={status}>
              {t(statusConfig[status].label, status)}
            </option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="w-full rounded-xl  card-elevated70 px-4 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30 sm:w-auto"
        >
          <option value="all">{t("admin.orders.filter.allPayments", "All Payments")}</option>
          <option value="paid">{t("admin.orders.filter.paid", "Paid")}</option>
          <option value="unpaid">{t("admin.orders.filter.unpaid", "Unpaid")}</option>
        </select>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-xl  card-elevated70 px-4 py-2 text-sm font-semibold transition hover:card-elevated90 disabled:opacity-50 sm:w-auto"
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{t("button.reload", "Refresh")}</span>
        </button>
        <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60">
          <span>{t("admin.orders.filters.showing", "Showing")}:</span>
          <span className="font-semibold text-primary">
            {filtered.length} / {stats.total}
          </span>
          <span>•</span>
          <span>
            {stats.fulfillmentRate}% {t("admin.orders.stats.fulfillment", "fulfilled")}
          </span>
        </div>
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-[400px] rounded-3xl  surface-elevated p-6">
          <div className="text-center">
            <Loader2 className="inline-block h-8 w-8 animate-spin text-secondary mb-4" />
            <p className="text-sm text-foreground/70">
              {t("admin.orders.loading", "Loading orders...")}
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-sm text-red-500 mb-4">
            {t("admin.orders.error", "Unable to load orders.")}
          </p>
          <button
            onClick={() => refetch()}
            className="rounded-full border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-500/10 transition"
          >
            {t("button.retry", "Retry")}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/70 card-elevated80 p-12 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-foreground/30 mb-4" />
          <p className="text-sm text-foreground/70">
            {t("admin.orders.empty", "No orders found matching your filters.")}
          </p>
        </div>
      )}

      {/* Orders Table - Desktop */}
      {!isLoading && !isError && filtered.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="hidden lg:block overflow-x-auto rounded-3xl  surface-elevated shadow-lg"
        >
          <table className="w-full text-left text-sm">
            <thead className="card-elevated50">
              <tr className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                <th className="px-6 py-4">{t("admin.orders.table.order", "Order")}</th>
                <th className="px-6 py-4">{t("admin.orders.table.customer", "Customer")}</th>
                <th className="px-6 py-4">{t("admin.orders.table.items", "Items")}</th>
                <th className="px-6 py-4">{t("admin.orders.table.total", "Total")}</th>
                <th className="px-6 py-4">{t("admin.orders.table.status", "Status")}</th>
                <th className="px-6 py-4">{t("admin.orders.table.payment", "Payment")}</th>
                <th className="px-6 py-4">{t("admin.orders.table.date", "Date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              <AnimatePresence>
                {filtered.map((order, index) => {
                  const pendingReq = pendingByOrderId.get(order._id);
                  return (
                    <motion.tr
                      key={order._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:card-elevated30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-primary">
                          #{order._id.slice(-6).toUpperCase()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="text-left"
                        >
                          <p className="font-semibold text-primary">
                            {getCustomerLabel(order)}
                          </p>
                          <p className="text-xs text-foreground/50">
                            {getCustomerSub(order)}
                          </p>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-foreground/80">
                          {order.items.map((item) => item.product?.name).filter(Boolean).join(", ") ||
                            t("admin.orders.multipleItems", "Multiple items")}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-primary">
                          {order.totalAmount.toLocaleString("en-US", {
                            style: "currency",
                            currency: "ETB",
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(order._id, e.target.value, order.isPaid)
                          }
                          disabled={isUpdating}
                          className="rounded-xl  card-elevated60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] hover:bg-background transition cursor-pointer disabled:opacity-50"
                        >
                          {Object.keys(statusConfig).map((status) => (
                            <option key={status} value={status}>
                              {t(statusConfig[status].label, status)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                              order.isPaid
                                ? "bg-green-500/10 text-green-600"
                                : pendingReq
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "bg-amber-500/10 text-amber-600"
                            }`}
                          >
                            {order.isPaid ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                {t("admin.orders.paid", "Paid")}
                              </>
                            ) : pendingReq ? (
                              <>
                                <Clock className="w-3 h-3" />
                                {t("admin.orders.pendingReview", "Pending review")}
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                {t("admin.orders.unverified", "Unverified")}
                              </>
                            )}
                          </span>
                          {order.receiptUrl && (
                            <a
                              href={order.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-secondary transition hover:text-primary"
                            >
                              <FileText className="h-3 w-3" />
                              {t("admin.orders.viewReceipt", "View receipt")}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {pendingReq && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleReject(order._id)}
                                disabled={isReviewingPayment}
                                className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-500/20 disabled:opacity-60"
                              >
                                <X className="h-3 w-3" />
                                {t("admin.payments.reject", "Reject")}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApprove(order._id)}
                                disabled={isReviewingPayment}
                                className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground transition hover:brightness-95 disabled:opacity-60"
                              >
                                <Check className="h-3 w-3" />
                                {t("admin.payments.approve", "Approve")}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-foreground/60">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Orders Cards - Mobile */}
      {!isLoading && !isError && filtered.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:hidden space-y-4"
        >
          <AnimatePresence>
            {filtered.map((order, index) => {
              const statusInfo = statusConfig[order.status] || statusConfig.Pending;
              const StatusIcon = statusInfo.icon;
              const pendingReq = pendingByOrderId.get(order._id);
              return (
                <motion.div
                  key={order._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-2xl  surface-elevated p-4 shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-primary">
                        #{order._id.slice(-6).toUpperCase()}
                      </p>
                      <p className="text-xs text-foreground/60 mt-1">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${statusInfo.bg} ${statusInfo.color}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {t(statusInfo.label, order.status)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-secondary/70 mb-1">
                        {t("admin.orders.table.items", "Items")}
                      </p>
                      <p className="text-sm text-foreground/80">
                        {order.items.map((item) => item.product?.name).filter(Boolean).join(", ") ||
                          t("admin.orders.multipleItems", "Multiple items")}
                      </p>
                      <p className="text-xs text-foreground/50 mt-1">
                        {order.items.length}{" "}
                        {order.items.length === 1
                          ? t("store.item", "item")
                          : t("store.items", "items")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-secondary/70 mb-1">
                        {t("admin.orders.table.total", "Total")}
                      </p>
                      <p className="text-lg font-bold text-primary">
                        {order.totalAmount.toLocaleString("en-US", {
                          style: "currency",
                          currency: "ETB",
                        })}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-secondary/70 mb-1">
                          {t("admin.orders.table.status", "Status")}
                        </p>
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(order._id, e.target.value, order.isPaid)
                          }
                          disabled={isUpdating}
                          className="w-full rounded-xl  card-elevated60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] hover:bg-background transition cursor-pointer disabled:opacity-50"
                        >
                          {Object.keys(statusConfig).map((status) => (
                            <option key={status} value={status}>
                              {t(statusConfig[status].label, status)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-secondary/70 mb-1">
                          {t("admin.orders.table.payment", "Payment")}
                        </p>
                        <div className="space-y-2">
                          <span
                            className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                              order.isPaid
                                ? "bg-green-500/10 text-green-600"
                                : pendingReq
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "bg-amber-500/10 text-amber-600"
                            }`}
                          >
                            {order.isPaid ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                {t("admin.orders.paid", "Paid")}
                              </>
                            ) : pendingReq ? (
                              <>
                                <Clock className="w-3 h-3" />
                                {t("admin.orders.pendingReview", "Pending review")}
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                {t("admin.orders.unverified", "Unverified")}
                              </>
                            )}
                          </span>
                          {order.receiptUrl && (
                            <a
                              href={order.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-secondary transition hover:text-primary"
                            >
                              <FileText className="h-3 w-3" />
                              {t("admin.orders.viewReceipt", "View receipt")}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {pendingReq && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleReject(order._id)}
                                disabled={isReviewingPayment}
                                className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-2 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-500/20 disabled:opacity-60"
                              >
                                <X className="h-3 w-3" />
                                {t("admin.payments.reject", "Reject")}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApprove(order._id)}
                                disabled={isReviewingPayment}
                                className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-primary px-2.5 py-2 text-[11px] font-semibold text-primary-foreground transition hover:brightness-95 disabled:opacity-60"
                              >
                                <Check className="h-3 w-3" />
                                {t("admin.payments.approve", "Approve")}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 backdrop-blur">
          <div className="relative w-full max-w-2xl rounded-3xl border border-border bg-surface/95 p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-foreground/70 transition hover:bg-secondary/10"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-serif text-primary">
              {t("admin.orders.customerDetails", "Customer details")}
            </h3>
            <p className="mt-1 text-sm text-foreground/70">
              {t("admin.orders.customerDetailsDesc", "Delivery/pickup and contact information.")}
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  <User className="mr-2 inline h-3 w-3" />
                  {t("admin.orders.customer", "Customer")}
                </p>
                <p className="mt-2 font-semibold text-primary">
                  {getCustomerLabel(selectedOrder)}
                </p>
                {getCustomerSub(selectedOrder) && (
                  <p className="mt-1 text-sm text-foreground/70">
                    {getCustomerSub(selectedOrder)}
                  </p>
                )}
                {selectedOrder?.user && typeof selectedOrder.user === "object" && selectedOrder.user.phone && (
                  <p className="mt-1 text-sm text-foreground/70">
                    {t("admin.orders.phone", "Phone")}: {selectedOrder.user.phone}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  <MapPin className="mr-2 inline h-3 w-3" />
                  {t("admin.orders.delivery", "Delivery")}
                </p>
                <p className="mt-2 font-semibold text-primary">
                  {selectedOrder.deliveryOption === "Pickup"
                    ? t("admin.orders.pickup", "Pickup")
                    : t("admin.orders.delivery", "Delivery")}
                </p>
                {selectedOrder.deliveryOption === "Pickup" && selectedOrder.pickupBranchId && typeof selectedOrder.pickupBranchId === "object" ? (
                  <div className="mt-2 text-sm text-foreground/70">
                    <p className="font-semibold text-foreground/80">{selectedOrder.pickupBranchId.name}</p>
                    {(selectedOrder.pickupBranchId.address || selectedOrder.pickupBranchId.city) && (
                      <p>
                        {[selectedOrder.pickupBranchId.address, selectedOrder.pickupBranchId.city, selectedOrder.pickupBranchId.region]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                ) : selectedOrder.shippingAddress ? (
                  <div className="mt-2 text-sm text-foreground/70">
                    <p>
                      {selectedOrder.shippingAddress.street}, {selectedOrder.shippingAddress.city}{" "}
                      {selectedOrder.shippingAddress.postalCode}
                    </p>
                    <p>
                      {t("admin.orders.contactPhone", "Phone")}: {selectedOrder.shippingAddress.phone}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-foreground/60">
                    {t("admin.orders.noAddress", "No address provided.")}
                  </p>
                )}
              </div>
            </div>

            {selectedOrder.receiptUrl && (
              <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                  {t("admin.orders.receipt", "Receipt")}
                </p>
                <a
                  href={selectedOrder.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold transition hover:border-secondary"
                >
                  <FileText className="h-4 w-4" />
                  {t("admin.orders.viewReceipt", "View receipt")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("admin.orders.reviewNote", "Review note (optional)")}
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                placeholder={t("admin.orders.reviewNotePlaceholder", "Add a note (e.g. reference mismatch).")}
              />

              {pendingByOrderId.get(selectedOrder._id) && (
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleReject(selectedOrder._id)}
                    disabled={isReviewingPayment}
                    className="flex-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    {t("admin.payments.reject", "Reject")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedOrder._id)}
                    disabled={isReviewingPayment}
                    className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
                  >
                    {t("admin.payments.approve", "Approve")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
