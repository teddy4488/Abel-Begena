"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useGetAllEnrollmentsQuery } from "@/store/api/adminApi";
import { useGetAllOrdersQuery } from "@/store/api/storeApi";
import {
  useGetPendingPaymentRequestsQuery,
  useUpdatePaymentStatusMutation,
  type PaymentRequest,
} from "@/store/api/paymentApi";
import { useToast } from "@/components/providers/ToastProvider";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  ShoppingBag,
  X,
  Check,
  FileText,
  ExternalLink,
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
  const { pushToast } = useToast();
  const { data: enrollments = [], isLoading: enrollmentsLoading } =
    useGetAllEnrollmentsQuery();
  const { data: orders = [], isLoading: ordersLoading } = useGetAllOrdersQuery();
  const { data: pendingRequests = [], isLoading: pendingRequestsLoading } =
    useGetPendingPaymentRequestsQuery();
  const [updatePaymentStatus, { isLoading: isUpdating }] =
    useUpdatePaymentStatusMutation();
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const [filterType, setFilterType] = useState<AdminPaymentType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<AdminPaymentStatus | "all">(
    "all",
  );
  const [search, setSearch] = useState("");

  const isLoading = enrollmentsLoading || ordersLoading || pendingRequestsLoading;

  const handleApprovePayment = async (request: PaymentRequest) => {
    try {
      await updatePaymentStatus({
        id: request._id,
        body: { status: "approved", reason: reviewNote || undefined },
      }).unwrap();
      pushToast({
        title: t("admin.payments.review.approved", "Payment approved"),
        description: t(
          "admin.payments.review.approvedDesc",
          "The payment has been approved and enrollment activated.",
        ),
        variant: "success",
      });
      setSelectedRequest(null);
      setReviewNote("");
    } catch (error) {
      pushToast({
        title: t("admin.payments.review.error", "Error"),
        description: t(
          "admin.payments.review.errorDesc",
          "Failed to update payment status.",
        ),
        variant: "error",
      });
    }
  };

  const parseConversionData = (request: PaymentRequest | null) => {
    if (!request?.conversionData) return null;
    try {
      return JSON.parse(request.conversionData as unknown as string) as Record<string, any>;
    } catch {
      return null;
    }
  };

  const handleRejectPayment = async (request: PaymentRequest) => {
    if (!reviewNote.trim()) {
      pushToast({
        title: t("admin.payments.review.reasonRequired", "Reason required"),
        description: t(
          "admin.payments.review.reasonRequiredDesc",
          "Please provide a reason for rejection.",
        ),
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
        title: t("admin.payments.review.rejected", "Payment rejected"),
        description: t(
          "admin.payments.review.rejectedDesc",
          "The payment has been rejected.",
        ),
        variant: "success",
      });
      setSelectedRequest(null);
      setReviewNote("");
    } catch (error) {
      pushToast({
        title: t("admin.payments.review.error", "Error"),
        description: t(
          "admin.payments.review.errorDesc",
          "Failed to update payment status.",
        ),
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
        <header className="flex flex-col gap-3 rounded-2xl  surface-elevated/95 p-4 shadow-lg sm:rounded-[32px] sm:p-6 lg:flex-row lg:items-center lg:justify-between">
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
            className="inline-flex items-center gap-2 rounded-full  px-4 py-2 text-xs font-semibold uppercase tracking-widest transition hover:bg-(--color-secondary-soft) disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {t("admin.payments.exportCsv", "Export CSV")}
          </button>
        </header>

        {/* Pending Payment Requests Section */}
        {pendingRequests.length > 0 && (
          <div className="rounded-2xl surface-elevated/90 p-4 shadow-lg sm:rounded-[32px] sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-serif text-primary">
                  {t("admin.payments.pendingRequests.title", "Pending Payment Reviews")}
                </h2>
                <p className="mt-1 text-sm text-foreground/70">
                  {t(
                    "admin.payments.pendingRequests.subtitle",
                    "Review and approve payment requests with uploaded receipts.",
                  )}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">
                <Clock className="h-3 w-3" />
                {pendingRequests.length}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {pendingRequests.map((request) => (
                <div
                  key={request._id}
                  className="rounded-2xl border border-border bg-surface/50 p-4 transition hover:border-secondary/50"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wide text-secondary/70">
                        {request.type === "enrollment"
                          ? t("payments.filters.enrollments", "Enrollment")
                          : request.type === "order"
                          ? t("payments.filters.orders", "Order")
                          : request.type === "student_monthly_fee"
                          ? t("payments.type.studentMonthlyFee", "Student Monthly Fee")
                          : t("payments.type.tuition", "Tuition")}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequest(request);
                          setReviewNote("");
                        }}
                        className="mt-1 font-semibold text-primary hover:underline text-left"
                      >
                        {getUserDisplayName(request.userId)}
                      </button>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-600">
                      <Clock className="h-3 w-3" />
                      {t("payments.status.pending", "Pending")}
                    </span>
                  </div>
                  <div className="mb-3 space-y-1 text-sm">
                    <p className="text-foreground/80">
                      <span className="font-semibold">
                        {formatAmount(request.amount, request.currency)}
                      </span>
                    </p>
                    {request.reference && (
                      <p className="text-xs text-foreground/60">
                        {t("admin.payments.reference", "Reference")}: {request.reference}
                      </p>
                    )}
                    {request.method && (
                      <p className="text-xs text-foreground/60">
                        {t("admin.payments.method", "Method")}: {request.method}
                      </p>
                    )}
                  </div>
                  {request.receiptUrl && (
                    <a
                      href={request.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-3 inline-flex items-center gap-1 text-xs text-secondary transition hover:text-primary"
                    >
                      <FileText className="h-3 w-3" />
                      {t("admin.payments.viewReceipt", "View Receipt")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequest(request);
                        setReviewNote("");
                      }}
                      className="flex-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:brightness-95"
                    >
                      {t("admin.payments.review", "Review")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="rounded-3xl  surface-elevated p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-secondary/70">
              {t("admin.payments.summary.totalCollected", "Total collected")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-primary">
              {formatAmount(totalCompleted, "ETB")}
            </p>
          </div>
          <div className="rounded-3xl  surface-elevated p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-secondary/70">
              {t("admin.payments.summary.pending", "Pending / processing")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-primary">
              {formatAmount(totalPending, "ETB")}
            </p>
          </div>
          <div className="rounded-3xl  surface-elevated p-4">
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

        <div className="rounded-2xl  surface-elevated/90 p-4 shadow-lg sm:rounded-[32px] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center rounded-full  bg-background px-3 py-2 sm:px-4">
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
                <div className="inline-flex items-center gap-2 rounded-full  bg-background px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground/70">
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
                <div className="inline-flex items-center gap-2 rounded-full  bg-background px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground/70">
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
              <div className="rounded-2xl border border-dashed border-border/70 card-elevated60 p-6 text-center text-sm text-foreground/70">
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
                        <span className="inline-flex items-center gap-1 rounded-full /70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">
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

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 backdrop-blur">
          <div className="relative flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-border bg-surface/95 shadow-2xl">
            {(() => {
              const details = parseConversionData(selectedRequest);
              const isEnrollment = selectedRequest.type === "enrollment";
              const isMonthly = selectedRequest.type === "student_monthly_fee";
              const hasStudentProfile =
                details &&
                (details.fullName ||
                  details.phone ||
                  details.emergencyContactName ||
                  details.city ||
                  details.address);
              return (
                <>
                  {/* header will render below as-is */}
                  {/* extra blocks are rendered later using details */}
                  <span className="hidden">{String(isEnrollment && isMonthly && hasStudentProfile)}</span>
                </>
              );
            })()}
            {/* Header (fixed) */}
            <div className="flex items-start justify-between border-b border-border p-6">
              <div>
                <h3 className="text-xl font-serif text-primary">
                  {t("admin.payments.review.title", "Review Payment Request")}
                </h3>
                <p className="mt-1 text-sm text-foreground/70">
                  {t(
                    "admin.payments.review.subtitle",
                    "Review the payment details and receipt before approving or rejecting.",
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRequest(null);
                  setReviewNote("");
                }}
                className="rounded-full p-2 text-foreground/70 transition hover:bg-secondary/10"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body (scrollable) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <div className="mb-4 space-y-3 rounded-2xl border border-border bg-background/50 p-4">
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-secondary/70">
                      {t("admin.payments.review.user", "User")}
                    </p>
                    <p className="mt-1 font-semibold text-primary">
                      {getUserDisplayName(selectedRequest.userId)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-secondary/70">
                      {t("admin.payments.review.type", "Type")}
                    </p>
                    <p className="mt-1 font-semibold text-primary">
                      {selectedRequest.type === "enrollment"
                        ? t("payments.filters.enrollments", "Enrollment")
                        : selectedRequest.type === "order"
                        ? t("payments.filters.orders", "Order")
                        : selectedRequest.type === "student_monthly_fee"
                        ? t("payments.type.studentMonthlyFee", "Student Monthly Fee")
                        : t("payments.type.tuition", "Tuition")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-secondary/70">
                      {t("admin.payments.review.amount", "Amount")}
                    </p>
                    <p className="mt-1 font-semibold text-primary">
                      {formatAmount(selectedRequest.amount, selectedRequest.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-secondary/70">
                      {t("admin.payments.review.method", "Payment Method")}
                    </p>
                    <p className="mt-1 text-foreground/80">{selectedRequest.method}</p>
                  </div>
                  {selectedRequest.reference && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-secondary/70">
                        {t("admin.payments.review.reference", "Reference")}
                      </p>
                      <p className="mt-1 text-foreground/80">{selectedRequest.reference}</p>
                    </div>
                  )}
                  {selectedRequest.createdAt && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-secondary/70">
                        {t("admin.payments.review.submitted", "Submitted")}
                      </p>
                      <p className="mt-1 text-foreground/80">
                        {formatDate(selectedRequest.createdAt)}
                      </p>
                    </div>
                  )}
                </div>
                {selectedRequest.receiptUrl && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs uppercase tracking-wide text-secondary/70">
                      {t("admin.payments.review.receipt", "Payment Receipt")}
                    </p>
                    <a
                      href={selectedRequest.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold transition hover:border-secondary"
                    >
                      <FileText className="h-4 w-4" />
                      {t("admin.payments.viewReceipt", "View Receipt")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

            {/* Enrollment / payment form details from conversionData */}
            {(() => {
              const details = parseConversionData(selectedRequest);
              if (!details) return null;
              const isEnrollment = selectedRequest.type === "enrollment";
              const isMonthly = selectedRequest.type === "student_monthly_fee";

              return (
                <div className="mb-4 space-y-3 rounded-2xl border border-border bg-background/40 p-4">
                  {isEnrollment && (
                    <>
                      <p className="text-xs uppercase tracking-wide text-secondary/70">
                        {t(
                          "admin.payments.review.enrollmentDetails",
                          "Enrollment details from student form",
                        )}
                      </p>
                      <div className="grid gap-2 text-sm md:grid-cols-2">
                        {details.fullName && (
                          <div>
                            <p className="text-xs text-foreground/60">
                              {t("classes.modal.fullName", "Full name")}
                            </p>
                            <p className="font-semibold text-primary">{details.fullName}</p>
                          </div>
                        )}
                        {details.phone && (
                          <div>
                            <p className="text-xs text-foreground/60">
                              {t("classes.modal.phone", "Phone number")}
                            </p>
                            <p className="text-foreground/80">{details.phone}</p>
                          </div>
                        )}
                        {details.emergencyContactName && (
                          <div>
                            <p className="text-xs text-foreground/60">
                              {t(
                                "classes.modal.emergencyContactName",
                                "Emergency contact name",
                              )}
                            </p>
                            <p className="text-foreground/80">
                              {details.emergencyContactName}
                            </p>
                          </div>
                        )}
                        {details.emergencyContactPhone && (
                          <div>
                            <p className="text-xs text-foreground/60">
                              {t(
                                "classes.modal.emergencyContactPhone",
                                "Emergency contact phone",
                              )}
                            </p>
                            <p className="text-foreground/80">
                              {details.emergencyContactPhone}
                            </p>
                          </div>
                        )}
                        {details.city && (
                          <div>
                            <p className="text-xs text-foreground/60">
                              {t("classes.modal.city", "City")}
                            </p>
                            <p className="text-foreground/80">{details.city}</p>
                          </div>
                        )}
                        {details.address && (
                          <div>
                            <p className="text-xs text-foreground/60">
                              {t("classes.modal.address", "Address / location")}
                            </p>
                            <p className="text-foreground/80">{details.address}</p>
                          </div>
                        )}
                        {details.preferredLearningDays && Array.isArray(details.preferredLearningDays) && (
                          <div className="md:col-span-2">
                            <p className="text-xs text-foreground/60">
                              {t(
                                "attendance.students.preferredDays",
                                "Preferred learning days",
                              )}
                            </p>
                            <p className="text-foreground/80">
                              {details.preferredLearningDays.join(", ")}
                            </p>
                          </div>
                        )}
                        {details.preferredTime && (
                          <div>
                            <p className="text-xs text-foreground/60">
                              {t("classes.modal.preferredTime", "Preferred time of learning")}
                            </p>
                            <p className="text-foreground/80">{details.preferredTime}</p>
                          </div>
                        )}
                        {details.preferredSchedule && (
                          <div className="md:col-span-2">
                            <p className="text-xs text-foreground/60">
                              {t("becomeStudent.timePreferences", "Time preferences")}
                            </p>
                            <p className="text-foreground/80">{details.preferredSchedule}</p>
                          </div>
                        )}
                        {details.learningGoals && (
                          <div className="md:col-span-2">
                            <p className="text-xs text-foreground/60">
                              {t(
                                "classes.modal.learningGoals",
                                "What are your learning goals?",
                              )}
                            </p>
                            <p className="text-foreground/80">{details.learningGoals}</p>
                          </div>
                        )}
                        {details.notesForTeacher && (
                          <div className="md:col-span-2">
                            <p className="text-xs text-foreground/60">
                              {t(
                                "teacher.students.notesForTeacher",
                                "Notes for teacher",
                              )}
                            </p>
                            <p className="text-foreground/80">{details.notesForTeacher}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {isMonthly && (
                    <>
                      <p className="text-xs uppercase tracking-wide text-secondary/70">
                        {t(
                          "admin.payments.review.tuitionDetails",
                          "Monthly tuition period",
                        )}
                      </p>
                      <div className="grid gap-2 text-sm md:grid-cols-2">
                        {details.month && (
                          <div>
                            <p className="text-xs text-foreground/60">
                              {t("monthlyPayments.period", "Period")}
                            </p>
                            <p className="text-foreground/80">
                              {details.month}/{details.year}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            <div className="mb-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">
                {t("admin.payments.review.note", "Review Note (Optional)")}
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                placeholder={t(
                  "admin.payments.review.notePlaceholder",
                  "Add any notes about this review...",
                )}
                className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            </div>
            </div>

            {/* Footer actions (fixed) */}
            <div className="border-t border-border bg-surface/80 p-6">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleRejectPayment(selectedRequest)}
                  disabled={isUpdating}
                  className="flex-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/20 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <Clock className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="mr-2 inline h-4 w-4" />
                      {t("admin.payments.reject", "Reject")}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleApprovePayment(selectedRequest)}
                  disabled={isUpdating}
                  className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <Clock className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="mr-2 inline h-4 w-4" />
                      {t("admin.payments.approve", "Approve")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


