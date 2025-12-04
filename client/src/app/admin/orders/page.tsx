"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetAllOrdersQuery,
  useUpdateOrderStatusMutation,
} from "@/store/api/storeApi";
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
  const { pushToast } = useToast();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return (orders ?? []).filter((order) => {
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

  const handlePaymentToggle = async (
    orderId: string,
    status: string,
    currentPaid: boolean,
  ) => {
    try {
      await updateStatus({
        id: orderId,
        status,
        isPaid: !currentPaid,
      }).unwrap();
      pushToast({
        title: t(
          "admin.orders.paymentUpdated",
          currentPaid ? "Payment marked as unpaid" : "Payment verified",
        ),
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

  const stats = useMemo(() => {
    const total = orders?.length ?? 0;
    const paid = orders?.filter((o) => o.isPaid).length ?? 0;
    const pending = orders?.filter((o) => o.status === "Pending").length ?? 0;
    const delivered = orders?.filter((o) => o.status === "Delivered").length ?? 0;
    return { total, paid, pending, delivered };
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
          className="rounded-2xl border border-border bg-surface p-4 shadow-lg sm:rounded-3xl"
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
          className="rounded-2xl border border-border bg-surface p-4 shadow-lg sm:rounded-3xl"
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
          className="rounded-2xl border border-border bg-surface p-4 shadow-lg sm:rounded-3xl"
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
          className="rounded-2xl border border-border bg-surface p-4 shadow-lg sm:rounded-3xl"
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
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.orders.searchPlaceholder", "Search by order ID or product...")}
              className="w-full rounded-xl border border-border bg-background/70 pl-10 pr-4 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full rounded-xl border border-border bg-background/70 px-4 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30 sm:w-auto"
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
          className="w-full rounded-xl border border-border bg-background/70 px-4 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30 sm:w-auto"
        >
          <option value="all">{t("admin.orders.filter.allPayments", "All Payments")}</option>
          <option value="paid">{t("admin.orders.filter.paid", "Paid")}</option>
          <option value="unpaid">{t("admin.orders.filter.unpaid", "Unpaid")}</option>
        </select>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2 text-sm font-semibold transition hover:bg-background/90 disabled:opacity-50 sm:w-auto"
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{t("button.reload", "Refresh")}</span>
        </button>
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-[400px] rounded-3xl border border-border bg-surface p-6">
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
        <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-12 text-center">
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
          className="hidden lg:block overflow-x-auto rounded-3xl border border-border bg-surface shadow-lg"
        >
          <table className="w-full text-left text-sm">
            <thead className="bg-background/50">
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
                  return (
                    <motion.tr
                      key={order._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-background/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-primary">
                          #{order._id.slice(-6).toUpperCase()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-foreground/70">
                          {order.items[0]?.product?.name ?? t("admin.orders.custom", "Custom")}
                        </p>
                        <p className="text-xs text-foreground/50">
                          {order.items.length}{" "}
                          {order.items.length === 1
                            ? t("store.item", "item")
                            : t("store.items", "items")}
                        </p>
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
                            currency: "USD",
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
                          className="rounded-xl border border-border bg-background/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] hover:bg-background transition cursor-pointer disabled:opacity-50"
                        >
                          {Object.keys(statusConfig).map((status) => (
                            <option key={status} value={status}>
                              {t(statusConfig[status].label, status)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            handlePaymentToggle(order._id, order.status, order.isPaid)
                          }
                          disabled={isUpdating}
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                            order.isPaid
                              ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                              : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                          }`}
                        >
                          {order.isPaid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              {t("admin.orders.paid", "Paid")}
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              {t("admin.orders.unverified", "Unverified")}
                            </>
                          )}
                        </button>
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
              return (
                <motion.div
                  key={order._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-2xl border border-border bg-surface p-4 shadow-lg"
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
                          currency: "USD",
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
                          className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] hover:bg-background transition cursor-pointer disabled:opacity-50"
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
                        <button
                          type="button"
                          onClick={() =>
                            handlePaymentToggle(order._id, order.status, order.isPaid)
                          }
                          disabled={isUpdating}
                          className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                            order.isPaid
                              ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                              : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                          }`}
                        >
                          {order.isPaid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              {t("admin.orders.paid", "Paid")}
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              {t("admin.orders.unverified", "Unverified")}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}
