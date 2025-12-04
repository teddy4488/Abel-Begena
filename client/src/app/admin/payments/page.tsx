"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useGetAllEnrollmentsQuery } from "@/store/api/adminApi";
import { useGetAllOrdersQuery } from "@/store/api/storeApi";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  ShoppingBag,
} from "lucide-react";

type AdminPaymentStatus = "completed" | "pending" | "processing" | "failed";
type AdminPaymentType = "enrollment" | "order";

type AdminPaymentRecord = {
  id: string;
  type: AdminPaymentType;
  title: string;
  studentOrCustomer: string;
  amount: number;
  currency: string;
  method: string;
  reference?: string | null;
  status: AdminPaymentStatus;
  date: string | null;
};

export default function AdminPaymentsPage() {
  const { t } = useI18n();
  const { data: enrollments = [], isLoading: enrollmentsLoading } =
    useGetAllEnrollmentsQuery();
  const { data: orders = [], isLoading: ordersLoading } = useGetAllOrdersQuery();

  const [filterType, setFilterType] = useState<AdminPaymentType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<AdminPaymentStatus | "all">(
    "all",
  );
  const [search, setSearch] = useState("");

  const isLoading = enrollmentsLoading || ordersLoading;

  const enrollmentRecords: AdminPaymentRecord[] = useMemo(
    () =>
      enrollments
        .filter((e) => typeof e.amountPaid === "number" && e.amountPaid! > 0)
        .map((e) => {
          const fullName = [
            e.student.firstName,
            e.student.lastName,
          ]
            .filter(Boolean)
            .join(" ");
          const studentLabel = fullName || e.student.email;
          const status: AdminPaymentStatus =
            e.status === "active"
              ? "completed"
              : e.status === "pending"
              ? "pending"
              : "failed";
          return {
            id: `${e.classId}-${e.student.id}`,
            type: "enrollment" as const,
            title: e.classTitle,
            studentOrCustomer: studentLabel,
            amount: e.amountPaid ?? 0,
            currency: e.currency ?? "ETB",
            method: e.paymentMethod ?? "Manual",
            reference: e.paymentReference,
            status,
            date: e.enrolledAt ?? null,
          };
        }),
    [enrollments],
  );

  const orderRecords: AdminPaymentRecord[] = useMemo(
    () =>
      orders.map((order) => {
        const itemsLabel =
          order.items.length === 1
            ? t("store.item", "item")
            : t("store.items", "items");
        const status: AdminPaymentStatus = order.isPaid
          ? order.status === "Delivered"
            ? "completed"
            : order.status === "Cancelled"
            ? "failed"
            : "processing"
          : "pending";
        return {
          id: order._id,
          type: "order" as const,
          title: `${order.items.length} ${itemsLabel}`,
          studentOrCustomer: t("admin.payments.unknownCustomer", "Store customer"),
          amount: order.totalAmount,
          currency: "ETB",
          method: order.paymentMethod,
          reference: order._id,
          status,
          date: order.createdAt ?? null,
        };
      }),
    [orders, t],
  );

  const allRecords: AdminPaymentRecord[] = useMemo(
    () =>
      [...enrollmentRecords, ...orderRecords].sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      }),
    [enrollmentRecords, orderRecords],
  );

  const normalizedSearch = search.trim().toLowerCase();
  const filteredRecords = allRecords.filter((record) => {
    if (filterType !== "all" && record.type !== filterType) return false;
    if (filterStatus !== "all" && record.status !== filterStatus) return false;
    if (normalizedSearch) {
      const haystack = `${record.title} ${record.studentOrCustomer} ${
        record.method
      } ${record.reference ?? ""}`
        .toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }
    return true;
  });

  const totalCompleted = filteredRecords
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + r.amount, 0);

  const totalPending = filteredRecords
    .filter((r) => r.status === "pending" || r.status === "processing")
    .reduce((sum, r) => sum + r.amount, 0);

  const typeBreakdown = filteredRecords.reduce(
    (acc, record) => {
      acc[record.type] += 1;
      return acc;
    },
    { enrollment: 0, order: 0 },
  );

  const formatAmount = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "ETB",
        minimumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toLocaleString()} ${currency || "ETB"}`;
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return t("payments.date.unknown", "Unknown");
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return t("payments.date.unknown", "Unknown");
    }
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: AdminPaymentStatus) => {
    const base =
      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold";
    switch (status) {
      case "completed":
        return (
          <span className={`${base} bg-emerald-500/10 text-emerald-600`}>
            <CheckCircle2 className="h-3 w-3" />
            {t("payments.status.completed", "Completed")}
          </span>
        );
      case "pending":
        return (
          <span className={`${base} bg-amber-500/10 text-amber-600`}>
            <Clock className="h-3 w-3" />
            {t("payments.status.pending", "Pending")}
          </span>
        );
      case "processing":
        return (
          <span className={`${base} bg-sky-500/10 text-sky-600`}>
            <Clock className="h-3 w-3" />
            {t("payments.status.processing", "Processing")}
          </span>
        );
      case "failed":
      default:
        return (
          <span className={`${base} bg-rose-500/10 text-rose-600`}>
            <AlertCircle className="h-3 w-3" />
            {t("payments.status.failed", "Failed")}
          </span>
        );
    }
  };

  const handleExportCsv = () => {
    if (!filteredRecords.length) return;
    const header = [
      "id",
      "type",
      "title",
      "person",
      "amount",
      "currency",
      "method",
      "reference",
      "status",
      "date",
    ];
    const escapeCsv = (value: string | number | null | undefined) => {
      if (value === null || value === undefined) return '""';
      return `"${String(value).replace(/"/g, '""')}"`;
    };
    const rows = filteredRecords.map((r) =>
      [
        escapeCsv(r.id),
        escapeCsv(r.type),
        escapeCsv(r.title),
        escapeCsv(r.studentOrCustomer),
        escapeCsv(r.amount.toString()),
        escapeCsv(r.currency),
        escapeCsv(r.method),
        escapeCsv(r.reference ?? ""),
        escapeCsv(r.status),
        escapeCsv(r.date ? formatDate(r.date) : ""),
      ].join(","),
    );
    const csvContent = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `abel-begena-admin-payments-${new Date().toISOString()}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="min-h-screen bg-background px-4 py-8 text-foreground transition-colors sm:px-6 md:px-10 md:py-16 lg:px-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:gap-6">
        <header className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/95 p-4 shadow-lg sm:rounded-[32px] sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-secondary">
              {t("admin.payments.kicker", "Treasury overview")}
            </p>
            <h1 className="text-3xl font-serif text-primary">
              {t("admin.payments.title", "Payments & settlements")}
            </h1>
            <p className="text-sm text-foreground/70">
              {t(
                "admin.payments.subtitle",
                "Review tuition receipts and store orders in one ledger, then coordinate manual verifications.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!filteredRecords.length}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition hover:bg-(--color-secondary-soft) disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {t("admin.payments.exportCsv", "Export CSV")}
          </button>
        </header>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="rounded-3xl border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-secondary/70">
              {t("admin.payments.summary.totalCollected", "Total collected")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-primary">
              {formatAmount(totalCompleted, "ETB")}
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-secondary/70">
              {t("admin.payments.summary.pending", "Pending / processing")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-primary">
              {formatAmount(totalPending, "ETB")}
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-secondary/70">
              {t("admin.payments.summary.counts", "Entries by type")}
            </p>
            <p className="mt-2 text-sm text-foreground/75">
              {t("payments.filters.enrollments", "Enrollments")}:{" "}
              <span className="font-semibold">{typeBreakdown.enrollment}</span>
            </p>
            <p className="text-sm text-foreground/75">
              {t("payments.filters.orders", "Orders")}:{" "}
              <span className="font-semibold">{typeBreakdown.order}</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface/90 p-4 shadow-lg sm:rounded-[32px] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center rounded-full border border-border bg-background px-3 py-2 sm:px-4">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t(
                    "admin.payments.searchPlaceholder",
                    "Search by student, class, reference, or method",
                  )}
                  className="flex-1 bg-transparent text-xs outline-none sm:text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:ml-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground/70">
                  <Filter className="h-4 w-4" />
                  <select
                    value={filterType}
                    onChange={(e) =>
                      setFilterType(
                        e.target.value as AdminPaymentType | "all",
                      )
                    }
                    className="bg-transparent text-xs font-semibold uppercase tracking-widest outline-none"
                  >
                    <option value="all">
                      {t("payments.filters.all", "All")}
                    </option>
                    <option value="enrollment">
                      {t("payments.filters.enrollments", "Enrollments")}
                    </option>
                    <option value="order">
                      {t("payments.filters.orders", "Orders")}
                    </option>
                  </select>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground/70">
                  <Filter className="h-4 w-4" />
                  <select
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(
                        e.target.value as AdminPaymentStatus | "all",
                      )
                    }
                    className="bg-transparent text-xs font-semibold uppercase tracking-widest outline-none"
                  >
                    <option value="all">
                      {t(
                        "payments.filters.allStatuses",
                        "All Statuses",
                      )}
                    </option>
                    <option value="completed">
                      {t("payments.status.completed", "Completed")}
                    </option>
                    <option value="pending">
                      {t("payments.status.pending", "Pending")}
                    </option>
                    <option value="processing">
                      {t("payments.status.processing", "Processing")}
                    </option>
                    <option value="failed">
                      {t("payments.status.failed", "Failed")}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            {isLoading ? (
              <p className="py-6 text-sm text-foreground/70">
                {t("payments.loading", "Loading payments...")}
              </p>
            ) : !filteredRecords.length ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-6 text-center text-sm text-foreground/70">
                {t(
                  "admin.payments.empty",
                  "No payments match your filters. Adjust the filters or try again later.",
                )}
              </div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                    <th className="px-4 py-3">
                      {t("admin.payments.table.type", "Type")}
                    </th>
                    <th className="px-4 py-3">
                      {t("admin.payments.table.person", "Student / customer")}
                    </th>
                    <th className="px-4 py-3">
                      {t("admin.payments.table.title", "Class / order")}
                    </th>
                    <th className="px-4 py-3">
                      {t("admin.payments.table.amount", "Amount")}
                    </th>
                    <th className="px-4 py-3">
                      {t("admin.payments.table.method", "Method")}
                    </th>
                    <th className="px-4 py-3">
                      {t("admin.payments.table.reference", "Reference")}
                    </th>
                    <th className="px-4 py-3">
                      {t("admin.payments.table.status", "Status")}
                    </th>
                    <th className="px-4 py-3">
                      {t("admin.payments.table.date", "Date")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                          {record.type === "enrollment" ? (
                            <BookOpen className="h-3 w-3" />
                          ) : (
                            <ShoppingBag className="h-3 w-3" />
                          )}
                          {record.type === "enrollment"
                            ? t(
                                "payments.filters.enrollments",
                                "Enrollments",
                              )
                            : t("payments.filters.orders", "Orders")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-primary">
                          {record.studentOrCustomer}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground/80">
                          {record.title}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-primary">
                          {formatAmount(record.amount, record.currency)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground/70">
                        {record.method}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground/70">
                        {record.reference ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground/70">
                        {formatDate(record.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}


